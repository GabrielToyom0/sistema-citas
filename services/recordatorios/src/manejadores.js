'use strict';

const { TIPOS_EVENTO, claveRuteo, crearEvento, validarDatosCita, ErrorNoReintentable } = require('@citas/shared');
const { calcularEnvio } = require('./calculo');

function crearManejadores({ repositorio, opciones, log, ahora = Date.now }) {
  return {
    async [claveRuteo(TIPOS_EVENTO.CITA_AGENDADA)](evento, ctx) {
      const errores = validarDatosCita(evento.data);
      if (errores.length) throw new ErrorNoReintentable(`data inválida: ${errores.join(', ')}`);

      const enviarEn = calcularEnvio(Date.parse(evento.data.fechaHora), ahora(), opciones);
      const recordatorio = enviarEn === null
        ? null
        : crearEvento(TIPOS_EVENTO.RECORDATORIO_VENCIDO, evento.data, { correlationId: evento.correlationId });

      const nuevo = await repositorio.programar(evento, recordatorio, enviarEn);
      if (!nuevo) log.info('evento duplicado ignorado', ctx);
      else if (enviarEn === null) log.warn('cita en el pasado; no se programa recordatorio', ctx);
      else log.info('recordatorio programado', { ...ctx, citaId: evento.data.citaId, enviarEn: new Date(enviarEn).toISOString() });
    },
  };
}

module.exports = { crearManejadores };
