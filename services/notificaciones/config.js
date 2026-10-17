'use strict';

const { env, envInt } = require('@citas/shared');

module.exports = {
  amqpUrl: env('AMQP_URL'),
  smtp: {
    host: env('SMTP_HOST'),
    port: envInt('SMTP_PORT', 1025),
    secure: env('SMTP_SECURE', 'false') === 'true',
  },
  remitente: env('MAIL_FROM', 'Clínica <citas@clinica.local>'),
  archivoProcesados: env('PROCESSED_FILE', '/data/eventos-procesados.log'),
  prefetch: envInt('PREFETCH', 10),
};
