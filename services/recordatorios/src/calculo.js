'use strict';

/**
 * Momento de envío del recordatorio (RF-04).
 * - Normal: `anticipacionMin` antes de la cita (si ya pasó ese momento, de inmediato).
 * - Demo: `retrasoDemoSeg` segundos después de agendar, para verlo en vivo.
 * Devuelve null si la cita ya ocurrió (no tiene sentido recordar).
 */
function calcularEnvio(fechaCitaMs, ahoraMs, { anticipacionMin, retrasoDemoSeg = 0 }) {
  if (fechaCitaMs <= ahoraMs) return null;
  if (retrasoDemoSeg > 0) return Math.min(ahoraMs + retrasoDemoSeg * 1000, fechaCitaMs);
  return Math.max(ahoraMs, fechaCitaMs - anticipacionMin * 60_000);
}

module.exports = { calcularEnvio };
