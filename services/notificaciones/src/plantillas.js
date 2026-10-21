'use strict';

const formatoFecha = new Intl.DateTimeFormat('es-GT', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: 'America/Guatemala',
});

const escaparHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

function construir(titulo, intro, data) {
  const fecha = formatoFecha.format(new Date(data.fechaHora));
  const lineas = [
    `Hola ${data.paciente.nombre},`,
    '',
    intro,
    '',
    `Número de cita: ${data.citaId}`,
    `Médico: ${data.medico.nombre}${data.medico.especialidad ? ` (${data.medico.especialidad})` : ''}`,
    `Fecha y hora: ${fecha}`,
  ];
  return {
    asunto: `${titulo} — ${data.citaId}`,
    texto: lineas.join('\n'),
    html: lineas.map((l) => (l ? `<p>${escaparHtml(l)}</p>` : '')).join(''),
  };
}

const confirmacion = (data) => construir('Cita confirmada', 'Tu cita quedó registrada con los siguientes datos:', data);
const recordatorio = (data) => construir('Recordatorio de cita', 'Te recordamos que tienes una cita próximamente:', data);

module.exports = { confirmacion, recordatorio };
