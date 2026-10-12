'use strict';

/** Lee una variable de entorno; falla al arrancar si es obligatoria y no existe. */
function env(nombre, porDefecto) {
  const valor = process.env[nombre];
  if (valor === undefined || valor === '') {
    if (porDefecto !== undefined) return porDefecto;
    throw new Error(`Variable de entorno requerida: ${nombre}`);
  }
  return valor;
}

function envInt(nombre, porDefecto) {
  const valor = Number.parseInt(env(nombre, porDefecto === undefined ? undefined : String(porDefecto)), 10);
  if (Number.isNaN(valor)) throw new Error(`${nombre} debe ser un número entero`);
  return valor;
}

module.exports = { env, envInt };
