/**
 * Configuración por variables de entorno (ver .env.example).
 * Se leen en tiempo de ejecución (process.env) con respaldo en import.meta.env (astro dev).
 */
const pe = (typeof process !== 'undefined' ? process.env : {}) as Record<string, string | undefined>;

export const env = {
  get supabaseUrl() { return pe.PUBLIC_SUPABASE_URL ?? import.meta.env.PUBLIC_SUPABASE_URL ?? ''; },
  get supabaseAnonKey() { return pe.PUBLIC_SUPABASE_ANON_KEY ?? import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? ''; },
  get supabaseServiceRoleKey() { return pe.SUPABASE_SERVICE_ROLE_KEY ?? import.meta.env.SUPABASE_SERVICE_ROLE_KEY ?? ''; },
  get resendApiKey() { return pe.RESEND_API_KEY ?? import.meta.env.RESEND_API_KEY ?? ''; },
  /** Solo para pruebas: apunta el SDK de Resend a un servidor simulado. */
  get resendBaseUrl() { return pe.RESEND_BASE_URL ?? import.meta.env.RESEND_BASE_URL ?? ''; },
  get ownerNotifyEmail() { return pe.OWNER_NOTIFY_EMAIL ?? import.meta.env.OWNER_NOTIFY_EMAIL ?? 'luisbalaguer97@gmail.com'; },
  get emailFrom() { return pe.EMAIL_FROM ?? import.meta.env.EMAIL_FROM ?? 'La Ximenera <onboarding@resend.dev>'; },
  get emailReplyTo() { return pe.EMAIL_REPLY_TO ?? import.meta.env.EMAIL_REPLY_TO ?? ''; },
  get siteUrl() { return (pe.PUBLIC_SITE_URL ?? import.meta.env.PUBLIC_SITE_URL ?? '').replace(/\/$/, ''); },
  get bookingTokenSecret() { return pe.BOOKING_TOKEN_SECRET ?? import.meta.env.BOOKING_TOKEN_SECRET ?? ''; },
  get rateLimitMax() { return Number(pe.BOOKING_RATE_LIMIT_MAX ?? import.meta.env.BOOKING_RATE_LIMIT_MAX ?? 5); },
  get rateLimitWindowSeconds() { return Number(pe.BOOKING_RATE_LIMIT_WINDOW_SECONDS ?? import.meta.env.BOOKING_RATE_LIMIT_WINDOW_SECONDS ?? 600); },
};

export const hasSupabase = () => Boolean(env.supabaseUrl && env.supabaseAnonKey);
