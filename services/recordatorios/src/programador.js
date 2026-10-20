'use strict';

const { crearPoller } = require('@citas/shared');

/**
 * Revisa periódicamente los recordatorios vencidos y publica RecordatorioVencido,
 * que el Servicio de Notificaciones convierte en correo (coreografía, Hito 1 §4.5).
 */
function crearProgramador({ repositorio, publicador, log, intervaloMs, lote }) {
  const publicar = async (evento) => {
    // Se conserva el eventId generado al programar; solo se actualiza el momento real.
    await publicador.publicar({ ...evento, occurredAt: new Date().toISOString() });
    log.info('recordatorio publicado', { eventId: evento.eventId, correlationId: evento.correlationId, citaId: evento.data.citaId });
  };
  return crearPoller({
    nombre: 'programador-recordatorios',
    intervaloMs,
    tarea: () => repositorio.procesarVencidos(lote, publicar),
    log,
  });
}

module.exports = { crearProgramador };
