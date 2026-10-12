'use strict';

const { randomUUID } = require('node:crypto');

/** Contrato de eventos (Hito 1, sección 3.2). Cambios incompatibles => nueva versión. */
const TIPOS_EVENTO = Object.freeze({
  CITA_AGENDADA: 'cita.agendada',
  RECORDATORIO_VENCIDO: 'recordatorio.vencido',
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CORRELATION_ID = /^[A-Za-z0-9-]{8,64}$/;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,189}\.[^\s@]{2,}$/;

const claveRuteo = (tipo, version = 1) => `${tipo}.v${version}`;

function crearEvento(tipo, data, { correlationId, version = 1 } = {}) {
  return {
    eventId: randomUUID(),
    eventType: tipo,
    version,
    occurredAt: new Date().toISOString(),
    correlationId: correlationId || randomUUID(),
    data,
  };
}

/** Valida el sobre común a todos los eventos. Devuelve la lista de errores (vacía = válido). */
function validarSobre(evento) {
  if (!evento || typeof evento !== 'object') return ['el evento debe ser un objeto'];
  const errores = [];
  if (typeof evento.eventId !== 'string' || !UUID.test(evento.eventId)) errores.push('eventId inválido');
  if (!Object.values(TIPOS_EVENTO).includes(evento.eventType)) errores.push('eventType desconocido');
  if (!Number.isInteger(evento.version) || evento.version < 1) errores.push('version inválida');
  if (Number.isNaN(Date.parse(evento.occurredAt))) errores.push('occurredAt inválido');
  if (typeof evento.correlationId !== 'string' || !CORRELATION_ID.test(evento.correlationId)) errores.push('correlationId inválido');
  if (!evento.data || typeof evento.data !== 'object') errores.push('data requerido');
  return errores;
}

/** Valida `data` de CitaAgendada y RecordatorioVencido (comparten forma). */
function validarDatosCita(data) {
  const errores = [];
  if (!data || typeof data !== 'object') return ['data requerido'];
  if (!/^CITA-\d{6,}$/.test(data.citaId ?? '')) errores.push('citaId inválido');
  if (!/^MED-\d{2,4}$/.test(data.medico?.id ?? '')) errores.push('medico.id inválido');
  if (typeof data.medico?.nombre !== 'string' || !data.medico.nombre) errores.push('medico.nombre requerido');
  if (typeof data.paciente?.nombre !== 'string' || !data.paciente.nombre) errores.push('paciente.nombre requerido');
  if (!EMAIL.test(data.paciente?.email ?? '')) errores.push('paciente.email inválido');
  if (Number.isNaN(Date.parse(data.fechaHora))) errores.push('fechaHora inválida');
  return errores;
}

module.exports = { TIPOS_EVENTO, claveRuteo, crearEvento, validarSobre, validarDatosCita };
