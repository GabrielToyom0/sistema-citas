'use strict';

const sql = require('mssql');
const { esperar } = require('@citas/shared');

async function conectarDb(config, log, { reintentos = 30, esperaMs = 2000 } = {}) {
  for (let intento = 1; ; intento++) {
    try {
      const pool = await new sql.ConnectionPool(config).connect();
      pool.on('error', (err) => log.error('error en pool SQL', { err: err.message }));
      return pool;
    } catch (err) {
      if (intento >= reintentos) throw err;
      log.warn('SQL Server no disponible, reintentando', { intento, err: err.message });
      await esperar(esperaMs);
    }
  }
}

module.exports = { sql, conectarDb };
