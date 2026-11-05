#!/usr/bin/env bash
# Restaura un backup creado por scripts/backup.sh.
#   scripts/restore.sh [latest|<nombre>.tar.gz.gpg|/ruta/al/fichero.tar.gz.gpg] --yes [--skip-storage] [--skip-auth]
# Variables: RESTORE_DB_URL (base de datos DESTINO, con las migraciones ya aplicadas),
#   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (Storage del proyecto DESTINO), BACKUP_ENCRYPTION_KEY,
#   y el origen (BACKUP_S3_* o BACKUP_DIR) si no se pasa una ruta local.
# ATENCIÓN: vacía las tablas de "public" (y los usuarios de Auth salvo --skip-auth) del destino
# antes de cargar los datos del backup. Por eso exige --yes.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/backup-common.sh
source "$here/lib/backup-common.sh"

src="latest"; yes=0; skip_storage=0; skip_auth=0
for a in "$@"; do
  case "$a" in
    --yes) yes=1 ;; --skip-storage) skip_storage=1 ;; --skip-auth) skip_auth=1 ;;
    -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
    *) src="$a" ;;
  esac
done
PSQL="${PSQL:-psql}"
need gpg; need tar; need curl; need jq; need "$PSQL"
[[ -n "${RESTORE_DB_URL:-}" ]] || die "falta RESTORE_DB_URL (base de datos destino)"
(( yes )) || die "la restauración sobrescribe datos del destino: repite con --yes"

umask 077
work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT

# --- Obtener y descifrar -----------------------------------------------------
if [[ -f "$src" ]]; then cp "$src" "$work/backup.gpg"; name="$(basename "$src")"
else
  if [[ "$src" == latest ]]; then name="$(list_backups | tail -n1)"; [[ -n "$name" ]] || die "no hay backups en el destino"
  else name="$src"; fi
  [[ "$(backup_target)" == s3 ]] && need "$AWS"
  get_backup "$name" "$work/backup.gpg"
fi
log "Restaurando $name"
decrypt_file "$work/backup.gpg" "$work/backup.tar.gz" || die "no se pudo descifrar (¿clave incorrecta?)"
tar -C "$work" -xzf "$work/backup.tar.gz"
root="$(find "$work" -mindepth 1 -maxdepth 1 -type d -name 'la-ximenera-backup-*' | head -n1)"
[[ -f "$root/BACKUP_INFO" ]] || die "archivo de backup no válido"

# --- Base de datos -------------------------------------------------------------
log "Restaurando base de datos…"
{
  echo '\set ON_ERROR_STOP 1'
  echo 'set client_min_messages = warning;'
  echo 'begin;'
  if (( ! skip_auth )); then
    echo 'delete from auth.identities;'
    echo 'delete from auth.users;'   # en cascada: sesiones, factores, etc.
  fi
  echo "do \$\$ declare r record; begin
    for r in select tablename from pg_tables where schemaname = 'public' loop
      execute format('truncate table public.%I restart identity cascade', r.tablename);
    end loop; end \$\$;"
  echo 'set local session_replication_role = replica;'
  (( skip_auth )) || echo "\\i '$root/db/auth-data.sql'"
  echo "\\i '$root/db/public-data.sql'"
  echo 'commit;'
} > "$work/restore.sql"
"$PSQL" "$RESTORE_DB_URL" -X -q -v ON_ERROR_STOP=1 -f "$work/restore.sql" >/dev/null

# Verificación de recuentos.
bad=0
while IFS=$'\t' read -r t n; do
  [[ "$t" == auth.* ]] && (( skip_auth )) && continue
  got="$("$PSQL" "$RESTORE_DB_URL" -X -q -At -c "select count(*) from $t")"
  if [[ "$got" != "$n" ]]; then log "Recuento distinto en $t: esperado $n, hay $got"; bad=1; fi
done < "$root/db/row-counts.tsv"
(( bad )) && die "la verificación de filas ha fallado"
log "Base de datos restaurada: $(wc -l < "$root/db/row-counts.tsv") tablas con recuentos verificados"

# --- Storage -------------------------------------------------------------------
if (( ! skip_storage )); then
  hdr="$work/auth.hdr"; storage_auth_file "$hdr"
  api="${SUPABASE_URL%/}/storage/v1"
  existing="$(curl -fsS -H @"$hdr" "$api/bucket" | jq -r '.[].id')"
  while read -r b; do
    [[ -n "$b" ]] || continue
    if ! grep -qx "$b" <<<"$existing"; then
      jq -c --arg id "$b" '.[] | select(.id==$id) | {id, name, public, file_size_limit, allowed_mime_types}' "$root/storage/buckets.json" \
        | curl -fsS -H @"$hdr" -H 'Content-Type: application/json' -X POST "$api/bucket" -d @- >/dev/null
      log "Bucket creado: $b"
    fi
  done < <(jq -r '.[].id' "$root/storage/buckets.json")
  n=0
  while IFS=$'\t' read -r b p mime; do
    curl -fsS -H @"$hdr" -H "Content-Type: $mime" -H 'x-upsert: true' -X POST \
      --data-binary @"$root/storage/objects/$b/$p" "$api/object/$b/$(urlencode_path "$p")" >/dev/null
    n=$((n + 1))
  done < "$root/storage/manifest.tsv"
  log "Storage restaurado: $n ficheros"
fi
log "Restauración completada"
