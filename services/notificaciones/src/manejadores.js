'use strict';

const { TIPOS_EVENTO, claveRuteo, validarDatosCita, ErrorNoReintentable } = require('@citas/shared');
const plantillas = require('./plantillas');

/**
 * Un manejador por clave de ruteo. Orden: verificar duplicado -> enviar -> registrar.
 * Si el proceso cae entre enviar y registrar, el reintento puede duplicar un correo:
 * es el límite inherente de at-least-once con un sistema externo (Hito 1 §4.4).
 */
function crearManejadores({ correo, procesados, remitente, log }) {
  const enviarCon = (plantilla) => async (evento, ctx) => {
    const errores = validarDatosCita(evento.data);
    if (errores.length) throw new ErrorNoReintentable(`data inválida: ${errores.join(', ')}`);

    if (procesados.tiene(evento.eventId)) {
      log.info('evento duplicado ignorado', ctx);
      return;
    }

    const mensaje = plantilla(evento.data);
    await correo.sendMail({
      from: remitente,
      to: evento.data.paciente.email,
      subject: mensaje.asunto,
      text: mensaje.texto,
      html: mensaje.html,
      headers: { 'X-Correlation-Id': evento.correlationId },
    });
    procesados.registrar(evento.eventId);
    log.info('correo enviado', { ...ctx, citaId: evento.data.citaId });
  };

  return {
    [claveRuteo(TIPOS_EVENTO.CITA_AGENDADA)]: enviarCon(plantillas.confirmacion),
    [claveRuteo(TIPOS_EVENTO.RECORDATORIO_VENCIDO)]: enviarCon(plantillas.recordatorio),
  };
}

module.exports = { crearManejadores };
