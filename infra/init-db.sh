#!/bin/bash
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE DATABASE journey_db;
  CREATE DATABASE analytics_db;
  CREATE DATABASE connectors_db;
  CREATE DATABASE ai_db;
  \c ai_db
  CREATE EXTENSION IF NOT EXISTS vector;
EOSQL
for db in journey_db analytics_db connectors_db; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$db" -c "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";"
done
