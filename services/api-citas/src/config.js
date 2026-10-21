'use strict';

const { env, envInt } = require('@citas/shared');

module.exports = {
  puerto: envInt('PORT', 3000),
  amqpUrl: env('AMQP_URL'),
  zonaHoraria: env('CLINIC_TZ_OFFSET', '-06:00'),
  db: {
    server: env('DB_HOST'),
    port: envInt('DB_PORT', 1433),
    database: env('DB_NAME'),
    user: env('DB_USER'),
    password: env('DB_PASSWORD'),
    options: { encrypt: true, trustServerCertificate: env('DB_TRUST_CERT', 'false') === 'true' },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30_000 },
  },
  outbox: {
    intervaloMs: envInt('OUTBOX_INTERVAL_MS', 1000),
    lote: envInt('OUTBOX_BATCH_SIZE', 20),
  },
};