/**
 * Entorno de pruebas: Supabase LOCAL (supabase start). Las claves por defecto son las claves
 * de demostración públicas que genera Supabase CLI para el entorno local.
 * Resend SIEMPRE se simula (RESEND_BASE_URL apunta al servidor simulado).
 */
export const T = {
  supabaseUrl: process.env.TEST_SUPABASE_URL ?? 'http://127.0.0.1:54321',
  anonKey: process.env.TEST_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  serviceKey: process.env.TEST_SUPABASE_SERVICE_ROLE_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
  dbUrl: process.env.TEST_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  mailpitUrl: process.env.TEST_MAILPIT_URL ?? 'http://127.0.0.1:54324',
  resendMockPort: Number(process.env.RESEND_MOCK_PORT ?? 4599),
  appPort: Number(process.env.TEST_APP_PORT ?? 4322),
  tokenSecret: 'test-secret-for-cancel-links-0123456789abcdef',
  owner: 'owner@test.local',
  admin: { email: 'admin@test.local', password: 'Admin-Test-2026!' },
  user: { email: 'cliente@test.local', password: 'Cliente-Test-2026!' },
};

/** Variables para el servidor de la app en las pruebas (nunca la clave real de Resend). */
export const appEnv = (): Record<string, string> => ({
  PUBLIC_SUPABASE_URL: T.supabaseUrl,
  PUBLIC_SUPABASE_ANON_KEY: T.anonKey,
  SUPABASE_SERVICE_ROLE_KEY: T.serviceKey,
  PUBLIC_SITE_URL: `http://localhost:${T.appPort}`,
  BOOKING_TOKEN_SECRET: T.tokenSecret,
  RESEND_API_KEY: 're_test_mock_key',
  RESEND_BASE_URL: `http://127.0.0.1:${T.resendMockPort}`,
  EMAIL_FROM: 'La Ximenera <onboarding@resend.dev>',
  OWNER_NOTIFY_EMAIL: T.owner,
  BOOKING_RATE_LIMIT_MAX: '5',
  BOOKING_RATE_LIMIT_WINDOW_SECONDS: '600',
});
