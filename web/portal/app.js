'use strict';

(() => {
  const $ = (selector) => document.querySelector(selector);
  const ui = {
    form: $('#form-cita'),
    medico: $('#medico'),
    fecha: $('#fecha'),
    horarios: $('#horarios'),
    nombre: $('#nombre'),
    email: $('#email'),
    enviar: $('#enviar'),
    mensaje: $('#mensaje'),
  };
  let horarioElegido = null;

  async function api(ruta, opciones = {}) {
    const respuesta = await fetch(`/api${ruta}`, {
      ...opciones,
      headers: { 'Content-Type': 'application/json', ...opciones.headers },
    });
    const cuerpo = await respuesta.json().catch(() => ({}));
    return { status: respuesta.status, cuerpo };
  }

  // Siempre textContent (nunca innerHTML) para evitar XSS con datos del servidor.
  function mostrar(texto, tipo, detalles = []) {
    ui.mensaje.replaceChildren();
    const p = document.createElement('p');
    p.className = tipo;
    p.textContent = texto;
    ui.mensaje.append(p);
    if (detalles.length) {
      const lista = document.createElement('ul');
      for (const d of detalles) {
        const li = document.createElement('li');
        li.textContent = d;
        lista.append(li);
      }
      ui.mensaje.append(lista);
    }
  }

  const actualizarBoton = () => {
    ui.enviar.disabled = !(horarioElegido && ui.nombre.value.trim() && ui.email.value.trim());
  };

  // Fecha de hoy en Guatemala (UTC-6), formato AAAA-MM-DD.
  const hoyGuatemala = () => new Date(Date.now() - 6 * 3600 * 1000).toISOString().slice(0, 10);

  async function cargarMedicos() {
    const { status, cuerpo } = await api('/medicos');
    if (status !== 200) return mostrar('No se pudo cargar la lista de médicos.', 'error');
    for (const m of cuerpo) {
      const opcion = document.createElement('option');
      opcion.value = m.id;
      opcion.textContent = `${m.nombre} — ${m.especialidad}`;
      ui.medico.append(opcion);
    }
  }

  async function cargarHorarios() {
    horarioElegido = null;
    actualizarBoton();
    ui.horarios.replaceChildren();
    if (!ui.medico.value || !ui.fecha.value) return;

    const { status, cuerpo } = await api(`/medicos/${encodeURIComponent(ui.medico.value)}/horarios?fecha=${ui.fecha.value}`);
    if (status !== 200) return mostrar(cuerpo.error || 'No se pudieron cargar los horarios.', 'error');
    if (!cuerpo.disponibles.length) {
      const vacio = document.createElement('p');
      vacio.textContent = 'Sin horarios disponibles para esta fecha.';
      ui.horarios.append(vacio);
      return;
    }
    for (const horario of cuerpo.disponibles) {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.setAttribute('role', 'radio');
      boton.setAttribute('aria-checked', 'false');
      boton.textContent = horario.slice(11, 16);
      boton.addEventListener('click', () => {
        ui.horarios.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', 'false'));
        boton.setAttribute('aria-checked', 'true');
        horarioElegido = horario;
        actualizarBoton();
      });
      ui.horarios.append(boton);
    }
  }

  async function confirmar(evento) {
    evento.preventDefault();
    ui.enviar.disabled = true;
    const { status, cuerpo } = await api('/citas', {
      method: 'POST',
      body: JSON.stringify({
        medicoId: ui.medico.value,
        fechaHora: horarioElegido,
        paciente: { nombre: ui.nombre.value, email: ui.email.value },
      }),
    });

    if (status === 201) {
      mostrar(`Cita ${cuerpo.citaId} confirmada con ${cuerpo.medico}. Recibirás un correo de confirmación.`, 'ok');
      ui.form.reset();
      ui.fecha.value = hoyGuatemala();
    } else if (status === 409) {
      mostrar('Ese horario acaba de ser reservado por otra persona. Elige otro.', 'error');
    } else if (status === 400) {
      mostrar('Revisa los datos:', 'error', (cuerpo.errores || []).map((e) => e.mensaje));
    } else {
      mostrar(`Error inesperado (${status}). Intenta de nuevo.`, 'error');
    }
    await cargarHorarios();
  }

  ui.medico.addEventListener('change', cargarHorarios);
  ui.fecha.addEventListener('change', cargarHorarios);
  ui.nombre.addEventListener('input', actualizarBoton);
  ui.email.addEventListener('input', actualizarBoton);
  ui.form.addEventListener('submit', confirmar);

  ui.fecha.min = hoyGuatemala();
  ui.fecha.value = hoyGuatemala();
  cargarMedicos().then(cargarHorarios);
})();
