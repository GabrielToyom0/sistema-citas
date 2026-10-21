'use strict';

const { crearPoller } = require('@citas/shared');
const { sql } = require('../db');

// UPDLOCK + READPAST: varias instancias del relay no toman la misma fila (Hito 1 §4.3).
const SELECCIONAR_PENDIENTES = `
  SELECT TOP (@lote) id, payload
  FROM dbo.outbox WITH (UPDLOCK, READPAST, ROWLOCK)
  WHERE publicado_en IS NULL
  ORDER BY id`;

/**
 * Publica en RabbitMQ los eventos pendientes de la tabla outbox.
 * Si el broker no está disponible, la tarea falla y el poller reintenta con backoff;
 * las citas ya confirmadas no se ven afectadas (CU-01, flujo 6a).
 */
function crearRelayOutbox({ pool, obtenerPublicador, log, intervaloMs, lote }) {
  async function publicarPendientes() {
    const publicador = await obtenerPublicador();
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      const { recordset } = await new sql.Request(tx).input('lote', sql.Int, lote).query(SELECCIONAR_PENDIENTES);
      for (const fila of recordset) {
        const evento = JSON.parse(fila.payload);
        await publicador.publicar(evento);
        await new sql.Request(tx)
          .input('id', sql.BigInt, fila.id)
          .query('UPDATE dbo.outbox SET publicado_en = SYSUTCDATETIME() WHERE id = @id');
        log.info('evento publicado', { eventId: evento.eventId, eventType: evento.eventType, correlationId: evento.correlationId });
      }
      await tx.commit();
    } catch (err) {
      // Si se publicó parte del lote se republicará: los consumidores son idempotentes.
      await tx.rollback().catch(() => {});
      throw err;
    }
  }

  return crearPoller({ nombre: 'relay-outbox', intervaloMs, tarea: publicarPendientes, log });
}

module.exports = { crearRelayOutbox };
