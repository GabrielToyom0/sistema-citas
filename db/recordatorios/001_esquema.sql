-- RecordatoriosDB: dueña exclusiva el Servicio de Recordatorios. Script idempotente.
SET QUOTED_IDENTIFIER ON;
GO
USE RecordatoriosDB;
GO

IF USER_ID('recordatorios_app') IS NULL CREATE USER recordatorios_app FOR LOGIN recordatorios_app;
GRANT SELECT, INSERT, UPDATE ON SCHEMA::dbo TO recordatorios_app;
GO

-- Idempotencia del consumidor (RNF-01).
IF OBJECT_ID('dbo.eventos_procesados') IS NULL
CREATE TABLE dbo.eventos_procesados (
  event_id      UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_eventos_procesados PRIMARY KEY,
  procesado_en  DATETIME2(3)     NOT NULL CONSTRAINT DF_eventos_procesado DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID('dbo.recordatorios') IS NULL
CREATE TABLE dbo.recordatorios (
  id            BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_recordatorios PRIMARY KEY,
  cita_id       VARCHAR(20)          NOT NULL CONSTRAINT UQ_recordatorios_cita UNIQUE,
  event_id      UNIQUEIDENTIFIER     NOT NULL CONSTRAINT UQ_recordatorios_event UNIQUE,  -- RecordatorioVencido
  enviar_en     DATETIMEOFFSET(0)    NOT NULL,
  evento        NVARCHAR(MAX)        NOT NULL CONSTRAINT CK_recordatorios_json CHECK (ISJSON(evento) = 1),
  estado        VARCHAR(10)          NOT NULL CONSTRAINT DF_recordatorios_estado DEFAULT 'PENDIENTE'
                                     CONSTRAINT CK_recordatorios_estado CHECK (estado IN ('PENDIENTE', 'PUBLICADO')),
  publicado_en  DATETIME2(3)         NULL
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_recordatorios_pendientes')
  CREATE INDEX IX_recordatorios_pendientes ON dbo.recordatorios (enviar_en) WHERE estado = 'PENDIENTE';
GO
