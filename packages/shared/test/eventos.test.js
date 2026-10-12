'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { TIPOS_EVENTO, claveRuteo, crearEvento, validarSobre, validarDatosCita } = require('../src/eventos');

const datosCita = () => ({
  citaId: 'CITA-000123',
  medico: { id: 'MED-01', nombre: 'Dra. Ana López', especialidad: 'Medicina General' },
  paciente: { id: 'PAC-000451', nombre: 'Juan Pérez', email: 'juan.perez@example.com' },
  fechaHora: '2026-10-20T10:00:00-06:00',
});

test('claveRuteo incluye la versión del contrato', () => {
  assert.equal(claveRuteo(TIPOS_EVENTO.CITA_AGENDADA), 'cita.agendada.v1');
  assert.equal(claveRuteo(TIPOS_EVENTO.RECORDATORIO_VENCIDO, 2), 'recordatorio.vencido.v2');
});

test('crearEvento genera un sobre válido y conserva el correlationId', () => {
  const evento = crearEvento(TIPOS_EVENTO.CITA_AGENDADA, datosCita(), { correlationId: 'abc12345-corr' });
  assert.deepEqual(validarSobre(evento), []);
  assert.equal(evento.correlationId, 'abc12345-corr');
  assert.equal(evento.version, 1);
});

test('crearEvento genera eventId distintos (clave de idempotencia)', () => {
  const a = crearEvento(TIPOS_EVENTO.CITA_AGENDADA, datosCita());
  const b = crearEvento(TIPOS_EVENTO.CITA_AGENDADA, datosCita());
  assert.notEqual(a.eventId, b.eventId);
});

test('validarSobre rechaza sobres incompletos o desconocidos', () => {
  assert.deepEqual(validarSobre(null), ['el evento debe ser un objeto']);
  const errores = validarSobre({ eventId: '123', eventType: 'otro', version: 0, occurredAt: 'x', data: null });
  assert.equal(errores.length, 6);
});

test('validarDatosCita acepta datos válidos y detecta campos faltantes', () => {
  assert.deepEqual(validarDatosCita(datosCita()), []);
  const malo = { ...datosCita(), paciente: { nombre: '', email: 'no-es-correo' } };
  assert.deepEqual(validarDatosCita(malo), ['paciente.nombre requerido', 'paciente.email inválido']);
});
