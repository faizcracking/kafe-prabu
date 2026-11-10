// Supabase dengan SERVICE ROLE KEY (melewati RLS). HANYA boleh diimpor di file server (app/api/*).
// Jangan pernah mengimpor file ini dari komponen "use client".
import { createClient } from '@supabase/supabase-js';

export function supabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
