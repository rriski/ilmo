#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "template1" <<-EOSQL
    CREATE ROLE $DATABASE_OWNER WITH LOGIN PASSWORD '$DATABASE_OWNER_PASSWORD' SUPERUSER;
    CREATE ROLE $DATABASE_AUTHENTICATOR WITH LOGIN PASSWORD '$DATABASE_AUTHENTICATOR_PASSWORD' NOINHERIT;
    CREATE ROLE $DATABASE_VISITOR;

    GRANT $DATABASE_VISITOR TO $DATABASE_AUTHENTICATOR;

    CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
    CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;
    CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

    CREATE DATABASE ilmo;
EOSQL
