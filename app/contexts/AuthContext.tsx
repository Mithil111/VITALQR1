'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signUp: (email: string, password: string, fullName: string) => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Check initial session - optimized for speed
        const checkSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error) {
                    console.error('Session check error:', error);
                    setUser(null);
                } else {
                    setUser(session?.user ?? null);
                }
            } catch (err) {
                console.error('Failed to check session:', err);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        
        checkSession();

        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setUser(session?.user ?? null);

                if (event === 'SIGNED_IN') {
                    // Only redirect if not already on a protected page
                    const publicPaths = ['/', '/auth/login', '/auth/signup'];
                    if (publicPaths.includes(pathname)) {
                        router.push('/dashboard');
                    }
                } else if (event === 'SIGNED_OUT') {
                    router.push('/');
                }

                setLoading(false);
            }
        );

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [router, pathname]);

    const signUp = async (email: string, password: string, fullName: string) => {
        // Check if Supabase is configured
        if (!isSupabaseConfigured()) {
            throw new Error(
                '⚠️ Supabase not configured. Please add your Supabase credentials to the .env file.\n\n' +
                'Create a .env file with:\n' +
                'NEXT_PUBLIC_SUPABASE_URL=your_project_url\n' +
                'NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key\n\n' +
                'Get these from: https://supabase.com/dashboard → Your Project → Settings → API'
            );
        }

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    },
                },
            });

            if (error) {
                // Provide user-friendly error messages
                if (error.message.includes('Failed to fetch')) {
                    throw new Error(
                        'Cannot connect to authentication server. Please check:\n' +
                        '1. Your internet connection\n' +
                        '2. Supabase credentials in .env file\n' +
                        '3. That your Supabase project is active'
                    );
                }
                throw error;
            }

            return data;
        } catch (err: any) {
            console.error('Signup error:', err);
            throw err;
        }
    };

    const signIn = async (email: string, password: string) => {
        if (!isSupabaseConfigured()) {
            throw new Error(
                '⚠️ Supabase not configured. Please add your Supabase credentials to the .env file.'
            );
        }

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                if (error.message.includes('Failed to fetch')) {
                    throw new Error(
                        'Cannot connect to authentication server. Please check your internet connection and Supabase configuration.'
                    );
                }
                throw error;
            }

            return data;
        } catch (err: any) {
            console.error('Sign in error:', err);
            throw err;
        }
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo(
        () => ({ user, loading, signUp, signIn, signOut }),
        [user, loading]
    );

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}