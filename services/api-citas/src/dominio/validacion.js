'use strict';

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,189}\.[^\s@]{2,}$/;
const FECHA_HORA_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/;

const texto = (v) => (typeof v === 'string' ? v.trim() : '');

/** Valida el cuerpo de POST /api/citas (RF-01). No consulta la BD. */
function validarCrearCita(cuerpo) {
  const b = cuerpo && typeof cuerpo === 'object' ? cuerpo : {};
  const errores = [];

  const medicoId = texto(b.medicoId);
  if (!/^MED-\d{2,4}$/.test(medicoId)) errores.push({ campo: 'medicoId', mensaje: 'Formato esperado MED-00' });

  const fechaHora = texto(b.fechaHora);
  if (!FECHA_HORA_ISO.test(fechaHora) || Number.isNaN(Date.parse(fechaHora))) {
    errores.push({ campo: 'fechaHora', mensaje: 'Fecha y hora ISO 8601 con zona horaria' });
  }

  const nombre = texto(b.paciente?.nombre);
  if (nombre.length < 2 || nombre.length > 100) errores.push({ campo: 'paciente.nombre', mensaje: 'Entre 2 y 100 caracteres' });

  const email = texto(b.paciente?.email).toLowerCase();
  if (email.length > 254 || !EMAIL.test(email)) errores.push({ campo: 'paciente.email', mensaje: 'Correo electrónico inválido' });

  return errores.length
    ? { ok: false, errores }
    : { ok: true, valor: { medicoId, fechaHora, paciente: { nombre, email } } };
}

module.exports = { validarCrearCita };
