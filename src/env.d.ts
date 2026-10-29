/// <reference types="astro/client" />
declare namespace App {
  interface Locals {
    lang?: 'es' | 'en';
    adminLang?: 'es' | 'zh';
    supabase: import('@supabase/supabase-js').SupabaseClient;
    user: import('@supabase/supabase-js').User | null;
    isAdmin: boolean;
  }
}
