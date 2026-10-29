#!/usr/bin/env bash
# Backup cifrado de La Ximenera: base de datos (esquema public + usuarios de Auth)
# y todos los buckets de Storage -> tar.gz -> gpg (AES256) -> S3 compatible (R2) o carpeta.
# Conserva los BACKUP_KEEP más recientes (30 por defecto).
#
# Variables: SUPABASE_DB_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BACKUP_ENCRYPTION_KEY
#   y destino: BACKUP_S3_ENDPOINT, BACKUP_S3_BUCKET, BACKUP_S3_ACCESS_KEY_ID,
#   BACKUP_S3_SECRET_ACCESS_KEY [BACKUP_S3_REGION=auto] [BACKUP_PREFIX=la-ximenera/]
#   o bien BACKUP_DIR=/ruta/local.  Opcionales: BACKUP_KEEP=30, PG_DUMP, PSQL, AWS_CLI.
# No imprime datos ni secretos; los ficheros en claro solo existen en un directorio temporal 0700.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/backup-common.sh
source "$here/lib/backup-common.sh"

PG_DUMP="${PG_DUMP:-pg_dump}"; PSQL="${PSQL:-psql}"; KEEP="${BACKUP_KEEP:-30}"
need gpg; need tar; need curl; need jq; need "$PG_DUMP"; need "$PSQL"
[[ -n "${SUPABASE_DB_URL:-}" ]] || die "falta SUPABASE_DB_URL"
[[ -n "${BACKUP_ENCRYPTION_KEY:-}" ]] || die "falta BACKUP_ENCRYPTION_KEY"
target="$(backup_target)"; [[ "$target" == s3 ]] && need "$AWS"

umask 077
work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
name="la-ximenera-backup-$stamp"
root="$work/$name"; mkdir -p "$root/db" "$root/storage/objects"

# --- Base de datos ---------------------------------------------------------
log "Volcando base de datos…"
"$PG_DUMP" "$SUPABASE_DB_URL" --schema-only --schema=public --no-owner --no-privileges -f "$root/db/schema.sql"
"$PG_DUMP" "$SUPABASE_DB_URL" --data-only --schema=public --no-owner --no-privileges -f "$root/db/public-data.sql"
"$PG_DUMP" "$SUPABASE_DB_URL" --data-only --table=auth.users --table=auth.identities --no-owner --no-privileges -f "$root/db/auth-data.sql"
# Recuento de filas por tabla (solo números) para verificar la restauración.
"$PSQL" "$SUPABASE_DB_URL" -X -q -At -v ON_ERROR_STOP=1 -c "
  select format('%s.%s', n.nspname, c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where c.relkind='r' and (n.nspname='public' or (n.nspname='auth' and c.relname in ('users','identities')))
  order by 1" > "$work/tables.txt"
: > "$root/db/row-counts.tsv"
while read -r t; do
  [[ -n "$t" ]] || continue
  n="$("$PSQL" "$SUPABASE_DB_URL" -X -q -At -v ON_ERROR_STOP=1 -c "select count(*) from $t")"
  printf '%s\t%s\n' "$t" "$n" >> "$root/db/row-counts.tsv"
done < "$work/tables.txt"
log "Tablas volcadas: $(wc -l < "$root/db/row-counts.tsv")"

# --- Storage ---------------------------------------------------------------
files=0
if [[ -n "${SUPABASE_URL:-}" && -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  log "Exportando Storage…"
  hdr="$work/auth.hdr"; storage_auth_file "$hdr"
  api="${SUPABASE_URL%/}/storage/v1"
  curl -fsS -H @"$hdr" "$api/bucket" > "$root/storage/buckets.json"
  : > "$root/storage/manifest.tsv"
  list_dir() { # $1 bucket, $2 prefix ('' o 'carpeta/')
    local offset=0 page body
    while :; do
      body="$(jq -nc --arg p "$2" --argjson o "$offset" '{prefix:$p,limit:1000,offset:$o,sortBy:{column:"name",order:"asc"}}')"
      page="$(curl -fsS -H @"$hdr" -H 'Content-Type: application/json' -X POST "$api/object/list/$1" -d "$body")"
      local count; count="$(jq 'length' <<<"$page")"
      [[ "$count" -gt 0 ]] || break
      while IFS=$'\t' read -r oname oid mime; do
        if [[ "$oid" == "null" ]]; then list_dir "$1" "$2$oname/"
        else printf '%s\t%s\t%s\n' "$1" "$2$oname" "$mime" >> "$root/storage/manifest.tsv"; fi
      done < <(jq -r '.[] | [.name, (.id // "null"), (.metadata.mimetype // "application/octet-stream")] | @tsv' <<<"$page")
      [[ "$count" -lt 1000 ]] && break
      offset=$((offset + 1000))
    done
  }
  for b in $(jq -r '.[].id' "$root/storage/buckets.json"); do list_dir "$b" ""; done
  : > "$root/storage/checksums.tsv"
  while IFS=$'\t' read -r b p mime; do
    dest="$root/storage/objects/$b/$p"; mkdir -p "$(dirname "$dest")"
    curl -fsS -H @"$hdr" -o "$dest" "$api/object/$b/$(urlencode_path "$p")"
    printf '%s\t%s\t%s\n' "$b" "$p" "$(sha256sum "$dest" | cut -d' ' -f1)" >> "$root/storage/checksums.tsv"
    files=$((files + 1))
  done < "$root/storage/manifest.tsv"
  log "Ficheros de Storage exportados: $files (buckets: $(jq length "$root/storage/buckets.json"))"
else
  die "faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY para exportar Storage"
fi

printf 'created_at=%s\nformat=1\nstorage_files=%s\n' "$stamp" "$files" > "$root/BACKUP_INFO"

# --- Empaquetar, cifrar, subir ---------------------------------------------
tar -C "$work" -czf "$work/$name.tar.gz" "$name"
rm -rf "$root"
encrypt_file "$work/$name.tar.gz" "$work/$name.tar.gz.gpg"
rm -f "$work/$name.tar.gz"
put_backup "$work/$name.tar.gz.gpg"
log "Subido $name.tar.gz.gpg ($(du -h "$work/$name.tar.gz.gpg" | cut -f1)) a destino '$target'"

# --- Rotación ----------------------------------------------------------------
mapfile -t all < <(list_backups)
excess=$(( ${#all[@]} - KEEP ))
if (( excess > 0 )); then
  for old in "${all[@]:0:excess}"; do delete_backup "$old"; done
  log "Rotación: borrados $excess backups antiguos (se conservan $KEEP)"
fi
echo "$name.tar.gz.gpg"
