'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/translations';
import { Heart, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn } = useAuth();
    const router = useRouter();
    const { language } = useLanguage();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signIn(email, password);
        } catch (err: any) {
            console.error('Login error:', err);
            
            // Show user-friendly error messages
            if (err.message.includes('Supabase not configured')) {
                setError(
                    '⚠️ App Configuration Required\n\n' +
                    'This app needs to be connected to a Supabase backend. ' +
                    'Please contact the administrator to complete the setup.'
                );
            } else if (err.message.includes('Cannot connect')) {
                setError(
                    '🌐 Connection Error\n\n' +
                    'Cannot reach the authentication server. Please check your internet connection and try again.'
                );
            } else if (err.message.includes('Invalid login credentials')) {
                setError('Incorrect email or password. Please try again.');
            } else {
                setError(err.message || 'Failed to sign in. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-theme-page relative overflow-hidden flex items-center justify-center">
            {/* Animated Background - same style across all pages */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-48 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <Card className="w-full max-w-md mx-4 bg-slate-900/40 border-cyan-400/30 backdrop-blur-xl shadow-2xl hover-theme relative z-10">
                <CardHeader className="space-y-4 text-center">
                    <div className="mx-auto h-20 w-20 rounded-2xl bg-theme-gradient flex items-center justify-center shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-110 cursor-pointer group">
                        <Heart className="h-11 w-11 text-white group-hover:animate-pulse" />
                    </div>
                    <CardTitle className="text-4xl text-theme-gradient">
                        {t('login', language)}
                    </CardTitle>
                    <CardDescription className="text-blue-200/70 text-lg">
                        Welcome back to <span className="text-cyan-400 font-semibold text-xl">VitalQR</span>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-400/30 flex items-center gap-3 text-red-300 backdrop-blur-sm animate-in slide-in-from-top duration-300">
                                <AlertCircle className="h-6 w-6 flex-shrink-0" />
                                <span className="text-base">{error}</span>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-base font-medium text-cyan-300">
                                {t('email', language)}
                            </label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:ring-cyan-400/20 transition-all duration-300 h-12 text-base"
                                placeholder="your@email.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-base font-medium text-cyan-300">
                                {t('password', language)}
                            </label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:ring-cyan-400/20 transition-all duration-300 h-12 text-base"
                                placeholder="••••••••"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-theme-gradient hover:shadow-xl hover:shadow-cyan-500/50 text-xl h-14 text-white transition-all duration-300 transform hover:scale-105 font-semibold"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                    Signing in...
                                </span>
                            ) : (
                                t('login', language)
                            )}
                        </Button>

                        <div className="text-center text-base text-blue-200/70">
                            Don't have an account?{' '}
                            <Link href="/auth/signup" className="text-cyan-400 hover:text-cyan-300 font-semibold hover:underline transition-colors duration-200 text-lg">
                                {t('signup', language)}
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}