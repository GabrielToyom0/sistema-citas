'use strict';

/**
 * Ejecuta `tarea` periódicamente sin solaparse. Ante fallos aplica backoff exponencial
 * (lo usan el relay del outbox y el programador de recordatorios).
 */
function crearPoller({ nombre, intervaloMs, maxEsperaMs = 30_000, tarea, log }) {
  let temporizador = null;
  let activo = false;
  let fallos = 0;

  const programar = () => {
    if (!activo) return;
    const espera = fallos ? Math.min(intervaloMs * 2 ** fallos, maxEsperaMs) : intervaloMs;
    temporizador = setTimeout(ejecutar, espera);
  };

  async function ejecutar() {
    try {
      await tarea();
      fallos = 0;
    } catch (err) {
      fallos += 1;
      log.warn(`${nombre}: falló, se reintentará con backoff`, { err: err.message, fallos });
    } finally {
      programar();
    }
  }

  return {
    iniciar() {
      if (activo) return;
      activo = true;
      temporizador = setTimeout(ejecutar, 0);
    },
    detener() {
      activo = false;
      clearTimeout(temporizador);
    },
    get fallos() {
      return fallos;
    },
  };
}

module.exports = { crearPoller };
