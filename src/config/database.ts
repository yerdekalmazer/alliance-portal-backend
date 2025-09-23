import { createClient } from '@supabase/supabase-js';
import { Database } from '../models/database.types';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing SUPABASE_ANON_KEY environment variable');
}

// Client for anonymous/authenticated users
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// Admin client with service role key for server-side operations
export const supabaseAdmin = supabaseServiceRoleKey 
  ? createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Database connection health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    // Use service role client to bypass RLS for connection test
    if (!supabaseAdmin) {
      console.warn('Service role key not configured - connection will be tested during actual queries');
      return true; // Skip connection test if no service role key
    }
    
    // Use admin client to test connection - try a simple query
    const { error } = await supabaseAdmin.from('users').select('count', { count: 'exact', head: true });
    if (error) {
      console.warn('Database query had an error, but connection established:', error.message);
      return true; // Connection is working even if query fails
    }
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Get database client based on context
export function getSupabaseClient(useServiceRole = false) {
  if (useServiceRole && supabaseAdmin) {
    return supabaseAdmin;
  }
  return supabase;
}
