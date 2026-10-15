-- CitasDB: dueña exclusiva la API de Citas. Script idempotente.
SET QUOTED_IDENTIFIER ON;
GO
USE CitasDB;
GO

IF USER_ID('citas_app') IS NULL CREATE USER citas_app FOR LOGIN citas_app;
-- Mínimo privilegio: sin DELETE ni DDL.
GRANT SELECT, INSERT, UPDATE ON SCHEMA::dbo TO citas_app;
GO

IF OBJECT_ID('dbo.medicos') IS NULL
CREATE TABLE dbo.medicos (
  id            VARCHAR(10)   NOT NULL CONSTRAINT PK_medicos PRIMARY KEY,
  nombre        NVARCHAR(100) NOT NULL,
  especialidad  NVARCHAR(60)  NOT NULL,
  hora_inicio   TIME(0)       NOT NULL,
  hora_fin      TIME(0)       NOT NULL,
  duracion_min  TINYINT       NOT NULL CONSTRAINT CK_medicos_duracion CHECK (duracion_min BETWEEN 10 AND 120),
  CONSTRAINT CK_medicos_jornada CHECK (hora_fin > hora_inicio)
);

IF OBJECT_ID('dbo.pacientes') IS NULL
CREATE TABLE dbo.pacientes (
  id         INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_pacientes PRIMARY KEY,
  nombre     NVARCHAR(100) NOT NULL,
  email      NVARCHAR(254) NOT NULL CONSTRAINT UQ_pacientes_email UNIQUE,
  creado_en  DATETIME2(0)  NOT NULL CONSTRAINT DF_pacientes_creado DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID('dbo.citas') IS NULL
CREATE TABLE dbo.citas (
  id           INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_citas PRIMARY KEY,
  medico_id    VARCHAR(10)       NOT NULL CONSTRAINT FK_citas_medico REFERENCES dbo.medicos(id),
  paciente_id  INT               NOT NULL CONSTRAINT FK_citas_paciente REFERENCES dbo.pacientes(id),
  fecha_hora   DATETIMEOFFSET(0) NOT NULL,
  estado       VARCHAR(12)       NOT NULL CONSTRAINT DF_citas_estado DEFAULT 'CONFIRMADA'
                                 CONSTRAINT CK_citas_estado CHECK (estado IN ('CONFIRMADA', 'CANCELADA')),
  creado_en    DATETIME2(0)      NOT NULL CONSTRAINT DF_citas_creado DEFAULT SYSUTCDATETIME(),
  -- RF-01: sin doble reserva (datetimeoffset se compara en UTC).
  CONSTRAINT UQ_citas_medico_fecha UNIQUE (medico_id, fecha_hora)
);

-- Transactional Outbox (Hito 1 §4.3).
IF OBJECT_ID('dbo.outbox') IS NULL
CREATE TABLE dbo.outbox (
  id            BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_outbox PRIMARY KEY,
  event_id      UNIQUEIDENTIFIER     NOT NULL CONSTRAINT UQ_outbox_event UNIQUE,
  payload       NVARCHAR(MAX)        NOT NULL CONSTRAINT CK_outbox_json CHECK (ISJSON(payload) = 1),
  creado_en     DATETIME2(3)         NOT NULL CONSTRAINT DF_outbox_creado DEFAULT SYSUTCDATETIME(),
  publicado_en  DATETIME2(3)         NULL
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_outbox_pendientes')
  CREATE INDEX IX_outbox_pendientes ON dbo.outbox (id) WHERE publicado_en IS NULL;
GO

-- Datos semilla. MED-03 tiene jornada amplia para poder agendar a cualquier hora de la demo.
MERGE dbo.medicos AS destino
USING (VALUES
  ('MED-01', N'Dra. Ana López',     N'Medicina General', '08:00', '12:00', 30),
  ('MED-02', N'Dr. Carlos Méndez',  N'Pediatría',        '13:00', '17:00', 20),
  ('MED-03', N'Dra. Lucía Ramírez', N'Medicina Interna', '07:00', '21:00', 15)
) AS origen (id, nombre, especialidad, hora_inicio, hora_fin, duracion_min)
ON destino.id = origen.id
WHEN NOT MATCHED THEN
  INSERT (id, nombre, especialidad, hora_inicio, hora_fin, duracion_min)
  VALUES (origen.id, origen.nombre, origen.especialidad, origen.hora_inicio, origen.hora_fin, origen.duracion_min);
GO
