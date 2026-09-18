import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project') &&
  supabaseUrl.startsWith('https://')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

/**
 * Checks live connection to Supabase database
 */
export async function testSupabaseConnection(): Promise<{ connected: boolean; message: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      connected: false,
      message: 'Supabase credentials not configured in environment (operating in local persistent mode).',
    };
  }

  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error) {
      return {
        connected: false,
        message: `Connected to Supabase endpoint, but table query returned: ${error.message}`,
      };
    }
    return {
      connected: true,
      message: 'Successfully connected to live Supabase PostgreSQL database.',
    };
  } catch (err: any) {
    return {
      connected: false,
      message: `Connection failed: ${err?.message || 'Unknown network error'}`,
    };
  }
}
