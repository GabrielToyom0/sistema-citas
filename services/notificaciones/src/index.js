'use strict';

const nodemailer = require('nodemailer');
const { crearLogger, conectarBroker, iniciarConsumidor, COLAS } = require('@citas/shared');
const config = require('./config');
const { crearAlmacenProcesados } = require('./procesados');
const { crearManejadores } = require('./manejadores');

const log = crearLogger('notificaciones');

async function main() {
  const procesados = crearAlmacenProcesados(config.archivoProcesados);
  const correo = nodemailer.createTransport(config.smtp);

  let apagando = false;
  const conexion = await conectarBroker(config.amqpUrl, log, {
    alCerrar: () => {
      if (apagando) return;
      log.error('conexión AMQP cerrada; reiniciando proceso');
      process.exit(1);
    },
  });

  await iniciarConsumidor(
    conexion,
    COLAS.notificaciones,
    crearManejadores({ correo, procesados, remitente: config.remitente, log }),
    log,
    { prefetch: config.prefetch },
  );
  log.info('consumiendo', { cola: COLAS.notificaciones.nombre, procesadosPrevios: procesados.total });

  const apagar = async (senal) => {
    apagando = true;
    log.info('apagando', { senal });
    await conexion.close().catch(() => {});
    process.exit(0);
  };
  process.on('SIGTERM', apagar);
  process.on('SIGINT', apagar);
}

main().catch((err) => {
  log.error('fallo al iniciar', { err: err.message });
  process.exit(1);
});
