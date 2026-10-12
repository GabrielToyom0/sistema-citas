'use strict';

const amqp = require('amqplib');
const { claveRuteo, validarSobre } = require('./eventos');
const { EXCHANGE, asegurarTopologia } = require('./topologia');
const { ErrorNoReintentable, esperar } = require('./errores');

/**
 * Conecta a RabbitMQ con reintentos. Por defecto, si la conexión se cae el proceso
 * termina y Docker lo reinicia (restart: unless-stopped).
 */
async function conectarBroker(url, log, { reintentos = 30, esperaMs = 2000, alCerrar } = {}) {
  for (let intento = 1; ; intento++) {
    try {
      const conexion = await amqp.connect(url);
      conexion.on('error', (err) => log.error('error en conexión AMQP', { err: err.message }));
      conexion.on('close', alCerrar ?? (() => {
        log.error('conexión AMQP cerrada; reiniciando proceso');
        process.exit(1);
      }));
      return conexion;
    } catch (err) {
      if (intento >= reintentos) throw err;
      log.warn('broker no disponible, reintentando', { intento, err: err.message });
      await esperar(esperaMs);
    }
  }
}

/** Publicador con publisher confirms: `publicar` resuelve solo cuando el broker confirma. */
async function crearPublicador(conexion) {
  const canal = await conexion.createConfirmChannel();
  await asegurarTopologia(canal);
  return {
    publicar(evento) {
      const contenido = Buffer.from(JSON.stringify(evento));
      return new Promise((resolve, reject) => {
        canal.publish(EXCHANGE, claveRuteo(evento.eventType, evento.version), contenido, {
          persistent: true,
          contentType: 'application/json',
          messageId: evento.eventId,
          correlationId: evento.correlationId,
          type: evento.eventType,
          timestamp: Math.floor(Date.now() / 1000),
        }, (err) => (err ? reject(err) : resolve()));
      });
    },
    cerrar: () => canal.close(),
  };
}

/**
 * Consume una cola con ack manual (at-least-once).
 * - Éxito: ack.
 * - Error transitorio: nack con requeue; tras LIMITE_ENTREGAS la cola quorum lo envía a la DLQ.
 * - Mensaje inválido o ErrorNoReintentable: nack sin requeue (directo a la DLQ).
 * @param {Record<string, (evento, ctx) => Promise<void>>} manejadores por clave de ruteo
 */
async function iniciarConsumidor(conexion, cola, manejadores, log, { prefetch = 10, esperaReintentoMs = 1000 } = {}) {
  const canal = await conexion.createChannel();
  await asegurarTopologia(canal);
  await canal.prefetch(prefetch);

  await canal.consume(cola.nombre, async (mensaje) => {
    if (!mensaje) return;
    let evento;
    try {
      evento = JSON.parse(mensaje.content.toString('utf8'));
    } catch {
      log.error('mensaje no es JSON; enviado a DLQ', { cola: cola.nombre });
      canal.nack(mensaje, false, false);
      return;
    }

    const errores = validarSobre(evento);
    const manejador = errores.length ? undefined : manejadores[claveRuteo(evento.eventType, evento.version)];
    if (!manejador) {
      log.error('evento inválido o sin manejador; enviado a DLQ', { cola: cola.nombre, errores, eventId: evento?.eventId });
      canal.nack(mensaje, false, false);
      return;
    }

    const ctx = {
      eventId: evento.eventId,
      correlationId: evento.correlationId,
      eventType: evento.eventType,
      entrega: (mensaje.properties.headers?.['x-delivery-count'] ?? 0) + 1,
    };
    try {
      await manejador(evento, ctx);
      canal.ack(mensaje);
      log.info('evento procesado', ctx);
    } catch (err) {
      const reintentar = !(err instanceof ErrorNoReintentable);
      log.error(reintentar ? 'error procesando evento; se reintentará' : 'error no reintentable; enviado a DLQ', { ...ctx, err: err.message });
      if (reintentar) await esperar(esperaReintentoMs);
      canal.nack(mensaje, false, reintentar);
    }
  }, { noAck: false });

  return canal;
}

module.exports = { conectarBroker, crearPublicador, iniciarConsumidor };
