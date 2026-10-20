'use strict';

const { sql } = require('./db');

// Idempotencia (RNF-01): el eventId de origen se registra en la misma transacción
// que el recordatorio; si ya existe, el evento es un duplicado y no se hace nada.
const PROGRAMAR = `
  IF EXISTS (SELECT 1 FROM dbo.eventos_procesados WITH (UPDLOCK, HOLDLOCK) WHERE event_id = @eventIdOrigen)
    SELECT CAST(0 AS BIT) AS nuevo;
  ELSE
  BEGIN
    INSERT INTO dbo.eventos_procesados (event_id) VALUES (@eventIdOrigen);
    IF @enviarEn IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.recordatorios WHERE cita_id = @citaId)
      INSERT INTO dbo.recordatorios (cita_id, event_id, enviar_en, evento)
      VALUES (@citaId, @eventId, @enviarEn, @evento);
    SELECT CAST(1 AS BIT) AS nuevo;
  END`;

const SELECCIONAR_VENCIDOS = `
  SELECT TOP (@lote) id, evento
  FROM dbo.recordatorios WITH (UPDLOCK, READPAST, ROWLOCK)
  WHERE estado = 'PENDIENTE' AND enviar_en <= SYSDATETIMEOFFSET()
  ORDER BY enviar_en`;

function crearRepositorio(pool) {
  return {
    /**
     * @param {object} eventoOrigen CitaAgendada recibido
     * @param {object|null} eventoRecordatorio RecordatorioVencido ya construido (eventId estable
     *   para que un republish no genere un correo duplicado), o null si no aplica
     * @param {number|null} enviarEnMs
     * @returns {Promise<boolean>} false si el evento de origen era un duplicado
     */
    async programar(eventoOrigen, eventoRecordatorio, enviarEnMs) {
      const tx = new sql.Transaction(pool);
      await tx.begin();
      try {
        const { recordset } = await new sql.Request(tx)
          .input('eventIdOrigen', sql.UniqueIdentifier, eventoOrigen.eventId)
          .input('citaId', sql.VarChar(20), eventoOrigen.data.citaId)
          .input('eventId', sql.UniqueIdentifier, eventoRecordatorio?.eventId ?? null)
          .input('enviarEn', sql.DateTimeOffset(0), enviarEnMs === null ? null : new Date(enviarEnMs))
          .input('evento', sql.NVarChar(sql.MAX), eventoRecordatorio ? JSON.stringify(eventoRecordatorio) : null)
          .query(PROGRAMAR);
        await tx.commit();
        return recordset[0].nuevo;
      } catch (err) {
        await tx.rollback().catch(() => {});
        throw err;
      }
    },

    /** Publica los recordatorios vencidos con `publicar` y los marca en la misma transacción. */
    async procesarVencidos(lote, publicar) {
      const tx = new sql.Transaction(pool);
      await tx.begin();
      try {
        const { recordset } = await new sql.Request(tx).input('lote', sql.Int, lote).query(SELECCIONAR_VENCIDOS);
        for (const fila of recordset) {
          await publicar(JSON.parse(fila.evento));
          await new sql.Request(tx)
            .input('id', sql.BigInt, fila.id)
            .query(`UPDATE dbo.recordatorios SET estado = 'PUBLICADO', publicado_en = SYSUTCDATETIME() WHERE id = @id`);
        }
        await tx.commit();
        return recordset.length;
      } catch (err) {
        await tx.rollback().catch(() => {});
        throw err;
      }
    },
  };
}

module.exports = { crearRepositorio };
