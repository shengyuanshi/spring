import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://hmfvdgjmagctwoumaghd.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtZnZkZ2ptYWdjdHdvdW1hZ2hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjAyOTAsImV4cCI6MjA4OTIzNjI5MH0.TsMKsGDSneOCI05rP0pN3-w0QNqNTiR-8BlO8MQ9fRo';

export const hasSupabaseAuthConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
