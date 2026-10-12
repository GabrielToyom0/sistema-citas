'use strict';

/** Error que no se corrige reintentando (p. ej. datos inválidos): el mensaje va directo a la DLQ. */
class ErrorNoReintentable extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorNoReintentable';
  }
}

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { ErrorNoReintentable, esperar };
