'use strict';

const { crearLogger, conectarBroker, crearPublicador, iniciarConsumidor, COLAS } = require('@citas/shared');
const config = require('./config');
const { conectarDb } = require('./db');
const { crearRepositorio } = require('./repositorio');
const { crearManejadores } = require('./manejadores');
const { crearProgramador } = require('./programador');

const log = crearLogger('recordatorios');

async function main() {
  const pool = await conectarDb(config.db, log);
  const repositorio = crearRepositorio(pool);

  let apagando = false;
  const conexion = await conectarBroker(config.amqpUrl, log, {
    alCerrar: () => {
      if (apagando) return;
      log.error('conexión AMQP cerrada; reiniciando proceso');
      process.exit(1);
    },
  });
  const publicador = await crearPublicador(conexion);

  await iniciarConsumidor(conexion, COLAS.recordatorios, crearManejadores({ repositorio, opciones: config.recordatorio, log }), log);
  log.info('consumiendo', { cola: COLAS.recordatorios.nombre, ...config.recordatorio });

  const programador = crearProgramador({ repositorio, publicador, log, ...config.programador });
  programador.iniciar();

  const apagar = async (senal) => {
    apagando = true;
    log.info('apagando', { senal });
    programador.detener();
    await conexion.close().catch(() => {});
    await pool.close().catch(() => {});
    process.exit(0);
  };
  process.on('SIGTERM', apagar);
  process.on('SIGINT', apagar);
}

main().catch((err) => {
  log.error('fallo al iniciar', { err: err.message });
  process.exit(1);
});
