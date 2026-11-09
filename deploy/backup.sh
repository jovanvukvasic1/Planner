#!/usr/bin/env bash
# Backup baze i slika u ./backups/planer-DATUM.tar.gz (cuva zadnjih 14 backupa).
# Pokretati iz foldera projekta: ./deploy/backup.sh
set -euo pipefail
cd "$(dirname "$0")/.."

STAMP=$(date +%Y-%m-%d-%H%M)
TMP=$(mktemp -d)
mkdir -p backups

docker compose exec -T planner node scripts/backup.mjs /app/server/data/backup.db
docker compose cp planner:/app/server/data/backup.db "$TMP/planner.db"
docker compose cp planner:/app/server/data/uploads "$TMP/uploads"
docker compose exec -T planner rm -f /app/server/data/backup.db

tar czf "backups/planer-$STAMP.tar.gz" -C "$TMP" planner.db uploads
rm -rf "$TMP"
echo "Sacuvano: backups/planer-$STAMP.tar.gz"

# Brisanje starih backupa (zadrzava zadnjih 14)
ls -1t backups/planer-*.tar.gz | tail -n +15 | xargs -r rm --
