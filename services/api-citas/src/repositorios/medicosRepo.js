'use strict';

const { sql } = require('../db');

const COLUMNAS = `id, nombre, especialidad,
  CONVERT(CHAR(5), hora_inicio, 108) AS horaInicio,
  CONVERT(CHAR(5), hora_fin, 108) AS horaFin,
  duracion_min AS duracionMin`;

function crearMedicosRepo(pool) {
  return {
    async listar() {
      const { recordset } = await pool.request().query(`SELECT ${COLUMNAS} FROM dbo.medicos ORDER BY nombre`);
      return recordset;
    },

    async obtener(id) {
      const { recordset } = await pool.request()
        .input('id', sql.VarChar(10), id)
        .query(`SELECT ${COLUMNAS} FROM dbo.medicos WHERE id = @id`);
      return recordset[0] ?? null;
    },

    /** Instantes (ms) ya reservados del médico en [desde, hasta). */
    async horariosOcupados(medicoId, desde, hasta) {
      const { recordset } = await pool.request()
        .input('medicoId', sql.VarChar(10), medicoId)
        .input('desde', sql.DateTimeOffset(0), new Date(desde))
        .input('hasta', sql.DateTimeOffset(0), new Date(hasta))
        .query(`SELECT fecha_hora FROM dbo.citas
                WHERE medico_id = @medicoId AND estado = 'CONFIRMADA'
                  AND fecha_hora >= @desde AND fecha_hora < @hasta`);
      return new Set(recordset.map((r) => r.fecha_hora.getTime()));
    },
  };
}

module.exports = { crearMedicosRepo };
