'use client';

import { useEffect, useState, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/translations';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import {
    Heart,
    User,
    QrCode,
    Shield,
    Activity,
    AlertCircle,
    Phone,
    FileText,
    Clock,
    LogOut,
    Edit,
    Plus,
    Download,
    MessageSquare,
    Sparkles,
    CheckCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import type { Profile, MedicalCondition, Allergy, Medication, EmergencyContact } from '@/lib/types';

// Memoized stat card component for better performance
const StatCard = memo(({ count, label, icon: Icon, gradient }: any) => (
    <Card className="bg-slate-900/40 border-cyan-400/30 backdrop-blur-xl hover-theme cursor-pointer transform hover:scale-105">
        <CardContent className="p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-cyan-300/70 text-sm mb-1">{label}</p>
                    <p className="text-3xl font-bold text-white">{count}</p>
                </div>
                <div className={`h-14 w-14 rounded-xl ${gradient} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-7 w-7" />
                </div>
            </div>
        </CardContent>
    </Card>
));
StatCard.displayName = 'StatCard';

export default function DashboardPage() {
    const { user, signOut, loading: authLoading } = useAuth();
    const router = useRouter();
    const { language } = useLanguage();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [conditions, setConditions] = useState<MedicalCondition[]>([]);
    const [allergies, setAllergies] = useState<Allergy[]>([]);
    const [medications, setMedications] = useState<Medication[]>([]);
    const [contacts, setContacts] = useState<EmergencyContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
            return;
        }
    }, [user, authLoading, router]);

    // Optimized data fetching with Promise.allSettled for faster parallel loading
    const fetchDashboardData = useCallback(async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError('');

            // Fetch all data in parallel with timeout protection
            const [
                profileRes,
                conditionsRes,
                allergiesRes,
                medicationsRes,
                contactsRes,
            ] = await Promise.allSettled([
                supabase.from('profiles').select('*').eq('id', user.id).single(),
                supabase.from('medical_conditions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
                supabase.from('allergies').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
                supabase.from('medications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
                supabase.from('emergency_contacts').select('*').eq('user_id', user.id).order('is_primary', { ascending: false }),
            ]);

            // Process profile with better error handling
            if (profileRes.status === 'fulfilled' && !profileRes.value.error) {
                setProfile(profileRes.value.data);
            } else if (profileRes.status === 'fulfilled' && profileRes.value.error?.code === 'PGRST116') {
                // Create profile if doesn't exist
                const { data: newProfile, error: createError } = await supabase
                    .from('profiles')
                    .insert({
                        id: user.id,
                        full_name: user.email?.split('@')[0] || 'User',
                        language_preference: 'en',
                    })
                    .select()
                    .single();
                
                if (!createError && newProfile) {
                    setProfile(newProfile);
                }
            }

            // Set other data with fallbacks
            setConditions(conditionsRes.status === 'fulfilled' && conditionsRes.value.data ? conditionsRes.value.data : []);
            setAllergies(allergiesRes.status === 'fulfilled' && allergiesRes.value.data ? allergiesRes.value.data : []);
            setMedications(medicationsRes.status === 'fulfilled' && medicationsRes.value.data ? medicationsRes.value.data : []);
            setContacts(contactsRes.status === 'fulfilled' && contactsRes.value.data ? contactsRes.value.data : []);

        } catch (err: any) {
            console.error('Error fetching dashboard data:', err);
            setError('Failed to load dashboard data. Please refresh the page.');
            
            // Set minimal default profile to prevent crashes
            if (!profile) {
                setProfile({
                    id: user.id,
                    full_name: user.email?.split('@')[0] || 'User',
                    language_preference: 'en',
                    verified: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });
            }
        } finally {
            setLoading(false);
        }
    }, [user?.id, user?.email]);

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [user, fetchDashboardData]);

    // Optimized navigation handlers with useCallback
    const handleSignOut = useCallback(async () => {
        await signOut();
        router.push('/');
    }, [signOut, router]);

    const handleUseChatbot = useCallback(() => {
        router.push('/chatbot');
    }, [router]);

    const handleFillForm = useCallback(() => {
        router.push('/profile');
    }, [router]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-theme-page flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-theme-gradient animate-pulse glow" />
                    <div className="text-white text-xl font-medium">
                        {authLoading ? 'Authenticating...' : 'Loading Dashboard...'}
                    </div>
                </div>
            </div>
        );
    }

    // Show error state if data fetch failed
    if (error) {
        return (
            <div className="min-h-screen bg-theme-page relative overflow-hidden">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 -left-48 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
                </div>

                <nav className="border-b border-white/10 backdrop-blur-xl bg-slate-900/30 relative z-10 sticky top-0">
                    <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-xl bg-theme-gradient flex items-center justify-center shadow-lg">
                                <Heart className="h-7 w-7 text-white animate-pulse" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-theme-gradient">
                                    VitalQR
                                </h1>
                                <p className="text-xs text-cyan-300/70">Dashboard</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <LanguageSwitcher />
                            <Button 
                                onClick={() => signOut()}
                                variant="outline"
                                className="border-red-400/30 hover:border-red-400 hover:bg-red-500/10 text-red-300 hover:text-red-200 transition-all duration-300"
                            >
                                <LogOut className="h-4 w-4 mr-2" />
                                {t('logout', language)}
                            </Button>
                        </div>
                    </div>
                </nav>

                <div className="container mx-auto px-4 py-8 relative z-10 flex items-center justify-center min-h-[80vh]">
                    <Card className="max-w-lg bg-slate-900/40 border-red-400/30 backdrop-blur-xl">
                        <CardHeader>
                            <div className="flex items-center gap-3 mb-4">
                                <AlertCircle className="h-12 w-12 text-red-400" />
                                <CardTitle className="text-white text-2xl">Dashboard Error</CardTitle>
                            </div>
                            <CardDescription className="text-red-200/70 text-base">
                                We couldn't load your dashboard data. This might be a temporary connection issue.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 rounded-lg bg-red-500/10 border border-red-400/30">
                                <p className="text-red-300 text-sm">{error}</p>
                            </div>
                            <Button
                                onClick={() => fetchDashboardData()}
                                className="w-full bg-theme-gradient hover:shadow-xl hover:shadow-cyan-500/50"
                            >
                                Try Again
                            </Button>
                            <Button
                                onClick={() => router.push('/')}
                                variant="outline"
                                className="w-full border-cyan-400/30 hover:border-cyan-400"
                            >
                                Go to Homepage
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-theme-page relative overflow-hidden">
            {/* Consistent animated background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-48 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            {/* Navigation with theme colors */}
            <nav className="border-b border-white/10 backdrop-blur-xl bg-slate-900/30 relative z-10 sticky top-0">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3 group cursor-pointer" onClick={() => router.push('/dashboard')}>
                        <div className="h-12 w-12 rounded-xl bg-theme-gradient flex items-center justify-center shadow-lg group-hover:shadow-cyan-500/50 transition-all duration-300 group-hover:scale-110">
                            <Heart className="h-7 w-7 text-white animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-theme-gradient">
                                    VitalQR
                                </h1>
                                {profile?.verified && (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 border border-green-400/50 rounded-full">
                                        <Shield className="h-3 w-3 text-green-400" />
                                        <span className="text-xs font-bold text-green-400">Verified</span>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-cyan-300/70">Dashboard</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <LanguageSwitcher />
                        <Button 
                            onClick={handleSignOut}
                            variant="outline"
                            className="border-red-400/30 hover:border-red-400 hover:bg-red-500/10 text-red-300 hover:text-red-200 transition-all duration-300"
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            {t('logout', language)}
                        </Button>
                    </div>
                </div>
            </nav>

            <div className="container mx-auto px-4 py-8 relative z-10">
                {/* 1. Welcome Section */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-2">
                        <h2 className="text-4xl font-bold text-white">
                            Welcome back, {profile?.full_name || 'User'}!
                        </h2>
                        {profile?.verified ? (
                            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border-2 border-green-400/50 rounded-xl animate-pulse">
                                <Shield className="h-6 w-6 text-green-400" />
                                <span className="text-lg font-bold text-green-400">✓ Verified Profile</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border-2 border-yellow-400/50 rounded-xl">
                                <AlertCircle className="h-6 w-6 text-yellow-400" />
                                <span className="text-lg font-bold text-yellow-400">Unverified</span>
                            </div>
                        )}
                    </div>
                    <p className="text-blue-200/70 text-lg">
                        {profile?.verified 
                            ? 'Your emergency medical profile is complete and verified'
                            : 'Complete your profile to get verified status'}
                    </p>
                </div>

                {/* NEW: Verification Progress Card (only show if unverified) */}
                {!profile?.verified && (
                    <Card className="mb-8 bg-gradient-to-r from-yellow-600/20 via-orange-600/20 to-yellow-600/20 border-yellow-400/30 backdrop-blur-xl shadow-2xl">
                        <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="h-12 w-12 rounded-xl bg-yellow-500/20 border border-yellow-400/30 flex items-center justify-center flex-shrink-0">
                                    <AlertCircle className="h-6 w-6 text-yellow-400" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-white text-xl font-bold mb-2">Complete Your Profile to Get Verified</h3>
                                    <p className="text-yellow-200/80 mb-4">
                                        A verified profile ensures emergency responders can trust your medical information.
                                    </p>
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-2 text-sm">
                                            {profile?.full_name && profile?.blood_type && profile?.date_of_birth && profile?.profile_pin ? (
                                                <CheckCircle className="h-4 w-4 text-green-400" />
                                            ) : (
                                                <div className="h-4 w-4 rounded-full border-2 border-yellow-400" />
                                            )}
                                            <span className={profile?.full_name && profile?.blood_type && profile?.date_of_birth && profile?.profile_pin ? 'text-green-400' : 'text-yellow-200/70'}>
                                                Basic information (name, blood type, DOB, PIN)
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            {contacts.length > 0 ? (
                                                <CheckCircle className="h-4 w-4 text-green-400" />
                                            ) : (
                                                <div className="h-4 w-4 rounded-full border-2 border-yellow-400" />
                                            )}
                                            <span className={contacts.length > 0 ? 'text-green-400' : 'text-yellow-200/70'}>
                                                Emergency contact added
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            {(allergies.length > 0 || conditions.length > 0 || medications.length > 0) ? (
                                                <CheckCircle className="h-4 w-4 text-green-400" />
                                            ) : (
                                                <div className="h-4 w-4 rounded-full border-2 border-yellow-400" />
                                            )}
                                            <span className={(allergies.length > 0 || conditions.length > 0 || medications.length > 0) ? 'text-green-400' : 'text-yellow-200/70'}>
                                                Medical information (allergies, conditions, or medications)
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => router.push('/profile')}
                                        className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
                                    >
                                        Complete Profile Now
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* 2. Mode Selection Banner - MOVED TO TOP (Second Position) */}
                <Card className="mb-8 bg-gradient-to-r from-blue-600/20 via-cyan-600/20 to-blue-600/20 border-cyan-400/30 backdrop-blur-xl shadow-2xl hover-theme">
                    <CardContent className="p-8">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="text-3xl font-bold mb-3 text-white">
                                    How would you like to manage your profile?
                                </h3>
                                <p className="text-blue-200/80 text-lg">
                                    Fill a traditional form or use our AI-powered assistant with voice support
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <Button
                                    onClick={handleFillForm}
                                    size="lg"
                                    className="h-auto py-6 px-8 flex-col gap-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-2xl hover:shadow-green-500/50 transition-all duration-200 transform hover:scale-105 active:scale-95"
                                >
                                    <FileText className="h-8 w-8" />
                                    <div className="text-center">
                                        <div className="font-bold text-lg">Fill Form</div>
                                        <div className="text-xs opacity-90">Traditional method</div>
                                    </div>
                                </Button>
                                <Button
                                    onClick={handleUseChatbot}
                                    size="lg"
                                    className="h-auto py-6 px-8 flex-col gap-3 bg-theme-accent hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-200 transform hover:scale-105 active:scale-95 animate-gradient"
                                >
                                    <div className="relative">
                                        <MessageSquare className="h-8 w-8" />
                                        <Sparkles className="h-4 w-4 absolute -top-1 -right-1 text-yellow-300 animate-pulse" />
                                    </div>
                                    <div className="text-center">
                                        <div className="font-bold text-lg">AI Assistant</div>
                                        <div className="text-xs opacity-90">Powered by OpenAI</div>
                                    </div>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Quick Actions - NOW IN THIRD POSITION */}
                <Card className="mb-8 bg-slate-900/40 border-cyan-400/30 backdrop-blur-xl hover-theme">
                    <CardHeader>
                        <CardTitle className="text-white text-2xl">Quick Actions</CardTitle>
                        <CardDescription className="text-blue-200/70">
                            Manage your emergency medical profile
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Button
                                className="h-auto py-6 flex-col gap-2 bg-theme-gradient hover:shadow-xl hover:shadow-cyan-500/50 transition-all duration-300 transform hover:scale-105"
                                onClick={() => router.push('/qr')}
                            >
                                <QrCode className="h-8 w-8" />
                                <div className="text-center">
                                    <div className="font-semibold">Generate QR Code</div>
                                    <div className="text-xs opacity-80">Create emergency access codes</div>
                                </div>
                            </Button>

                            <Button
                                className="h-auto py-6 flex-col gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-green-500/50 transition-all duration-300 transform hover:scale-105"
                                onClick={() => router.push('/profile')}
                            >
                                <User className="h-8 w-8" />
                                <div className="text-center">
                                    <div className="font-semibold">Edit Profile</div>
                                    <div className="text-xs opacity-80">Update medical information</div>
                                </div>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* 4. Quick Stats - Using memoized components */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatCard
                        count={conditions.length}
                        label="Medical Conditions"
                        icon={Activity}
                        gradient="bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-400/30"
                    />
                    <StatCard
                        count={allergies.length}
                        label="Allergies"
                        icon={AlertCircle}
                        gradient="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-400/30"
                    />
                    <StatCard
                        count={medications.length}
                        label="Medications"
                        icon={FileText}
                        gradient="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-400/30"
                    />
                </div>

                {/* 5. Profile Overview and Recent Activity - KEEP SAME */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Profile Quick View */}
                    <Card className="bg-slate-900/40 border-cyan-400/30 backdrop-blur-xl hover-theme">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-400/30 flex items-center justify-center">
                                    <User className="h-6 w-6 text-blue-400" />
                                </div>
                                <CardTitle className="text-white">Profile Overview</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-cyan-300/70 text-sm mb-1">Blood Type</p>
                                    <p className="text-white font-semibold">{profile?.blood_type || 'Not set'}</p>
                                </div>
                                <div>
                                    <p className="text-cyan-300/70 text-sm mb-1">Date of Birth</p>
                                    <p className="text-white font-semibold">{profile?.date_of_birth || 'Not set'}</p>
                                </div>
                                <div>
                                    <p className="text-cyan-300/70 text-sm mb-1">Verification Status</p>
                                    <div className="flex items-center gap-2">
                                        {profile?.verified ? (
                                            <>
                                                <Shield className="h-5 w-5 text-green-400 animate-pulse" />
                                                <span className="text-green-400 font-bold text-base">✓ Verified</span>
                                            </>
                                        ) : (
                                            <>
                                                <AlertCircle className="h-5 w-5 text-yellow-400" />
                                                <span className="text-yellow-400 font-semibold">Unverified</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-cyan-300/70 text-sm mb-1">PIN Protection</p>
                                    <p className="text-white font-semibold">{profile?.profile_pin ? 'Enabled' : 'Disabled'}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Activity Timeline */}
                    <Card className="bg-slate-900/40 border-cyan-400/30 backdrop-blur-xl hover-theme">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-400/30 flex items-center justify-center">
                                        <Clock className="h-6 w-6 text-purple-400" />
                                    </div>
                                    <CardTitle className="text-white">Recent Activity</CardTitle>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {/* Profile Last Updated */}
                            {profile?.updated_at && (
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-purple-400/30 transition-all duration-300">
                                    <div className="h-10 w-10 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center flex-shrink-0">
                                        <User className="h-5 w-5 text-blue-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-white font-semibold text-sm">Profile Updated</p>
                                        <p className="text-cyan-300/70 text-xs">
                                            {new Date(profile.updated_at).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Medical Records Count */}
                            {(conditions.length > 0 || allergies.length > 0 || medications.length > 0) && (
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-purple-400/30 transition-all duration-300">
                                    <div className="h-10 w-10 rounded-lg bg-green-500/20 border border-green-400/30 flex items-center justify-center flex-shrink-0">
                                        <FileText className="h-5 w-5 text-green-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-white font-semibold text-sm">Medical Records Active</p>
                                        <p className="text-cyan-300/70 text-xs">
                                            {conditions.length + allergies.length + medications.length} items tracked
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* QR Code Available */}
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-purple-400/30 transition-all duration-300">
                                <div className="h-10 w-10 rounded-lg bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center flex-shrink-0">
                                    <QrCode className="h-5 w-5 text-cyan-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-white font-semibold text-sm">QR Codes Ready</p>
                                    <p className="text-cyan-300/70 text-xs">
                                        Online & Offline codes available
                                    </p>
                                </div>
                            </div>

                            {/* Empty State */}
                            {!profile?.updated_at && conditions.length === 0 && allergies.length === 0 && medications.length === 0 && (
                                <div className="text-center py-8">
                                    <Clock className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                                    <p className="text-blue-200/70">No recent activity</p>
                                    <p className="text-slate-500 text-sm mt-1">Start by completing your profile</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* 6. Medical Information Summary - Keep at bottom */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Critical Allergies */}
                    <Card className="bg-slate-900/40 border-cyan-400/30 backdrop-blur-xl hover-theme">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-400/30 flex items-center justify-center">
                                    <AlertCircle className="h-5 w-5 text-red-400" />
                                </div>
                                <CardTitle className="text-white">Critical Allergies</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {allergies.filter(a => a.severity === 'severe' || a.severity === 'life-threatening').length === 0 ? (
                                <p className="text-blue-200/70 text-sm">No critical allergies recorded</p>
                            ) : (
                                <div className="space-y-2">
                                    {allergies.filter(a => a.severity === 'severe' || a.severity === 'life-threatening').map((allergy) => (
                                        <div key={allergy.id} className="p-3 rounded-lg bg-red-500/10 border border-red-400/30">
                                            <p className="text-white font-semibold">{allergy.allergen}</p>
                                            <p className="text-red-300 text-sm">{allergy.severity}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* High Priority Conditions */}
                    <Card className="bg-slate-900/40 border-cyan-400/30 backdrop-blur-xl hover-theme">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-400/30 flex items-center justify-center">
                                    <Activity className="h-5 w-5 text-yellow-400" />
                                </div>
                                <CardTitle className="text-white">Priority Conditions</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {conditions.filter(c => c.priority_level === 'high' || c.priority_level === 'critical').length === 0 ? (
                                <p className="text-blue-200/70 text-sm">No high priority conditions recorded</p>
                            ) : (
                                <div className="space-y-2">
                                    {conditions.filter(c => c.priority_level === 'high' || c.priority_level === 'critical').map((condition) => (
                                        <div key={condition.id} className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-400/30">
                                            <p className="text-white font-semibold">{condition.condition_name}</p>
                                            <p className="text-yellow-300 text-sm">{condition.priority_level}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Current Medications */}
                    <Card className="bg-slate-900/40 border-cyan-400/30 backdrop-blur-xl hover-theme">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-400/30 flex items-center justify-center">
                                    <FileText className="h-5 w-5 text-blue-400" />
                                </div>
                                <CardTitle className="text-white">Active Medications</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {medications.length === 0 ? (
                                <p className="text-blue-200/70 text-sm">No active medications recorded</p>
                            ) : (
                                <div className="space-y-2">
                                    {medications.slice(0, 3).map((medication) => (
                                        <div key={medication.id} className="p-3 rounded-lg bg-blue-500/10 border border-blue-400/30">
                                            <p className="text-white font-semibold">{medication.medication_name}</p>
                                            <p className="text-blue-300 text-sm">{medication.dosage || 'As prescribed'}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}