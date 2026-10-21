'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validarCrearCita } = require('../src/dominio/validacion');

const valido = () => ({
  medicoId: 'MED-01',
  fechaHora: '2026-10-20T10:00:00-06:00',
  paciente: { nombre: '  Juan Pérez ', email: 'Juan.Perez@Example.com' },
});

test('normaliza nombre y correo de una solicitud válida', () => {
  const r = validarCrearCita(valido());
  assert.equal(r.ok, true);
  assert.deepEqual(r.valor.paciente, { nombre: 'Juan Pérez', email: 'juan.perez@example.com' });
});

test('exige zona horaria en fechaHora', () => {
  const r = validarCrearCita({ ...valido(), fechaHora: '2026-10-20T10:00:00' });
  assert.equal(r.ok, false);
  assert.deepEqual(r.errores.map((e) => e.campo), ['fechaHora']);
});

test('reporta todos los campos inválidos a la vez', () => {
  const r = validarCrearCita({ medicoId: '1', paciente: { nombre: 'J', email: 'x' } });
  assert.deepEqual(r.errores.map((e) => e.campo), ['medicoId', 'fechaHora', 'paciente.nombre', 'paciente.email']);
});

test('tolera cuerpos vacíos o no objeto', () => {
  assert.equal(validarCrearCita(undefined).ok, false);
  assert.equal(validarCrearCita('texto').ok, false);
});
