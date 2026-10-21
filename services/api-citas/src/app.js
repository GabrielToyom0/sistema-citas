'use strict';

const express = require('express');
const { randomUUID } = require('node:crypto');
const { TIPOS_EVENTO, crearEvento } = require('@citas/shared');
const { validarCrearCita } = require('./dominio/validacion');
const { esFechaValida, aIsoLocal, generarHorarios, esHorarioDeAgenda, rangoDelDia } = require('./dominio/horarios');
const { HorarioOcupadoError } = require('./repositorios/citasRepo');

const CORRELATION_ID = /^[A-Za-z0-9-]{8,64}$/;
const manejar = (fn) => (req, res, next) => fn(req, res, next).catch(next);

/**
 * La app recibe sus dependencias (repositorios, reloj) para poder probarse sin BD.
 * La única parte síncrona del flujo termina al responder 201 (CU-01, paso 5).
 */
function crearApp({ repos, log, zona, ahora = Date.now }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));

  app.use((req, res, next) => {
    const entrante = req.get('x-correlation-id');
    req.correlationId = entrante && CORRELATION_ID.test(entrante) ? entrante : randomUUID();
    res.set('x-correlation-id', req.correlationId);
    next();
  });

  app.get('/health', (_req, res) => res.json({ estado: 'ok' }));

  app.get('/api/medicos', manejar(async (_req, res) => {
    const medicos = await repos.medicos.listar();
    res.json(medicos.map(({ id, nombre, especialidad }) => ({ id, nombre, especialidad })));
  }));

  app.get('/api/medicos/:id/horarios', manejar(async (req, res) => {
    const { fecha } = req.query;
    if (typeof fecha !== 'string' || !esFechaValida(fecha)) {
      return res.status(400).json({ error: 'Parámetro fecha requerido (AAAA-MM-DD)' });
    }
    const medico = await repos.medicos.obtener(req.params.id);
    if (!medico) return res.status(404).json({ error: 'Médico no encontrado' });

    const { desde, hasta } = rangoDelDia(fecha, zona);
    const ocupados = await repos.medicos.horariosOcupados(medico.id, desde, hasta);
    const disponibles = generarHorarios(fecha, medico, zona)
      .filter((h) => Date.parse(h) > ahora() && !ocupados.has(Date.parse(h)));
    res.json({ medicoId: medico.id, fecha, disponibles });
  }));

  app.post('/api/citas', manejar(async (req, res) => {
    const validacion = validarCrearCita(req.body);
    if (!validacion.ok) return res.status(400).json({ error: 'Datos inválidos', errores: validacion.errores });
    const { medicoId, fechaHora, paciente } = validacion.valor;

    const medico = await repos.medicos.obtener(medicoId);
    if (!medico) return res.status(400).json({ error: 'Datos inválidos', errores: [{ campo: 'medicoId', mensaje: 'El médico no existe' }] });

    const instante = Date.parse(fechaHora);
    if (instante <= ahora() || !esHorarioDeAgenda(instante, medico, zona)) {
      return res.status(400).json({ error: 'Datos inválidos', errores: [{ campo: 'fechaHora', mensaje: 'Horario fuera de la agenda del médico o en el pasado' }] });
    }

    const fechaLocal = aIsoLocal(instante, zona);
    try {
      const { citaId, evento } = await repos.citas.crearConEvento(
        { medico, paciente, fechaHora: fechaLocal },
        ({ citaId: id, pacienteId }) => crearEvento(TIPOS_EVENTO.CITA_AGENDADA, {
          citaId: id,
          medico: { id: medico.id, nombre: medico.nombre, especialidad: medico.especialidad },
          paciente: { id: pacienteId, nombre: paciente.nombre, email: paciente.email },
          fechaHora: fechaLocal,
        }, { correlationId: req.correlationId }),
      );
      log.info('cita registrada', { citaId, eventId: evento.eventId, correlationId: req.correlationId });
      res.status(201).location(`/api/citas/${citaId}`).json({
        citaId, estado: 'CONFIRMADA', medico: medico.nombre, fechaHora: fechaLocal,
      });
    } catch (err) {
      if (err instanceof HorarioOcupadoError) return res.status(409).json({ error: err.message });
      throw err;
    }
  }));

  app.use((_req, res) => res.status(404).json({ error: 'No encontrado' }));

  // Nunca se exponen trazas internas al cliente.
  app.use((err, req, res, _next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Solicitud demasiado grande' });
    log.error('error no controlado', { err: err.message, correlationId: req.correlationId });
    res.status(500).json({ error: 'Error interno', correlationId: req.correlationId });
  });

  return app;
}

module.exports = { crearApp };
