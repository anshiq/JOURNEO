#!/bin/bash
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE DATABASE journey_db;
  CREATE DATABASE analytics_db;
  CREATE DATABASE connectors_db;
  CREATE DATABASE ai_db;
  \c ai_db
  CREATE EXTENSION IF NOT EXISTS vector;
  \c journey_db
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
  CREATE TABLE IF NOT EXISTS campaigns (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    objective VARCHAR(64),
    audience TEXT,
    dev_token VARCHAR(36) UNIQUE,
    dev_token_created_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS journeys (
    id BIGSERIAL PRIMARY KEY,
    campaign_id VARCHAR(64) NOT NULL UNIQUE REFERENCES campaigns(id) ON DELETE CASCADE,
    name VARCHAR(255),
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    graph_json TEXT NOT NULL DEFAULT '{}',
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS files (
    id BIGSERIAL PRIMARY KEY,
    campaign_id VARCHAR(64) NOT NULL,
    storage_key VARCHAR(512) NOT NULL,
    content_type VARCHAR(128),
    size_bytes BIGINT,
    purpose VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS activity_events (
    id BIGSERIAL PRIMARY KEY,
    campaign_id VARCHAR(64),
    session_id VARCHAR(64),
    type VARCHAR(64) NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  \c analytics_db
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
  \c connectors_db
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
EOSQL
