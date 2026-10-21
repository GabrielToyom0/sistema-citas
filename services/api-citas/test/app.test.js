'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { crearApp } = require('../src/app');
const { HorarioOcupadoError } = require('../src/repositorios/citasRepo');
const { aIsoLocal } = require('../src/dominio/horarios');

const ZONA = '-06:00';
const MEDICO = { id: 'MED-01', nombre: 'Dra. Ana López', especialidad: 'Medicina General', horaInicio: '07:00', horaFin: '21:00', duracionMin: 15 };
const logSilencioso = { info() {}, warn() {}, error() {} };
const manana = aIsoLocal(Date.now() + 24 * 3600 * 1000, ZONA).slice(0, 10);

/** Repositorios en memoria: simulan la restricción UNIQUE(medico_id, fecha_hora). */
function reposFalsos() {
  const reservas = new Set();
  const eventos = [];
  return {
    eventos,
    medicos: {
      listar: async () => [MEDICO],
      obtener: async (id) => (id === MEDICO.id ? MEDICO : null),
      horariosOcupados: async () => new Set([...reservas].map((k) => Date.parse(k.split('|')[1]))),
    },
    citas: {
      async crearConEvento({ medico, fechaHora }, construirEvento) {
        const clave = `${medico.id}|${fechaHora}`;
        if (reservas.has(clave)) throw new HorarioOcupadoError();
        reservas.add(clave);
        const citaId = `CITA-${String(reservas.size).padStart(6, '0')}`;
        const evento = construirEvento({ citaId, pacienteId: 'PAC-000001' });
        eventos.push(evento);
        return { citaId, evento };
      },
    },
  };
}

async function conServidor(repos, fn) {
  const servidor = crearApp({ repos, log: logSilencioso, zona: ZONA }).listen(0);
  await new Promise((r) => servidor.once('listening', r));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  try {
    await fn(base);
  } finally {
    servidor.close();
  }
}

const post = (base, cuerpo) => fetch(`${base}/api/citas`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(cuerpo),
});

const solicitud = (hora = '10:00') => ({
  medicoId: 'MED-01',
  fechaHora: `${manana}T${hora}:00${ZONA}`,
  paciente: { nombre: 'Juan Pérez', email: 'juan@example.com' },
});

test('POST /api/citas: 201 y genera un evento CitaAgendada con el correlationId de la solicitud', async () => {
  const repos = reposFalsos();
  await conServidor(repos, async (base) => {
    const r = await post(base, solicitud());
    assert.equal(r.status, 201);
    const cuerpo = await r.json();
    assert.equal(cuerpo.estado, 'CONFIRMADA');
    assert.equal(repos.eventos.length, 1);
    assert.equal(repos.eventos[0].eventType, 'cita.agendada');
    assert.equal(repos.eventos[0].correlationId, r.headers.get('x-correlation-id'));
  });
});

test('POST /api/citas: el mismo horario dos veces => 201 y 409 (RF-01)', async () => {
  await conServidor(reposFalsos(), async (base) => {
    const [a, b] = await Promise.all([post(base, solicitud()), post(base, solicitud())]);
    assert.deepEqual([a.status, b.status].sort(), [201, 409]);
  });
});

test('POST /api/citas: 400 con datos inválidos u horario fuera de agenda', async () => {
  await conServidor(reposFalsos(), async (base) => {
    assert.equal((await post(base, { medicoId: 'x' })).status, 400);
    assert.equal((await post(base, solicitud('10:07'))).status, 400);
    assert.equal((await post(base, solicitud('22:00'))).status, 400);
  });
});

test('GET horarios excluye los ya reservados', async () => {
  await conServidor(reposFalsos(), async (base) => {
    await post(base, solicitud('10:00'));
    const r = await fetch(`${base}/api/medicos/MED-01/horarios?fecha=${manana}`);
    const { disponibles } = await r.json();
    assert.ok(disponibles.length > 0);
    assert.ok(!disponibles.includes(`${manana}T10:00:00${ZONA}`));
  });
});
