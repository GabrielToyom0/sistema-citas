'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { TIPOS_EVENTO, crearEvento, ErrorNoReintentable } = require('@citas/shared');
const { calcularEnvio } = require('../src/calculo');
const { crearManejadores } = require('../src/manejadores');

const MIN = 60_000;
const ahora = Date.parse('2026-10-19T10:00:00-06:00');
const logSilencioso = { info() {}, warn() {}, error() {} };

test('calcularEnvio: 24 h antes de la cita', () => {
  const cita = ahora + 48 * 60 * MIN;
  assert.equal(calcularEnvio(cita, ahora, { anticipacionMin: 1440 }), cita - 1440 * MIN);
});

test('calcularEnvio: si faltan menos de 24 h, se envía de inmediato', () => {
  assert.equal(calcularEnvio(ahora + 60 * MIN, ahora, { anticipacionMin: 1440 }), ahora);
});

test('calcularEnvio: modo demo dispara N segundos después de agendar', () => {
  assert.equal(calcularEnvio(ahora + 48 * 60 * MIN, ahora, { anticipacionMin: 1440, retrasoDemoSeg: 60 }), ahora + MIN);
});

test('calcularEnvio: cita en el pasado => null', () => {
  assert.equal(calcularEnvio(ahora - MIN, ahora, { anticipacionMin: 1440 }), null);
});

test('el manejador programa un RecordatorioVencido con el mismo correlationId', async () => {
  const llamadas = [];
  const repositorio = { programar: async (...args) => { llamadas.push(args); return true; } };
  const manejadores = crearManejadores({ repositorio, opciones: { anticipacionMin: 1440 }, log: logSilencioso, ahora: () => ahora });
  const origen = crearEvento(TIPOS_EVENTO.CITA_AGENDADA, {
    citaId: 'CITA-000001',
    medico: { id: 'MED-01', nombre: 'Dra. Ana López' },
    paciente: { id: 'PAC-000001', nombre: 'Juan Pérez', email: 'juan@example.com' },
    fechaHora: '2026-10-21T10:00:00-06:00',
  });

  await manejadores['cita.agendada.v1'](origen, {});

  const [evento, recordatorio, enviarEn] = llamadas[0];
  assert.equal(evento.eventId, origen.eventId);
  assert.equal(recordatorio.eventType, 'recordatorio.vencido');
  assert.equal(recordatorio.correlationId, origen.correlationId);
  assert.equal(enviarEn, Date.parse('2026-10-20T10:00:00-06:00'));
});

test('datos inválidos => ErrorNoReintentable', async () => {
  const manejadores = crearManejadores({ repositorio: {}, opciones: { anticipacionMin: 1440 }, log: logSilencioso });
  await assert.rejects(manejadores['cita.agendada.v1'](crearEvento(TIPOS_EVENTO.CITA_AGENDADA, {}), {}), ErrorNoReintentable);
});
