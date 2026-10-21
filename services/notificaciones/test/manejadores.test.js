'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { TIPOS_EVENTO, crearEvento, ErrorNoReintentable } = require('@citas/shared');
const { crearManejadores } = require('../src/manejadores');
const { crearAlmacenProcesados } = require('../src/procesados');
const plantillas = require('../src/plantillas');

const logSilencioso = { info() {}, warn() {}, error() {} };
const datos = () => ({
  citaId: 'CITA-000123',
  medico: { id: 'MED-01', nombre: 'Dra. Ana López', especialidad: 'Medicina General' },
  paciente: { id: 'PAC-000451', nombre: 'Juan <Pérez>', email: 'juan@example.com' },
  fechaHora: '2026-10-20T10:00:00-06:00',
});

function preparar() {
  const archivo = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'notif-')), 'procesados.log');
  const enviados = [];
  const correo = { sendMail: async (m) => { enviados.push(m); } };
  const procesados = crearAlmacenProcesados(archivo);
  const manejadores = crearManejadores({ correo, procesados, remitente: 'test@clinica.local', log: logSilencioso });
  return { archivo, enviados, manejadores };
}

test('envía la confirmación una sola vez aunque el evento llegue duplicado (RNF-01)', async () => {
  const { enviados, manejadores } = preparar();
  const evento = crearEvento(TIPOS_EVENTO.CITA_AGENDADA, datos());
  await manejadores['cita.agendada.v1'](evento, {});
  await manejadores['cita.agendada.v1'](evento, {});
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].to, 'juan@example.com');
  assert.match(enviados[0].subject, /Cita confirmada/);
});

test('la idempotencia sobrevive a un reinicio (archivo persistente)', async () => {
  const { archivo, manejadores } = preparar();
  const evento = crearEvento(TIPOS_EVENTO.RECORDATORIO_VENCIDO, datos());
  await manejadores['recordatorio.vencido.v1'](evento, {});
  assert.equal(crearAlmacenProcesados(archivo).tiene(evento.eventId), true);
});

test('datos inválidos => ErrorNoReintentable (va directo a la DLQ)', async () => {
  const { manejadores } = preparar();
  const evento = crearEvento(TIPOS_EVENTO.CITA_AGENDADA, { citaId: 'x' });
  await assert.rejects(manejadores['cita.agendada.v1'](evento, {}), ErrorNoReintentable);
});

test('la plantilla escapa HTML e incluye los datos requeridos por RF-03', () => {
  const m = plantillas.confirmacion(datos());
  assert.match(m.texto, /CITA-000123/);
  assert.match(m.texto, /Dra\. Ana López/);
  assert.ok(m.html.includes('Juan &lt;Pérez&gt;'));
});
