-- Bases de datos y logins por servicio (Hito 1 §4.6). Ejecutado por db-init con la cuenta sa.
-- Variables sqlcmd: CITAS_DB_PASSWORD, RECORDATORIOS_DB_PASSWORD (desde .env).
SET QUOTED_IDENTIFIER ON;
GO

IF DB_ID('CitasDB') IS NULL CREATE DATABASE CitasDB;
IF DB_ID('RecordatoriosDB') IS NULL CREATE DATABASE RecordatoriosDB;
GO

IF SUSER_ID('citas_app') IS NULL
  CREATE LOGIN citas_app WITH PASSWORD = '$(CITAS_DB_PASSWORD)', DEFAULT_DATABASE = CitasDB, CHECK_POLICY = ON;
IF SUSER_ID('recordatorios_app') IS NULL
  CREATE LOGIN recordatorios_app WITH PASSWORD = '$(RECORDATORIOS_DB_PASSWORD)', DEFAULT_DATABASE = RecordatoriosDB, CHECK_POLICY = ON;
GO
