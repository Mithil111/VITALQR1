import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Enhanced validation with helpful error messages
if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ SUPABASE CONFIGURATION ERROR');
    console.error('Missing environment variables. Please add to your .env file:');
    console.error('NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url');
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key');
}

// Create Supabase client with error handling
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
        },
    }
);

// Helper function to check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
    return Boolean(supabaseUrl && supabaseAnonKey && 
                   supabaseUrl !== 'https://placeholder.supabase.co' &&
                   supabaseAnonKey !== 'placeholder-key');
};