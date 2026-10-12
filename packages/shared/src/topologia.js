'use strict';

const { TIPOS_EVENTO, claveRuteo } = require('./eventos');

/** Topología del broker (Hito 1, sección 3.1). Declararla es idempotente. */
const EXCHANGE = 'citas.events';
const DLX = 'citas.dlx';
const LIMITE_ENTREGAS = 3;

const COLAS = Object.freeze({
  notificaciones: {
    nombre: 'notificaciones.q',
    dlq: 'notificaciones.dlq',
    enlaces: [claveRuteo(TIPOS_EVENTO.CITA_AGENDADA), claveRuteo(TIPOS_EVENTO.RECORDATORIO_VENCIDO)],
  },
  recordatorios: {
    nombre: 'recordatorios.q',
    dlq: 'recordatorios.dlq',
    enlaces: [claveRuteo(TIPOS_EVENTO.CITA_AGENDADA)],
  },
});

/**
 * Todos los servicios declaran la topología completa al arrancar: así las colas
 * existen aunque los consumidores nunca hayan iniciado y ningún evento se pierde (RF-02).
 */
async function asegurarTopologia(canal) {
  await canal.assertExchange(EXCHANGE, 'topic', { durable: true });
  await canal.assertExchange(DLX, 'direct', { durable: true });
  for (const cola of Object.values(COLAS)) {
    await canal.assertQueue(cola.dlq, { durable: true, arguments: { 'x-queue-type': 'quorum' } });
    await canal.bindQueue(cola.dlq, DLX, cola.dlq);
    await canal.assertQueue(cola.nombre, {
      durable: true,
      arguments: {
        'x-queue-type': 'quorum',
        'x-delivery-limit': LIMITE_ENTREGAS,
        'x-dead-letter-exchange': DLX,
        'x-dead-letter-routing-key': cola.dlq,
      },
    });
    for (const clave of cola.enlaces) await canal.bindQueue(cola.nombre, EXCHANGE, clave);
  }
}

module.exports = { EXCHANGE, DLX, LIMITE_ENTREGAS, COLAS, asegurarTopologia };
