#!/usr/bin/env bash
set -e
export PGPASSWORD=root
echo "Exporting PrayasPro PostgreSQL database..."
pg_dump -h 127.0.0.1 -U postgres -d prayaspro -F p -f "$(dirname "$0")/prayaspro_dump.sql"
pg_dump -h 127.0.0.1 -U postgres -d prayaspro -F p -s -f "$(dirname "$0")/backend/src/db/schema.sql"
cp "$(dirname "$0")/prayaspro_dump.sql" "$(dirname "$0")/../DBMS/prayaspro_dump.sql" 2>/dev/null || true
cp "$(dirname "$0")/backend/src/db/schema.sql" "$(dirname "$0")/../DBMS/schema.sql" 2>/dev/null || true
echo "Database export complete: prayaspro_dump.sql and schema.sql updated."

