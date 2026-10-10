'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart, Phone, MapPin, Volume2, Shield, AlertCircle, User, Loader2, Lock, Unlock, FileText, Download, Image as ImageIcon, CheckCircle, Activity } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import type { Profile, MedicalCondition, Allergy, Medication, EmergencyContact, MedicalDocument } from '@/lib/types';

export default function EmergencyProfilePage() {
    const params = useParams();
    const userId = params.id as string;
    
    const [profile, setProfile] = useState<Profile | null>(null);
    const [conditions, setConditions] = useState<MedicalCondition[]>([]);
    const [allergies, setAllergies] = useState<Allergy[]>([]);
    const [medications, setMedications] = useState<Medication[]>([]);
    const [contacts, setContacts] = useState<EmergencyContact[]>([]);
    const [documents, setDocuments] = useState<MedicalDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // PIN protection states
    const [showSensitiveInfo, setShowSensitiveInfo] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState('');

    // NEW: PIN attempt tracking
    const [pinAttempts, setPinAttempts] = useState(0);
    const [isLockedOut, setIsLockedOut] = useState(false);
    const [lockoutTime, setLockoutTime] = useState<number | null>(null);

    useEffect(() => {
        fetchEmergencyProfile();
    }, [userId]);

    const fetchEmergencyProfile = async () => {
        try {
            setLoading(true);
            
            // Fetch profile
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileError) throw profileError;
            setProfile(profileData);

            // Fetch critical allergies
            const { data: allergiesData } = await supabase
                .from('allergies')
                .select('*')
                .eq('user_id', userId)
                .order('severity', { ascending: false });
            setAllergies(allergiesData || []);

            // Fetch high priority conditions
            const { data: conditionsData } = await supabase
                .from('medical_conditions')
                .select('*')
                .eq('user_id', userId)
                .order('priority_level', { ascending: false });
            setConditions(conditionsData || []);

            // Fetch medications
            const { data: medicationsData } = await supabase
                .from('medications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            setMedications(medicationsData || []);

            // Fetch emergency contacts
            const { data: contactsData } = await supabase
                .from('emergency_contacts')
                .select('*')
                .eq('user_id', userId)
                .order('is_primary', { ascending: false });
            setContacts(contactsData || []);

            // Fetch medical documents
            const { data: documentsData } = await supabase
                .from('medical_documents')
                .select('*')
                .eq('user_id', userId)
                .order('uploaded_at', { ascending: false });
            setDocuments(documentsData || []);

        } catch (err: any) {
            console.error('Error fetching emergency profile:', err);
            setError('Failed to load emergency profile');
        } finally {
            setLoading(false);
        }
    };

    // NEW: Check for lockout on mount
    useEffect(() => {
        const lockoutData = localStorage.getItem(`lockout_${userId}`);
        if (lockoutData) {
            const { attempts, timestamp } = JSON.parse(lockoutData);
            const timePassed = Date.now() - timestamp;
            const fifteenMinutes = 15 * 60 * 1000;
            
            if (timePassed < fifteenMinutes) {
                setIsLockedOut(true);
                setLockoutTime(fifteenMinutes - timePassed);
                setPinAttempts(attempts);
            } else {
                localStorage.removeItem(`lockout_${userId}`);
            }
        }
    }, [userId]);

    // NEW: Lockout countdown
    useEffect(() => {
        if (isLockedOut && lockoutTime) {
            const interval = setInterval(() => {
                setLockoutTime(prev => {
                    if (!prev || prev <= 1000) {
                        setIsLockedOut(false);
                        setPinAttempts(0);
                        localStorage.removeItem(`lockout_${userId}`);
                        return null;
                    }
                    return prev - 1000;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [isLockedOut, lockoutTime, userId]);

    const verifyPin = () => {
        if (isLockedOut) {
            setPinError(`Too many attempts. Please wait ${Math.ceil((lockoutTime || 0) / 60000)} minutes.`);
            return;
        }

        if (!profile?.profile_pin) {
            setPinError('No PIN set for this profile. Contact the profile owner.');
            return;
        }
        
        if (pinInput === profile.profile_pin) {
            setShowSensitiveInfo(true);
            setPinError('');
            setPinInput('');
            setPinAttempts(0);
            localStorage.removeItem(`lockout_${userId}`);
        } else {
            const newAttempts = pinAttempts + 1;
            setPinAttempts(newAttempts);
            
            if (newAttempts >= 3) {
                setIsLockedOut(true);
                setLockoutTime(15 * 60 * 1000); // 15 minutes
                localStorage.setItem(`lockout_${userId}`, JSON.stringify({
                    attempts: newAttempts,
                    timestamp: Date.now()
                }));
                setPinError('Too many incorrect attempts. Locked for 15 minutes for security.');
            } else {
                setPinError(`Incorrect PIN. ${3 - newAttempts} attempt${3 - newAttempts === 1 ? '' : 's'} remaining.`);
            }
        }
    };

    const handleCallEmergency = () => {
        const primaryContact = contacts.find(c => c.is_primary) || contacts[0];
        if (primaryContact?.phone_number) {
            window.location.href = `tel:${primaryContact.phone_number}`;
        } else {
            alert('No emergency contact available');
        }
    };

    const handleShareLocation = () => {
        if (typeof window === 'undefined' || !('geolocation' in navigator)) {
            alert('Geolocation not supported in this browser');
            return;
        }
        
        navigator.geolocation.getCurrentPosition((position) => {
            const { latitude, longitude } = position.coords;
            const primaryContact = contacts.find(c => c.is_primary) || contacts[0];
            const message = `Emergency! I need help. My location: https://maps.google.com/?q=${latitude},${longitude}`;
            if (primaryContact?.phone_number) {
                window.location.href = `sms:${primaryContact.phone_number}?body=${encodeURIComponent(message)}`;
            }
        }, (error) => {
            console.error('Geolocation error:', error);
            alert('Could not access your location. Please enable location services.');
        });
    };

    const handleReadProfile = () => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            alert('Text-to-speech not supported in this browser');
            return;
        }

        const criticalAllergies = allergies
            .filter(a => a.severity === 'severe' || a.severity === 'life-threatening')
            .map(a => a.allergen)
            .join(', ');

        const highPriorityConditions = conditions
            .filter(c => c.priority_level === 'high' || c.priority_level === 'critical')
            .map(c => c.condition_name)
            .join(', ');

        const primaryContact = contacts.find(c => c.is_primary) || contacts[0];

        let text = `Medical Information. Name: ${profile?.full_name}. Blood Group: ${profile?.blood_type || 'Not specified'}. Date of Birth: ${profile?.date_of_birth || 'Not specified'}. Critical Allergies: ${criticalAllergies || 'None'}. High Priority Conditions: ${highPriorityConditions || 'None'}. Emergency Contact: ${primaryContact?.name || 'Not set'}, Phone: ${primaryContact?.phone_number || 'Not set'}`;
        
        if (showSensitiveInfo) {
            const allMedications = medications.map(m => m.medication_name).join(', ');
            text += `. Full medication list: ${allMedications || 'None'}. ${documents.length} medical documents available.`;
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
    };

    const downloadDocument = async (doc: MedicalDocument) => {
        try {
            window.open(doc.document_url, '_blank');
        } catch (error) {
            console.error('Error opening document:', error);
            alert('Failed to open document');
        }
    };

    const getDocumentIcon = (fileName: string) => {
        const ext = fileName.toLowerCase().split('.').pop();
        if (['jpg', 'jpeg', 'png', 'heic', 'gif'].includes(ext || '')) {
            return <ImageIcon className="h-8 w-8 text-blue-400" />;
        }
        return <FileText className="h-8 w-8 text-green-400" />;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-16 w-16 text-cyan-400 animate-spin" />
                    <div className="text-white text-xl">Loading emergency profile...</div>
                </div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
                <Card className="bg-red-500/10 border-red-400/30 max-w-md">
                    <CardContent className="p-8 text-center">
                        <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                        <h2 className="text-white text-xl font-bold mb-2">Profile Not Found</h2>
                        <p className="text-red-200/70">{error || 'This emergency profile could not be loaded.'}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const primaryContact = contacts.find(c => c.is_primary) || contacts[0];
    const criticalAllergies = allergies.filter(a => a.severity === 'severe' || a.severity === 'life-threatening');
    const highPriorityConditions = conditions.filter(c => c.priority_level === 'high' || c.priority_level === 'critical');

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
            {/* Red Header with Enhanced Verified Badge */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white py-6 shadow-2xl">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <Heart className="h-9 w-9 text-white animate-pulse" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold">Emergency Medical Profile</h1>
                                <p className="text-red-100 text-sm">Instant Access for First Responders</p>
                            </div>
                        </div>
                        {/* NEW: Enhanced verification badge */}
                        {profile?.verified ? (
                            <div className="bg-green-500 text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl animate-pulse border-2 border-green-300">
                                <Shield className="h-6 w-6" />
                                <div className="text-left">
                                    <div className="font-bold text-lg">✓ Verified Profile</div>
                                    <div className="text-xs text-green-100">Complete & Up-to-Date</div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-yellow-500 text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl border-2 border-yellow-300">
                                <AlertCircle className="h-6 w-6" />
                                <div className="text-left">
                                    <div className="font-bold text-lg">Unverified</div>
                                    <div className="text-xs text-yellow-100">Incomplete Profile</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                {/* NEW: Verification status info banner */}
                {profile?.verified && (
                    <div className="mb-6 p-4 bg-green-500/10 rounded-xl border border-green-400/30">
                        <div className="flex items-start gap-3">
                            <CheckCircle className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" />
                            <div>
                                <p className="text-green-300 font-bold text-lg mb-1">✓ This profile has been verified</p>
                                <p className="text-green-200/70 text-sm">
                                    This medical information has been completed and confirmed by the profile owner. All critical data is present and up-to-date.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Action Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <Button
                        onClick={handleReadProfile}
                        size="lg"
                        className="h-20 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-lg font-semibold shadow-2xl transform hover:scale-105 transition-all duration-300"
                    >
                        <Volume2 className="h-6 w-6 mr-3" />
                        🔊 Read Profile Aloud
                    </Button>

                    <Button
                        onClick={handleCallEmergency}
                        size="lg"
                        className="h-20 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-lg font-semibold shadow-2xl transform hover:scale-105 transition-all duration-300"
                    >
                        <Phone className="h-6 w-6 mr-3" />
                        📞 Call Emergency Contact
                    </Button>
                </div>

                <Button
                    onClick={handleShareLocation}
                    size="lg"
                    className="w-full h-20 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-lg font-semibold mb-8 shadow-2xl transform hover:scale-105 transition-all duration-300"
                >
                    <MapPin className="h-6 w-6 mr-3" />
                    📍 Send Emergency Location
                </Button>

                {/* Public Information Card - EXPANDED */}
                <Card className="bg-slate-800/60 border-slate-600/50 backdrop-blur-xl mb-8">
                    <CardHeader className="border-b border-slate-600/50">
                        <div className="flex items-center gap-3">
                            <User className="h-6 w-6 text-cyan-400" />
                            <div>
                                <CardTitle className="text-white text-2xl">Emergency Medical Information</CardTitle>
                                <CardDescription className="text-green-400 font-semibold flex items-center gap-2 mt-1">
                                    <CheckCircle className="h-4 w-4" />
                                    Instantly Accessible - No PIN Required
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-6">
                            {/* Patient Name */}
                            <div>
                                <p className="text-cyan-300 font-semibold mb-2 text-lg">Patient Name</p>
                                <p className="text-white text-2xl font-bold">{profile.full_name}</p>
                            </div>

                            {/* Age and Blood Group Row */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                                        <span className="text-2xl">📅</span>
                                    </div>
                                    <div>
                                        <p className="text-cyan-300/70 text-sm">Date of Birth</p>
                                        <p className="text-white text-xl font-semibold">{profile.date_of_birth || 'Not set'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-xl bg-red-500/20 border border-red-400/30 flex items-center justify-center">
                                        <span className="text-2xl">🩸</span>
                                    </div>
                                    <div>
                                        <p className="text-cyan-300/70 text-sm">Blood Group</p>
                                        <p className="text-white text-3xl font-bold">{profile.blood_type || 'Not set'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* ALL Allergies - Now Public */}
                            {allergies.length > 0 && (
                                <div className="p-4 bg-red-500/10 rounded-xl border-2 border-red-400/50">
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertCircle className="h-5 w-5 text-red-400" />
                                        <p className="text-red-300 font-bold text-lg">⚠️ ALL ALLERGIES</p>
                                    </div>
                                    <div className="space-y-2">
                                        {allergies.map((allergy) => (
                                            <div key={allergy.id} className="p-3 bg-red-500/20 rounded-lg">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-white text-lg font-bold">{allergy.allergen}</p>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                        allergy.severity === 'life-threatening' ? 'bg-red-600 text-white' :
                                                        allergy.severity === 'severe' ? 'bg-orange-600 text-white' :
                                                        allergy.severity === 'moderate' ? 'bg-yellow-600 text-white' :
                                                        'bg-green-600 text-white'
                                                    }`}>
                                                        {allergy.severity.toUpperCase()}
                                                    </span>
                                                </div>
                                                {allergy.reaction && (
                                                    <p className="text-red-200 text-sm">Reaction: {allergy.reaction}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ALL Medical Conditions - Now Public */}
                            {conditions.length > 0 && (
                                <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-400/30">
                                    <p className="text-orange-300 font-semibold mb-3 text-lg flex items-center gap-2">
                                        <Activity className="h-5 w-5" />
                                        ALL MEDICAL CONDITIONS
                                    </p>
                                    <div className="space-y-2">
                                        {conditions.map((condition) => (
                                            <div key={condition.id} className="p-3 bg-orange-500/20 rounded-lg">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-white font-bold">{condition.condition_name}</p>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                        condition.priority_level === 'critical' ? 'bg-red-600 text-white' :
                                                        condition.priority_level === 'high' ? 'bg-orange-600 text-white' :
                                                        condition.priority_level === 'medium' ? 'bg-yellow-600 text-white' :
                                                        'bg-green-600 text-white'
                                                    }`}>
                                                        {condition.priority_level.toUpperCase()}
                                                    </span>
                                                </div>
                                                {condition.notes && (
                                                    <p className="text-orange-200/80 text-sm mt-1">{condition.notes}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ALL Current Medications - Now Public */}
                            {medications.length > 0 && (
                                <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-400/30">
                                    <p className="text-blue-300 font-semibold mb-3 text-lg flex items-center gap-2">
                                        <FileText className="h-5 w-5" />
                                        CURRENT MEDICATIONS
                                    </p>
                                    <div className="space-y-2">
                                        {medications.map((medication) => (
                                            <div key={medication.id} className="p-3 bg-blue-500/20 rounded-lg">
                                                <p className="text-white font-bold text-lg">{medication.medication_name}</p>
                                                {medication.dosage && (
                                                    <p className="text-blue-200 text-sm">Dosage: {medication.dosage}</p>
                                                )}
                                                {medication.frequency && (
                                                    <p className="text-blue-200 text-sm">Frequency: {medication.frequency}</p>
                                                )}
                                                {medication.notes && (
                                                    <p className="text-blue-200/80 text-sm mt-1">{medication.notes}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Emergency Contact */}
                            {primaryContact && (
                                <div className="p-6 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl border-2 border-green-400/50 shadow-lg">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Phone className="h-6 w-6 text-green-400" />
                                        <p className="text-green-300 font-bold text-xl">Primary Emergency Contact</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-white text-2xl font-bold">{primaryContact.name}</p>
                                        {primaryContact.relationship && (
                                            <p className="text-green-200 text-lg">{primaryContact.relationship}</p>
                                        )}
                                        <a 
                                            href={`tel:${primaryContact.phone_number}`}
                                            className="inline-block text-white text-2xl font-bold bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg mt-2 transition-colors"
                                        >
                                            📞 {primaryContact.phone_number}
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* Info Box */}
                            <div className="p-4 bg-cyan-500/10 rounded-xl border border-cyan-400/30">
                                <p className="text-cyan-300 text-sm flex items-start gap-2">
                                    <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                    <span>
                                        <strong>Why is this information public?</strong><br />
                                        In emergencies, seconds matter. This critical medical data is immediately accessible to save your life. Allergies prevent dangerous medications, conditions guide treatment, and medications avoid harmful interactions.
                                    </span>
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* PIN-Protected Sensitive Information - REDUCED SCOPE */}
                <Card className="bg-slate-800/60 border-yellow-400/30 backdrop-blur-xl mb-8">
                    <CardHeader className="border-b border-slate-600/50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-600/20 border border-yellow-400/30 flex items-center justify-center">
                                    {showSensitiveInfo ? (
                                        <Unlock className="h-6 w-6 text-yellow-400" />
                                    ) : (
                                        <Lock className="h-6 w-6 text-yellow-400" />
                                    )}
                                </div>
                                <div>
                                    <CardTitle className="text-white text-2xl">
                                        {showSensitiveInfo ? 'Medical History & Documents (Unlocked)' : 'Medical History & Documents (PIN Required)'}
                                    </CardTitle>
                                    <CardDescription className="text-yellow-200/70 text-sm">
                                        {showSensitiveInfo 
                                            ? 'Viewing past surgeries and uploaded medical documents'
                                            : 'Previous surgeries, prescriptions, and medical records'}
                                    </CardDescription>
                                </div>
                            </div>
                            {showSensitiveInfo && (
                                <Button
                                    size="sm"
                                    onClick={() => setShowSensitiveInfo(false)}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    <Lock className="h-4 w-4 mr-2" />
                                    Lock
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        {!showSensitiveInfo ? (
                            <div className="space-y-4">
                                <div className="p-6 bg-yellow-500/10 rounded-xl border border-yellow-400/30 text-center">
                                    <Lock className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
                                    <p className="text-white font-semibold mb-2">
                                        Enter the 4-digit PIN to access medical history
                                    </p>
                                    <p className="text-yellow-200/70 text-sm mb-4">
                                        This protects sensitive information like past surgeries and uploaded medical documents
                                    </p>
                                    
                                    {/* Show document count indicator */}
                                    {documents.length > 0 && (
                                        <div className="mb-4 p-3 bg-blue-500/10 rounded-lg border border-blue-400/30">
                                            <div className="flex items-center justify-center gap-2 text-blue-300">
                                                <FileText className="h-5 w-5" />
                                                <span className="font-semibold">
                                                    {documents.filter(d => d.document_type === 'prescription').length} Prescriptions & {documents.filter(d => d.document_type === 'surgery').length} Surgery Records Available
                                                </span>
                                            </div>
                                            <p className="text-xs text-blue-200/70 mt-1">
                                                Unlock to view uploaded documents
                                            </p>
                                        </div>
                                    )}

                                    <div className="max-w-xs mx-auto space-y-3">
                                        <Input
                                            type="password"
                                            value={pinInput}
                                            onChange={(e) => setPinInput(e.target.value.slice(0, 4))}
                                            placeholder="Enter PIN"
                                            maxLength={4}
                                            disabled={isLockedOut}
                                            className="bg-slate-800/50 border-slate-600/50 text-white text-center text-2xl tracking-widest"
                                            onKeyPress={(e) => e.key === 'Enter' && pinInput.length === 4 && !isLockedOut && verifyPin()}
                                        />
                                        {pinError && (
                                            <div className={`p-3 rounded-lg text-sm ${
                                                isLockedOut ? 'bg-red-500/20 text-red-300 border border-red-400/30' : 'bg-yellow-500/20 text-yellow-300'
                                            }`}>
                                                <div className="flex items-center gap-2">
                                                    <AlertCircle className="h-4 w-4" />
                                                    <span>{pinError}</span>
                                                </div>
                                                {!isLockedOut && pinAttempts > 0 && (
                                                    <p className="text-xs mt-1 opacity-80">
                                                        {pinAttempts}/3 attempts used
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        <Button
                                            onClick={verifyPin}
                                            disabled={pinInput.length !== 4 || isLockedOut}
                                            className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
                                        >
                                            <Unlock className="h-4 w-4 mr-2" />
                                            {isLockedOut ? `Locked (${Math.ceil((lockoutTime || 0) / 60000)}m)` : 'Unlock Medical History'}
                                        </Button>
                                    </div>

                                    <div className="mt-6 p-4 bg-slate-700/50 rounded-lg">
                                        <p className="text-cyan-300 text-sm font-semibold mb-2">🔒 What's Protected:</p>
                                        <ul className="text-blue-200/70 text-xs space-y-1 text-left max-w-xs mx-auto">
                                            <li>• Previous surgeries and operations</li>
                                            <li>• Uploaded prescription documents</li>
                                            <li>• Uploaded surgery records and reports</li>
                                            <li>• Medical history notes</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Prescriptions Section */}
                                {documents.filter(d => d.document_type === 'prescription').length > 0 && (
                                    <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-400/30">
                                        <p className="text-blue-300 font-semibold mb-3 text-lg flex items-center gap-2">
                                            <FileText className="h-5 w-5" />
                                            Prescriptions ({documents.filter(d => d.document_type === 'prescription').length})
                                        </p>
                                        <p className="text-blue-200/70 text-sm mb-4">
                                            Current and past prescriptions uploaded by patient
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {documents.filter(d => d.document_type === 'prescription').map((doc) => (
                                                <div 
                                                    key={doc.id} 
                                                    className="p-4 bg-slate-700/50 rounded-lg border border-blue-400/20 hover:border-blue-400/50 transition-all duration-300"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="flex-shrink-0">
                                                            {getDocumentIcon(doc.document_name)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-white font-semibold truncate mb-1">
                                                                {doc.document_name}
                                                            </p>
                                                            <p className="text-blue-200/70 text-xs mb-1">
                                                                Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                                                            </p>
                                                            {doc.file_size && (
                                                                <p className="text-blue-200/50 text-xs">
                                                                    Size: {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        onClick={() => downloadDocument(doc)}
                                                        size="sm"
                                                        className="w-full mt-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                                                    >
                                                        <Download className="h-4 w-4 mr-2" />
                                                        View/Download
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Surgery Records Section */}
                                {documents.filter(d => d.document_type === 'surgery').length > 0 && (
                                    <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-400/30">
                                        <p className="text-purple-300 font-semibold mb-3 text-lg flex items-center gap-2">
                                            <FileText className="h-5 w-5" />
                                            Past Surgery Records ({documents.filter(d => d.document_type === 'surgery').length})
                                        </p>
                                        <p className="text-purple-200/70 text-sm mb-4">
                                            Medical records of previous surgeries and procedures
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {documents.filter(d => d.document_type === 'surgery').map((doc) => (
                                                <div 
                                                    key={doc.id} 
                                                    className="p-4 bg-slate-700/50 rounded-lg border border-purple-400/20 hover:border-purple-400/50 transition-all duration-300"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="flex-shrink-0">
                                                            {getDocumentIcon(doc.document_name)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-white font-semibold truncate mb-1">
                                                                {doc.document_name}
                                                            </p>
                                                            <p className="text-purple-200/70 text-xs mb-1">
                                                                Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                                                            </p>
                                                            {doc.file_size && (
                                                                <p className="text-purple-200/50 text-xs">
                                                                    Size: {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        onClick={() => downloadDocument(doc)}
                                                        size="sm"
                                                        className="w-full mt-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                                    >
                                                        <Download className="h-4 w-4 mr-2" />
                                                        View/Download
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Show message if no documents */}
                                {documents.length === 0 && (
                                    <div className="p-4 bg-slate-700/30 rounded-xl border border-slate-600/30 text-center">
                                        <FileText className="h-12 w-12 text-slate-500 mx-auto mb-2" />
                                        <p className="text-slate-400">No medical documents uploaded</p>
                                    </div>
                                )}

                                {/* Info box */}
                                <div className="p-4 bg-green-500/10 rounded-xl border border-green-400/30">
                                    <p className="text-green-300 text-sm flex items-start gap-2">
                                        <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                        <span>
                                            <strong>Access Granted</strong><br />
                                            You can now view all medical history documents and records. This information is protected to maintain patient privacy while still being accessible in emergencies.
                                        </span>
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Footer Notice */}
                <div className="text-center text-cyan-300/70 text-sm space-y-2">
                    <p className="mb-2">🔒 This profile is secured and verified by VitalQR</p>
                    <p>Critical medical information is instantly accessible for emergency response</p>
                    <p className="text-yellow-300/70">
                        📄 Medical history and documents are PIN-protected for privacy
                    </p>
                </div>
            </div>
        </div>
    );
}