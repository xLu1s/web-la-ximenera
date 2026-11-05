# Funciones comunes de backup.sh / restore.sh. No imprime nunca datos ni secretos.
# shellcheck shell=bash

log() { printf '[%s] %s\n' "$(date -u +%H:%M:%S)" "$*" >&2; }
die() { log "ERROR: $*"; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || die "falta el comando '$1'"; }

# Destino: S3 compatible si hay BACKUP_S3_BUCKET; si no, carpeta local BACKUP_DIR.
backup_target() {
  if [[ -n "${BACKUP_S3_BUCKET:-}" ]]; then echo s3
  elif [[ -n "${BACKUP_DIR:-}" ]]; then echo dir
  else die "define BACKUP_S3_BUCKET (+ BACKUP_S3_ENDPOINT y claves) o BACKUP_DIR"; fi
}

s3_env() {
  [[ -n "${BACKUP_S3_ENDPOINT:-}" ]] || die "falta BACKUP_S3_ENDPOINT"
  [[ -n "${BACKUP_S3_ACCESS_KEY_ID:-}" && -n "${BACKUP_S3_SECRET_ACCESS_KEY:-}" ]] || die "faltan BACKUP_S3_ACCESS_KEY_ID / BACKUP_S3_SECRET_ACCESS_KEY"
  export AWS_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY_ID"
  export AWS_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_ACCESS_KEY"
  export AWS_DEFAULT_REGION="${BACKUP_S3_REGION:-auto}"   # R2 usa la región "auto"
  # Recomendado por Cloudflare para el AWS CLI reciente con R2.
  export AWS_REQUEST_CHECKSUM_CALCULATION=when_required
  export AWS_RESPONSE_CHECKSUM_VALIDATION=when_required
  export AWS_PAGER=""
}

PREFIX="${BACKUP_PREFIX:-la-ximenera/}"
AWS="${AWS_CLI:-aws}"

# Lista (ordenada, más antiguo primero) los nombres de backup del destino.
list_backups() {
  case "$(backup_target)" in
    s3) s3_env
        "$AWS" s3api list-objects-v2 --endpoint-url "$BACKUP_S3_ENDPOINT" --bucket "$BACKUP_S3_BUCKET" \
          --prefix "$PREFIX" --query 'Contents[].Key' --output text 2>/dev/null \
          | tr '\t' '\n' | grep -E 'la-ximenera-backup-[0-9TZ-]+\.tar\.gz\.gpg$' | sed "s#^$PREFIX##" | sort || true ;;
    dir) ls -1 "$BACKUP_DIR" 2>/dev/null | grep -E '^la-ximenera-backup-[0-9TZ-]+\.tar\.gz\.gpg$' | sort || true ;;
  esac
}

put_backup() { # $1 = fichero local cifrado
  local name; name="$(basename "$1")"
  case "$(backup_target)" in
    s3) s3_env; "$AWS" s3 cp --only-show-errors --endpoint-url "$BACKUP_S3_ENDPOINT" "$1" "s3://$BACKUP_S3_BUCKET/$PREFIX$name" ;;
    dir) mkdir -p "$BACKUP_DIR"; install -m 600 "$1" "$BACKUP_DIR/$name" ;;
  esac
}

get_backup() { # $1 = nombre, $2 = destino local
  case "$(backup_target)" in
    s3) s3_env; "$AWS" s3 cp --only-show-errors --endpoint-url "$BACKUP_S3_ENDPOINT" "s3://$BACKUP_S3_BUCKET/$PREFIX$1" "$2" ;;
    dir) cp "$BACKUP_DIR/$1" "$2" ;;
  esac
}

delete_backup() { # $1 = nombre
  case "$(backup_target)" in
    s3) s3_env; "$AWS" s3 rm --only-show-errors --endpoint-url "$BACKUP_S3_ENDPOINT" "s3://$BACKUP_S3_BUCKET/$PREFIX$1" ;;
    dir) rm -f "$BACKUP_DIR/$1" ;;
  esac
}

# Cifrado simétrico AES256 con gpg; la clave entra por un descriptor, nunca por argv.
encrypt_file() { # $1 in, $2 out
  [[ -n "${BACKUP_ENCRYPTION_KEY:-}" ]] || die "falta BACKUP_ENCRYPTION_KEY"
  gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-fd 3 \
      --symmetric --cipher-algo AES256 --s2k-digest-algo SHA512 --s2k-count 65011712 \
      -o "$2" "$1" 3<<<"$BACKUP_ENCRYPTION_KEY"
}
decrypt_file() { # $1 in, $2 out
  [[ -n "${BACKUP_ENCRYPTION_KEY:-}" ]] || die "falta BACKUP_ENCRYPTION_KEY"
  gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-fd 3 \
      -o "$2" --decrypt "$1" 3<<<"$BACKUP_ENCRYPTION_KEY"
}

# Cabecera de autenticación para la API de Storage en un fichero (no en argv).
storage_auth_file() { # $1 = fichero
  [[ -n "${SUPABASE_URL:-}" && -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]] || die "faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"
  umask 077
  printf 'Authorization: Bearer %s\napikey: %s\n' "$SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY" > "$1"
}

urlencode_path() { jq -rn --arg p "$1" '$p | split("/") | map(@uri) | join("/")'; }
