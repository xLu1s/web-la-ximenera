#!/usr/bin/env bash
# Prueba REAL de backup + restauración contra el stack local de Supabase (supabase start).
#  1. Crea datos de prueba (reservas, vino, ficheros en Storage) y toma una "foto" del estado.
#  2. backup.sh -> archivo cifrado en un destino S3 compatible local (moto_server) o, si no hay
#     AWS CLI + moto, en una carpeta local. Comprueba cifrado, clave incorrecta y rotación.
#  3. Base de datos nueva (supabase db reset) y Storage vacío.
#  4. restore.sh latest -> compara recuentos de filas y checksums de cada fichero.
# Solo usa el stack LOCAL y claves de demo locales; nada sale de la máquina.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
log() { printf '\n=== %s\n' "$*"; }
fail() { echo "FALLO: $*" >&2; exit 1; }

DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
export SUPABASE_URL="http://127.0.0.1:54321"
# Clave service_role de DEMO del stack local (la misma para todas las instalaciones locales).
SUPABASE_SERVICE_ROLE_KEY="$(supabase status -o env 2>/dev/null | sed -n 's/^SERVICE_ROLE_KEY="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p')"
[[ -n "$SUPABASE_SERVICE_ROLE_KEY" ]] || SUPABASE_SERVICE_ROLE_KEY="$(sed -n 's/^SUPABASE_SERVICE_ROLE_KEY=//p' .env)"
export SUPABASE_SERVICE_ROLE_KEY
[[ "$SUPABASE_URL" == http://127.0.0.1:* ]] || fail "solo contra el stack local"
psql "$DB_URL" -X -q -c 'select 1' >/dev/null || fail "arranca antes el stack local: supabase start"

export SUPABASE_DB_URL="$DB_URL" RESTORE_DB_URL="$DB_URL"
export BACKUP_ENCRYPTION_KEY="clave-de-prueba-local-$(date +%s)-$RANDOM"
tmp="$(mktemp -d)"; moto_pid=""
cleanup() { [[ -n "$moto_pid" ]] && kill "$moto_pid" 2>/dev/null || true; rm -rf "$tmp"; }
trap cleanup EXIT
MARK="RESTORE-TEST-$RANDOM$RANDOM"
q() { psql "$DB_URL" -X -q -At -v ON_ERROR_STOP=1 -c "$1"; }
auth=(-H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY")

snapshot() { # $1 = fichero de salida
  {
    q "select 'public.'||tablename from pg_tables where schemaname='public' order by 1" | while read -r t; do
      printf '%s\t%s\n' "$t" "$(q "select count(*) from $t")"; done
    printf 'auth.users\t%s\n' "$(q 'select count(*) from auth.users')"
    printf 'marker_bookings\t%s\n' "$(q "select count(*) from public.bookings where notes like '$MARK%'")"
    printf 'marker_wines\t%s\n' "$(q "select count(*) from public.wines where name like '$MARK%'")"
    q "select bucket_id||'/'||name from storage.objects order by 1" | while read -r o; do
      enc="$(jq -rn --arg p "$o" '$p | split("/") | map(@uri) | join("/")')"
      curl -fsS "${auth[@]}" -o "$tmp/obj" "$SUPABASE_URL/storage/v1/object/$enc" || fail "no se pudo descargar $o"
      printf 'file %s\t%s\n' "$o" "$(sha256sum "$tmp/obj" | cut -d' ' -f1)"; done
  } > "$1"
}

log "1. Datos de prueba"
q "insert into public.wines (name, wine_type, origin, price_bottle, visible) values ('$MARK vino', 'tinto', 'D.O. Prueba', 20, true)"
for i in 1 2 3; do
  q "insert into public.bookings (reference, day, service, booking_time, starts_at, party_size, name, phone, email, notes, status, consent_at, privacy_version)
     values ('LX-T$i$RANDOM', date '2032-01-06', 'cena', time '21:00', timestamptz '2032-01-06 21:00+01', $i, 'Prueba $i', '600000000', 'p$i@test.local', '$MARK nota', 'confirmada', now(), 'test')"
done
curl -fsS "${auth[@]}" -H 'Content-Type: application/json' -X POST "$SUPABASE_URL/auth/v1/admin/users" \
  -d "{\"email\":\"restore-$RANDOM@test.local\",\"password\":\"Restore-Test-2026!\",\"email_confirm\":true}" >/dev/null
head -c 20000 /dev/urandom > "$tmp/a.bin"; head -c 3000 /dev/urandom > "$tmp/b.bin"
curl -fsS "${auth[@]}" -H 'Content-Type: image/png' -H 'x-upsert: true' --data-binary @"$tmp/a.bin" "$SUPABASE_URL/storage/v1/object/media/galeria/$MARK-a.png" >/dev/null
curl -fsS "${auth[@]}" -H 'Content-Type: video/mp4' -H 'x-upsert: true' --data-binary @"$tmp/b.bin" "$SUPABASE_URL/storage/v1/object/media/menus/sub%20carpeta/$MARK%20b.mp4" >/dev/null
snapshot "$tmp/before.tsv"
grep -q $'^marker_bookings\t3$' "$tmp/before.tsv" || fail "no se crearon las reservas de prueba"
grep -q "^file media/menus/sub carpeta/$MARK b.mp4"$'\t'"$(sha256sum "$tmp/b.bin" | cut -d' ' -f1)\$" "$tmp/before.tsv" || fail "checksum de Storage inesperado"
[[ "$(sed -n 's/^auth.users\t//p' "$tmp/before.tsv")" -ge 1 ]] || fail "no hay usuarios de Auth de prueba"
echo "Tablas: $(grep -c '^public\.' "$tmp/before.tsv") · ficheros en Storage: $(grep -c '^file ' "$tmp/before.tsv")"

log "2. Backup cifrado"
if command -v "${AWS_CLI:-aws}" >/dev/null && command -v moto_server >/dev/null; then
  port=4599; port=$((port + 1))
  moto_server -H 127.0.0.1 -p "$port" >"$tmp/moto.log" 2>&1 & moto_pid=$!
  for _ in $(seq 50); do curl -fsS "http://127.0.0.1:$port/" >/dev/null 2>&1 && break; sleep 0.2; done
  export BACKUP_S3_ENDPOINT="http://127.0.0.1:$port" BACKUP_S3_BUCKET="backups-test" BACKUP_S3_REGION="us-east-1"
  export BACKUP_S3_ACCESS_KEY_ID="test" BACKUP_S3_SECRET_ACCESS_KEY="test"
  AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION=us-east-1 \
    "${AWS_CLI:-aws}" s3api create-bucket --endpoint-url "$BACKUP_S3_ENDPOINT" --bucket "$BACKUP_S3_BUCKET" >/dev/null
  echo "Destino: S3 compatible local (moto_server en :$port)"
else
  export BACKUP_DIR="$tmp/destino"; echo "Destino: carpeta local (no hay AWS CLI + moto_server)"
fi
export BACKUP_KEEP=2
for i in 1 2 3; do scripts/backup.sh > "$tmp/name.txt"; sleep 1.1; done
# shellcheck source=lib/backup-common.sh
source scripts/lib/backup-common.sh
mapfile -t kept < <(list_backups)
[[ ${#kept[@]} -eq 2 ]] || fail "rotación: se esperaban 2 backups, hay ${#kept[@]}"
[[ "${kept[1]}" == "$(cat "$tmp/name.txt")" ]] || fail "el más reciente no se ha conservado"
echo "Rotación OK (BACKUP_KEEP=2 tras 3 backups -> ${#kept[@]})"
get_backup "${kept[1]}" "$tmp/check.gpg"
grep -aq "$MARK" "$tmp/check.gpg" && fail "el archivo subido contiene texto en claro"
gzip -t "$tmp/check.gpg" 2>/dev/null && fail "el archivo subido no está cifrado"
( BACKUP_ENCRYPTION_KEY="clave-incorrecta" decrypt_file "$tmp/check.gpg" "$tmp/x" ) 2>/dev/null && fail "descifra con una clave incorrecta"
echo "Cifrado OK (sin texto en claro; clave incorrecta rechazada)"

log "3. Base de datos y Storage nuevos"
supabase db reset >/dev/null 2>&1 || fail "supabase db reset"
for _ in $(seq 60); do curl -fsS "${auth[@]}" "$SUPABASE_URL/storage/v1/bucket" >/dev/null 2>&1 && break; sleep 1; done
snapshot "$tmp/wiped.tsv"
grep -q $'^marker_bookings\t0$' "$tmp/wiped.tsv" || fail "la base de datos no se ha vaciado"
[[ "$(grep -c '^file ' "$tmp/wiped.tsv" || true)" == 0 ]] || fail "Storage no está vacío"
echo "Destino vacío: reservas de prueba 0 · ficheros 0"

log "4. Restauración"
scripts/restore.sh latest --yes
snapshot "$tmp/after.tsv"
if ! diff -u "$tmp/before.tsv" "$tmp/after.tsv"; then fail "el estado restaurado no coincide"; fi
echo "Verificado: $(grep -c '^public\.' "$tmp/after.tsv") tablas con los mismos recuentos, auth.users $(sed -n 's/^auth.users\t//p' "$tmp/after.tsv"), $(grep -c '^file ' "$tmp/after.tsv") ficheros con el mismo SHA-256"

log "Limpieza de los datos de prueba"
supabase db reset >/dev/null 2>&1 || true
echo "BACKUP/RESTORE OK"
