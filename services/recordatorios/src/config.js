'use strict';

const { env, envInt } = require('@citas/shared');

module.exports = {
  amqpUrl: env('AMQP_URL'),
  db: {
    server: env('DB_HOST'),
    port: envInt('DB_PORT', 1433),
    database: env('DB_NAME'),
    user: env('DB_USER'),
    password: env('DB_PASSWORD'),
    options: { encrypt: true, trustServerCertificate: env('DB_TRUST_CERT', 'false') === 'true' },
    pool: { max: 5, min: 0, idleTimeoutMillis: 30_000 },
  },
  recordatorio: {
    anticipacionMin: envInt('REMINDER_LEAD_MINUTES', 1440),
    retrasoDemoSeg: envInt('REMINDER_DEMO_DELAY_SECONDS', 0),
  },
  programador: {
    intervaloMs: envInt('SCHEDULER_INTERVAL_MS', 5000),
    lote: envInt('SCHEDULER_BATCH_SIZE', 20),
  },
};
