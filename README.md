# web-la-ximenera

Web del restaurante **La Ximenera** (Alcoi / Alcoy) con reservas online y panel de administración.

- **Astro 7** con salida de servidor en **Vercel** (`@astrojs/vercel`). Las páginas legales se prerenderizan;
  la portada, la API, la cancelación y `/admin` se sirven en servidor.
- **Supabase**: Postgres (contenido y reservas), Auth (email + contraseña del panel) y Storage (fotos y vídeos).
- **Resend**: emails de confirmación al cliente y aviso al propietario.

> La demo antigua de GitHub Pages ya no sirve: Pages solo publica estáticos y la web ahora necesita servidor.
> Se ha quitado el `base` `/web-la-ximenera` y el workflow `deploy.yml`.

## Qué incluye

| Parte pública | Panel `/admin` |
| --- | --- |
| Carta desde la base de datos (alérgenos, medias raciones) | **Reservas** por día y servicio, ocupación, cancelar, bloquear días/servicios, aforo |
| Carta de vinos (o «Nuestra carta de vinos estará disponible muy pronto») | **Carta**: categorías y platos (orden, visible, precio, alérgenos) |
| Menús especiales destacados por fechas + menú del día | **Vinos**: tipo, D.O., precio botella/copa, visible |
| Galería de fotos y vídeos | **Menús especiales**: platos, precio, imagen, fechas de visibilidad |
| Formulario de reserva (único CTA «Reservar») y teléfono como alternativa | **Galería**: subir (validación de tipo y tamaño), orden, pie, visible |
| Enlace de cancelación firmado en el email | **Horarios y ajustes**: horario por día, días cerrados, aforo, tamaño máximo de grupo |
| Privacidad, aviso legal y cookies (con marcadores para los datos fiscales) | Login, salir y recuperación de contraseña |

### Reglas de reserva

- Servicios: **comida** (tramo de mediodía) y **cena** (tramo de noche) de cada día de la semana, según el horario
  configurado. Día sin tramos = cerrado.
- Horas reservables: cada 15 min desde la apertura hasta **60 min antes del cierre** (configurable en Ajustes).
- Aforo: **80 personas por servicio** y día (configurable por servicio o por fecha). Grupo de 1 a 12.
- Se aceptan automáticamente si cabe. La comprobación de aforo se hace en una función de Postgres con bloqueo
  (`pg_advisory_xact_lock` por día y servicio), así que dos reservas simultáneas nunca superan el aforo.
- Fechas en horario de Madrid (cambios de hora incluidos). No se aceptan fechas pasadas, días cerrados, bloqueados
  ni horas fuera de horario.
- Anti-spam: campo trampa (honeypot) y límite de 5 envíos cada 10 min por IP (configurable).
- Cada reserva recibe una referencia `LX-XXXXXX` y un enlace de cancelación firmado (HMAC).

## Desarrollo local

Requisitos: Node.js >= 22.12 (en CI se usa 22.23.4), Docker y [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started).

```bash
npm ci
supabase start            # Postgres + Auth + Storage + Mailpit en local, aplica supabase/migrations
cp .env.example .env      # y rellena con lo que muestra `supabase status`
npm run dev               # http://localhost:4321
```

Para entrar en el panel en local, crea un usuario en Auth (Studio local o `supabase` API) con un email que esté en
la tabla `admins` (la migración inserta `luisbalaguer97@gmail.com`). Los emails de Auth (recuperar contraseña) se ven
en Mailpit: http://127.0.0.1:54324.

Contenido inicial: `supabase/migrations/20261023000400_seed_content.sql` se genera con `npm run seed:generate`
a partir de `src/data/*` (carta, menú del día, horario y galería). Esos ficheros siguen siendo la reserva estática
si Supabase no responde.

## Tests

Todo corre contra el stack **local** de Supabase. Resend **siempre** está simulado (`tests/mocks/resend-mock.mjs`).

```bash
supabase start
npm test             # Vitest: unitarios + integración (funciones SQL, concurrencia, RLS)
npx playwright install chromium
npm run test:e2e     # Playwright: formulario, API, panel, móvil
npm run test:backup  # backup -> cifrado -> destino -> restauración en BD nueva -> verificación
```

El workflow `.github/workflows/ci.yml` ejecuta las tres cosas en cada push y PR.

## Variables de entorno

Ver `.env.example`. En Vercel (Settings → Environment Variables):

| Variable | Para qué |
| --- | --- |
| `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` | Cliente de Supabase (la anon key es pública; la protege RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor: crear reservas, subir ficheros. **Nunca** al navegador |
| `PUBLIC_SITE_URL` | URL pública (enlaces de los emails, canonical) |
| `BOOKING_TOKEN_SECRET` | Firma de los enlaces de cancelación (`openssl rand -hex 32`) |
| `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_NOTIFY_EMAIL`, `EMAIL_REPLY_TO` | Emails |
| `BOOKING_RATE_LIMIT_MAX`, `BOOKING_RATE_LIMIT_WINDOW_SECONDS` | Anti-spam (opcional) |

**Resend**: mientras no haya un dominio verificado, `EMAIL_FROM` debe ser `onboarding@resend.dev` y Resend
**solo entrega al email del dueño de la cuenta** (luisbalaguer97@gmail.com): los clientes no recibirían su
confirmación. Hay que verificar un dominio propio en Resend (registros DNS) y cambiar `EMAIL_FROM`.

## Puesta en producción

1. **Supabase**: crear el proyecto (región UE), y desde este repo:
   `supabase link --project-ref <ref>` y `supabase db push` (aplica todas las migraciones, incluido el contenido).
2. **Auth**: Authentication → Users → *Add user* con `luisbalaguer97@gmail.com` y contraseña.
   En Authentication → URL Configuration: *Site URL* = `PUBLIC_SITE_URL` y añadir
   `PUBLIC_SITE_URL/admin/nueva-clave` a *Redirect URLs*. Desactivar el registro público (*Allow new users to sign up*).
   El SMTP por defecto de Supabase es solo para pruebas; para los emails de recuperación conviene configurar
   SMTP propio (por ejemplo el de Resend).
3. **Vercel**: importar el repositorio (framework Astro detectado), poner las variables y desplegar.
   Ojo: el plan Hobby de Vercel es solo para uso **personal y no comercial**
   ([docs](https://vercel.com/docs/plans/hobby)); la web de un restaurante es uso comercial, así que
   corresponde el plan Pro.
4. **Resend**: verificar el dominio y cambiar `EMAIL_FROM`.
5. Rellenar los datos fiscales de `src/data/legal.ts` (titular, NIF, domicilio) antes de publicar.

## Backups (preparados, NO activados)

Supabase Free **no incluye backups automáticos** ([precios](https://supabase.com/pricing)), así que hay un
sistema propio. Está todo preparado pero **no se ejecuta en ningún sitio** hasta activarlo a mano:

- `docs/backups/backup.yml` y `docs/backups/keepalive.yml` son **plantillas**: no están en `.github/workflows/`,
  GitHub no las ejecuta. Además, el `schedule` está comentado (solo `workflow_dispatch`) y, si faltan los secretos,
  el job termina sin hacer nada.
- No hay secretos, datos de clientes ni volcados en el repositorio.

### Cómo funciona

`scripts/backup.sh`:

1. `pg_dump` del esquema `public` (estructura y datos) y de los usuarios de Auth (`auth.users`, `auth.identities`),
   más un recuento de filas por tabla.
2. Descarga **todos los buckets** de Storage con la service role key (lista recursiva + checksum SHA-256).
3. Empaqueta en `la-ximenera-backup-AAAAMMDDTHHMMSSZ.tar.gz` y lo **cifra** con `gpg` (AES256, clave
   `BACKUP_ENCRYPTION_KEY`, pasada por descriptor, nunca en la línea de comandos).
4. Lo sube a un almacenamiento S3 compatible (por defecto **Cloudflare R2**, nunca al propio Supabase) con el
   AWS CLI, o a una carpeta (`BACKUP_DIR`) para uso local.
5. Conserva los **30** más recientes (`BACKUP_KEEP`) y borra los demás.

Los ficheros en claro solo existen en un directorio temporal `0700` que se borra al terminar. No se suben artefactos
de GitHub ni se imprime ningún dato.

`scripts/restore.sh latest --yes` (o un nombre/ruta concreta) descarga, descifra, vacía las tablas de `public` y los
usuarios de Auth del destino, carga los datos con `session_replication_role = replica`, comprueba los recuentos de
filas y vuelve a subir los ficheros a Storage (crea los buckets si faltan).

### Prueba de restauración (real, local)

`npm run test:backup` (`scripts/test-backup-restore.sh`) usa el stack local: crea reservas, un vino, un usuario de
Auth y ficheros en Storage; hace 3 backups a un S3 local simulado (`moto_server`; si no está, a una carpeta) con
`BACKUP_KEEP=2`; comprueba la rotación, que el archivo no contiene texto en claro y que una clave incorrecta no
descifra; **reinicia la base de datos** (`supabase db reset`) y vacía Storage; restaura y compara recuentos de todas
las tablas y el SHA-256 de cada fichero. Se ejecuta también en CI.

### Activación (cuando se decida)

1. **Repositorio privado** (recomendado, p. ej. `xLu1s/la-ximenera-backups`): copia `docs/backups/backup.yml` y
   `docs/backups/keepalive.yml` a `.github/workflows/`. Los scripts se descargan del repo público de la web: crea la
   variable de repositorio `LX_SCRIPTS_REPO = xLu1s/web-la-ximenera` (y opcionalmente `LX_SCRIPTS_REF` con un tag
   o commit fijo). También funciona en este mismo repo sin esa variable.
2. **Cloudflare R2**: crear un bucket (p. ej. `la-ximenera-backups`) y un *API token* de R2 con permiso
   *Object Read & Write* limitado a ese bucket. El endpoint es `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.
3. **Secretos de GitHub** (Settings → Secrets and variables → Actions):
   - `SUPABASE_DB_URL`: cadena **Session pooler** del botón *Connect* de Supabase (puerto 5432). Los runners de
     GitHub solo tienen IPv4 y la conexión directa de Supabase es IPv6
     ([docs](https://supabase.com/docs/guides/database/connecting-to-postgres)).
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` (esta última solo para el keep-alive).
   - `BACKUP_ENCRYPTION_KEY`: frase larga aleatoria (`openssl rand -base64 48`). **Guárdala también fuera de
     GitHub** (gestor de contraseñas): sin ella los backups no se pueden descifrar.
   - `BACKUP_S3_ENDPOINT`, `BACKUP_S3_BUCKET`, `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY`.
4. Lanzar el workflow a mano una vez (pestaña Actions → *Backup Supabase* → *Run workflow*) y comprobar el fichero
   en R2.
5. **Activar el cron**: descomentar las líneas `schedule:` de los dos workflows (backup diario, keep-alive cada
   3 días) y hacer commit.

### Restaurar paso a paso

1. Tener un proyecto Supabase destino con las migraciones aplicadas (`supabase db push`). Si es uno nuevo,
   el bucket lo crea el script si falta.
2. En un equipo con `psql`/`pg_dump` 17, `gpg`, `curl`, `jq` y AWS CLI:
   ```bash
   export RESTORE_DB_URL='postgresql://...'            # cadena del proyecto DESTINO
   export SUPABASE_URL='https://<ref>.supabase.co' SUPABASE_SERVICE_ROLE_KEY='...'
   export BACKUP_ENCRYPTION_KEY='...'
   export BACKUP_S3_ENDPOINT='https://<ACCOUNT_ID>.r2.cloudflarestorage.com' BACKUP_S3_BUCKET='la-ximenera-backups'
   export BACKUP_S3_ACCESS_KEY_ID='...' BACKUP_S3_SECRET_ACCESS_KEY='...'
   scripts/restore.sh latest --yes      # o: scripts/restore.sh la-ximenera-backup-20261101T031700Z.tar.gz.gpg --yes
   ```
   Opciones: `--skip-auth` (no toca los usuarios), `--skip-storage`. También acepta la ruta de un fichero local.
3. El script verifica los recuentos de filas; revisar la web y el panel.

### Coste: 0 €

Comprobado en la documentación oficial (octubre de 2026):

- **Cloudflare R2**, plan gratuito mensual: 10 GB-mes de almacenamiento estándar, 1 millón de operaciones clase A
  y 10 millones de clase B; borrar es gratis y la salida de datos no se cobra
  ([R2 pricing](https://developers.cloudflare.com/r2/pricing/)). Hay que usar la clase *Standard* (el plan gratuito
  no cubre *Infrequent Access*). 30 backups de una web así ocupan muy por debajo de 10 GB (el de prueba, ~40 KB más
  las fotos), y cada backup son unas pocas operaciones. Para activar R2 hay que completar el alta de la
  suscripción de R2 en el panel de Cloudflare ([Get started](https://developers.cloudflare.com/r2/get-started/));
  es de pago por uso, así que lo que exceda el plan gratuito se cobraría al método de pago de la cuenta
  ([billing policy](https://developers.cloudflare.com/billing/understand/billing-policy/)).
- **GitHub Actions**: gratis e ilimitado en repos **públicos** con runners estándar; en repos **privados** de una
  cuenta GitHub Free hay 2.000 minutos/mes incluidos y, sin método de pago, al agotarlos se bloquea en vez de cobrar
  ([billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)). Un backup diario de pocos
  minutos más el keep-alive quedan muy por debajo. En repos públicos, GitHub **desactiva los workflows programados
  tras 60 días sin actividad** en el repo
  ([docs](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows)); hay que
  vigilarlo si se usa el repo público.
- **Supabase Free**: los proyectos se **pausan tras 1 semana de inactividad**
  ([Project Pausing](https://supabase.com/docs/guides/platform/free-project-pausing)); de ahí el keep-alive (y el
  propio backup diario genera actividad). Límites: 500 MB de base de datos y 1 GB de Storage por proyecto, 5 GB de
  egress ([billing](https://supabase.com/docs/guides/platform/billing-on-supabase)). Bajar los backups cuenta como
  egress, de sobra para este tamaño.

## Estructura

- `src/pages/`: web, `api/` (reservas, disponibilidad, subida de ficheros del panel), `admin/`, `reserva/cancelar`.
- `src/lib/`: lógica (horarios, zona horaria de Madrid, validación, emails, tokens, Supabase).
- `supabase/migrations/`: esquema, funciones de reserva, RLS y Storage, contenido inicial.
- `tests/`: unitarios, integración y E2E. `scripts/`: seed, backup y restauración.
