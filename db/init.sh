#!/bin/bash
# Ejecuta los scripts SQL en orden. Corre una sola vez en el contenedor db-init.
set -euo pipefail

SQLCMD=/opt/mssql-tools18/bin/sqlcmd

for script in /db/000_crear_bases.sql /db/citas/*.sql /db/recordatorios/*.sql; do
  echo "Ejecutando ${script}"
  # -C confía en el certificado autofirmado (solo desarrollo); -I activa QUOTED_IDENTIFIER; -b aborta ante error
  "$SQLCMD" -S "$DB_HOST" -U sa -P "$MSSQL_SA_PASSWORD" -C -I -b -i "$script" \
    -v CITAS_DB_PASSWORD="$CITAS_DB_PASSWORD" RECORDATORIOS_DB_PASSWORD="$RECORDATORIOS_DB_PASSWORD"
done

echo "Bases de datos listas"
