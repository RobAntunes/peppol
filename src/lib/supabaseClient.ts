import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail fast in development if Supabase is not configured correctly.
  // This prevents confusing runtime errors deeper in the app.
  throw new Error(
    'Supabase environment variables are not set. PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY are required.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

