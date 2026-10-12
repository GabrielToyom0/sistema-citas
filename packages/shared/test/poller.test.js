'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { crearPoller } = require('../src/poller');

const logSilencioso = { info() {}, warn() {}, error() {} };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

test('el poller ejecuta la tarea periódicamente y se detiene', async () => {
  let ejecuciones = 0;
  const poller = crearPoller({ nombre: 't', intervaloMs: 5, tarea: async () => { ejecuciones++; }, log: logSilencioso });
  poller.iniciar();
  await esperar(60);
  poller.detener();
  const alDetener = ejecuciones;
  await esperar(30);
  assert.ok(alDetener >= 3, `se esperaban >= 3 ejecuciones, hubo ${alDetener}`);
  assert.equal(ejecuciones, alDetener);
});

test('el poller cuenta fallos y los reinicia tras un éxito', async () => {
  let llamada = 0;
  const poller = crearPoller({
    nombre: 't',
    intervaloMs: 1,
    tarea: async () => { llamada++; if (llamada <= 2) throw new Error('falla'); },
    log: logSilencioso,
  });
  poller.iniciar();
  await esperar(40);
  poller.detener();
  assert.ok(llamada >= 3);
  assert.equal(poller.fallos, 0);
});
