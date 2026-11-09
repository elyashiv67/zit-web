#!/bin/sh
# Nightly backup of the database and the pin photos, kept 14 days.
# Run as root from cron (deployment guide, step 12). Copy /srv/zit-backups off the server as well.
set -eu
cd /srv/zit
DIR=/srv/zit-backups
DAY=$(date +%F)
umask 077
mkdir -p "$DIR"

# database, without login sessions. Option B (container):
docker compose exec -T mongo sh -c 'mongodump -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db Zit --excludeCollection sessions --archive --gzip' \
  > "$DIR/db-$DAY.archive.gz.part"
# Option A (Atlas): put ATLAS_BACKUP_URI=... in /srv/zit/deploy/backup.env (chmod 600), then use these two lines
# instead of the docker compose line above:
#   . /srv/zit/deploy/backup.env
#   docker run --rm mongo:8.0 mongodump --uri "$ATLAS_BACKUP_URI" --db Zit --excludeCollection sessions --archive --gzip > "$DIR/db-$DAY.archive.gz.part"
mv "$DIR/db-$DAY.archive.gz.part" "$DIR/db-$DAY.archive.gz"

# photos (the "uploads" volume of the "zit" compose project)
docker run --rm -v zit_uploads:/data:ro alpine tar czf - -C /data . > "$DIR/uploads-$DAY.tgz.part"
mv "$DIR/uploads-$DAY.tgz.part" "$DIR/uploads-$DAY.tgz"

# keep two weeks (and drop half-written files from a failed night)
find "$DIR" -type f -mtime +14 -delete
find "$DIR" -type f -name '*.part' -mmin +60 -delete
echo "$(date -Is) backup ok: $(du -sh "$DIR" | cut -f1)"
