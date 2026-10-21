'use strict';

const MS_MINUTO = 60_000;
const pad = (n) => String(n).padStart(2, '0');

/** '-06:00' -> -360 */
function offsetMinutos(zona) {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(zona);
  if (!m) throw new RangeError(`Offset de zona horaria inválido: ${zona}`);
  const minutos = Number(m[2]) * 60 + Number(m[3]);
  return m[1] === '-' ? -minutos : minutos;
}

const aMinutos = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

function esFechaValida(fecha) {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha) && !Number.isNaN(Date.parse(fecha))
    && new Date(fecha).toISOString().slice(0, 10) === fecha;
}

/** Instante (ms) -> ISO en la zona de la clínica, p. ej. 2026-10-20T10:00:00-06:00 */
function aIsoLocal(ms, zona) {
  const local = new Date(ms + offsetMinutos(zona) * MS_MINUTO);
  return `${local.toISOString().slice(0, 19)}${zona}`;
}

/** Horarios del día según la jornada del médico (horaInicio, horaFin, duracionMin). */
function generarHorarios(fecha, medico, zona) {
  if (!esFechaValida(fecha)) throw new RangeError('fecha inválida, se espera AAAA-MM-DD');
  const horarios = [];
  const fin = aMinutos(medico.horaFin);
  for (let t = aMinutos(medico.horaInicio); t + medico.duracionMin <= fin; t += medico.duracionMin) {
    horarios.push(`${fecha}T${pad(Math.floor(t / 60))}:${pad(t % 60)}:00${zona}`);
  }
  return horarios;
}

/** true si el instante coincide exactamente con un horario de la jornada del médico. */
function esHorarioDeAgenda(ms, medico, zona) {
  const fechaLocal = aIsoLocal(ms, zona).slice(0, 10);
  return generarHorarios(fechaLocal, medico, zona).some((h) => Date.parse(h) === ms);
}

function rangoDelDia(fecha, zona) {
  const desde = Date.parse(`${fecha}T00:00:00${zona}`);
  return { desde, hasta: desde + 24 * 60 * MS_MINUTO };
}

module.exports = { offsetMinutos, esFechaValida, aIsoLocal, generarHorarios, esHorarioDeAgenda, rangoDelDia };
