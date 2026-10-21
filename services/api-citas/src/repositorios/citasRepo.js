'use strict';

const { sql, esViolacionUnica } = require('../db');

class HorarioOcupadoError extends Error {
  constructor() {
    super('El horario ya fue reservado');
    this.name = 'HorarioOcupadoError';
  }
}

const formatoId = (prefijo, n) => `${prefijo}-${String(n).padStart(6, '0')}`;

const INSERTAR_CITA = `
  DECLARE @pacienteId INT;
  SELECT @pacienteId = id FROM dbo.pacientes WITH (UPDLOCK, HOLDLOCK) WHERE email = @email;
  IF @pacienteId IS NULL
  BEGIN
    INSERT INTO dbo.pacientes (nombre, email) VALUES (@nombre, @email);
    SET @pacienteId = CAST(SCOPE_IDENTITY() AS INT);
  END
  ELSE
    UPDATE dbo.pacientes SET nombre = @nombre WHERE id = @pacienteId;

  INSERT INTO dbo.citas (medico_id, paciente_id, fecha_hora) VALUES (@medicoId, @pacienteId, @fechaHora);
  SELECT @pacienteId AS pacienteId, CAST(SCOPE_IDENTITY() AS INT) AS citaId;`;

function crearCitasRepo(pool) {
  return {
    /**
     * Registra la cita y su evento en la tabla outbox dentro de UNA transacción
     * (patrón Transactional Outbox, Hito 1 §4.3). La restricción UQ_citas_medico_fecha
     * impide la doble reserva (RF-01).
     * @param {(ids: {citaId: string, pacienteId: string}) => object} construirEvento
     */
    async crearConEvento({ medico, paciente, fechaHora }, construirEvento) {
      const tx = new sql.Transaction(pool);
      await tx.begin(sql.ISOLATION_LEVEL.READ_COMMITTED);
      try {
        const { recordset } = await new sql.Request(tx)
          .input('email', sql.NVarChar(254), paciente.email)
          .input('nombre', sql.NVarChar(100), paciente.nombre)
          .input('medicoId', sql.VarChar(10), medico.id)
          .input('fechaHora', sql.DateTimeOffset(0), new Date(fechaHora))
          .query(INSERTAR_CITA);

        const citaId = formatoId('CITA', recordset[0].citaId);
        const evento = construirEvento({ citaId, pacienteId: formatoId('PAC', recordset[0].pacienteId) });

        await new sql.Request(tx)
          .input('eventId', sql.UniqueIdentifier, evento.eventId)
          .input('payload', sql.NVarChar(sql.MAX), JSON.stringify(evento))
          .query('INSERT INTO dbo.outbox (event_id, payload) VALUES (@eventId, @payload)');

        await tx.commit();
        return { citaId, evento };
      } catch (err) {
        await tx.rollback().catch(() => {});
        if (esViolacionUnica(err, 'UQ_citas_medico_fecha')) throw new HorarioOcupadoError();
        throw err;
      }
    },
  };
}

module.exports = { crearCitasRepo, HorarioOcupadoError };
