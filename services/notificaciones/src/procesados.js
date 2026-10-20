'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Registro persistente de eventIds ya procesados (idempotencia, RNF-01).
 * Archivo append-only en un volumen Docker: sobrevive reinicios del contenedor.
 */
function crearAlmacenProcesados(archivo) {
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  const ids = new Set(
    fs.existsSync(archivo) ? fs.readFileSync(archivo, 'utf8').split('\n').filter(Boolean) : [],
  );
  return {
    tiene: (eventId) => ids.has(eventId),
    registrar(eventId) {
      fs.appendFileSync(archivo, `${eventId}\n`);
      ids.add(eventId);
    },
    get total() {
      return ids.size;
    },
  };
}

module.exports = { crearAlmacenProcesados };
