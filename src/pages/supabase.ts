import { createClient } from '@supabase/supabase-js';

// In Vite, use import.meta.env instead of process.env
// Variables must be prefixed with VITE_
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Only initialize if the URL and Key are provided
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;