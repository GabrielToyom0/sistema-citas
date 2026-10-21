'use strict';

const { crearLogger, conectarBroker, crearPublicador } = require('@citas/shared');
const config = require('./config');
const { conectarDb } = require('./db');
const { crearApp } = require('./app');
const { crearMedicosRepo } = require('./repositorios/medicosRepo');
const { crearCitasRepo } = require('./repositorios/citasRepo');
const { crearRelayOutbox } = require('./outbox/relay');

const log = crearLogger('api-citas');

async function main() {
  const pool = await conectarDb(config.db, log);

  // La API no depende del broker para registrar citas: el publicador se crea bajo demanda
  // y, si la conexión se pierde, se descarta para reconectar en el siguiente ciclo del relay.
  let conexion = null;
  let publicador = null;
  async function obtenerPublicador() {
    if (publicador) return publicador;
    conexion = await conectarBroker(config.amqpUrl, log, {
      reintentos: 1,
      alCerrar: () => {
        log.warn('conexión AMQP cerrada; el relay reconectará');
        conexion = null;
        publicador = null;
      },
    });
    publicador = await crearPublicador(conexion);
    log.info('publicador AMQP listo');
    return publicador;
  }

  const relay = crearRelayOutbox({ pool, obtenerPublicador, log, ...config.outbox });
  relay.iniciar();

  const app = crearApp({
    repos: { medicos: crearMedicosRepo(pool), citas: crearCitasRepo(pool) },
    log,
    zona: config.zonaHoraria,
  });
  const servidor = app.listen(config.puerto, () => log.info('API escuchando', { puerto: config.puerto }));

  const apagar = async (senal) => {
    log.info('apagando', { senal });
    relay.detener();
    servidor.close();
    await conexion?.close().catch(() => {});
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
