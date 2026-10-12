'use strict';

/**
 * Logger estructurado (una línea JSON por evento). Incluir siempre correlationId
 * para seguir una misma cita a través de los servicios.
 */
function crearLogger(servicio) {
  const escribir = (nivel, mensaje, campos = {}) => {
    const linea = JSON.stringify({ ts: new Date().toISOString(), nivel, servicio, mensaje, ...campos });
    (nivel === 'error' ? process.stderr : process.stdout).write(`${linea}\n`);
  };
  return {
    info: (mensaje, campos) => escribir('info', mensaje, campos),
    warn: (mensaje, campos) => escribir('warn', mensaje, campos),
    error: (mensaje, campos) => escribir('error', mensaje, campos),
  };
}

module.exports = { crearLogger };
