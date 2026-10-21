'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('../src/dominio/horarios');

const ZONA = '-06:00';
const medico = { horaInicio: '08:00', horaFin: '10:00', duracionMin: 30 };

test('offsetMinutos interpreta offsets positivos y negativos', () => {
  assert.equal(h.offsetMinutos('-06:00'), -360);
  assert.equal(h.offsetMinutos('+05:30'), 330);
  assert.throws(() => h.offsetMinutos('GMT-6'), RangeError);
});

test('esFechaValida rechaza fechas inexistentes', () => {
  assert.equal(h.esFechaValida('2026-10-20'), true);
  assert.equal(h.esFechaValida('2026-02-30'), false);
  assert.equal(h.esFechaValida('20/10/2026'), false);
});

test('generarHorarios respeta la jornada y la duración', () => {
  assert.deepEqual(h.generarHorarios('2026-10-20', medico, ZONA), [
    '2026-10-20T08:00:00-06:00',
    '2026-10-20T08:30:00-06:00',
    '2026-10-20T09:00:00-06:00',
    '2026-10-20T09:30:00-06:00',
  ]);
});

test('esHorarioDeAgenda acepta el mismo instante expresado en UTC', () => {
  assert.equal(h.esHorarioDeAgenda(Date.parse('2026-10-20T14:30:00Z'), medico, ZONA), true);
  assert.equal(h.esHorarioDeAgenda(Date.parse('2026-10-20T08:15:00-06:00'), medico, ZONA), false);
  assert.equal(h.esHorarioDeAgenda(Date.parse('2026-10-20T10:00:00-06:00'), medico, ZONA), false);
});

test('aIsoLocal convierte a la zona de la clínica', () => {
  assert.equal(h.aIsoLocal(Date.parse('2026-10-20T16:00:00Z'), ZONA), '2026-10-20T10:00:00-06:00');
});
