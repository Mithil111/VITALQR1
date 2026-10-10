'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/translations';
import {
    ArrowLeft,
    Heart,
    Save,
    X,
    Plus,
    Trash2,
    AlertCircle,
    CheckCircle,
    Loader2,
    User,
    Phone,
    Droplet,
    Shield,
    Upload,
    FileText,
    Image as ImageIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import type { Profile, MedicalCondition, Allergy, Medication, EmergencyContact, MedicalDocument } from '@/lib/types';

export default function ProfilePage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { language } = useLanguage();

    // Profile state
    const [profile, setProfile] = useState<Profile | null>(null);
    const [fullName, setFullName] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [bloodType, setBloodType] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [profilePin, setProfilePin] = useState('');

    // Medical data states
    const [allergies, setAllergies] = useState<Allergy[]>([]);
    const [conditions, setConditions] = useState<MedicalCondition[]>([]);
    const [medications, setMedications] = useState<Medication[]>([]);
    const [contacts, setContacts] = useState<EmergencyContact[]>([]);

    // UI states
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // Documents states
    const [documents, setDocuments] = useState<MedicalDocument[]>([]);
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [uploadType, setUploadType] = useState<'prescription' | 'surgery' | null>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
            return;
        }
        if (user) {
            fetchProfileData();
        }
    }, [user, authLoading, router]);

    const fetchProfileData = async () => {
        try {
            setLoading(true);
            setError('');

            // Fetch profile
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user?.id)
                .single();

            if (profileError && profileError.code !== 'PGRST116') throw profileError;

            if (profileData) {
                setProfile(profileData);
                setFullName(profileData.full_name || '');
                setDateOfBirth(profileData.date_of_birth || '');
                setBloodType(profileData.blood_type || '');
                setProfilePin(profileData.profile_pin || '');
            }

            // Fetch allergies
            const { data: allergiesData } = await supabase
                .from('allergies')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });
            setAllergies(allergiesData || []);

            // Fetch conditions
            const { data: conditionsData } = await supabase
                .from('medical_conditions')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });
            setConditions(conditionsData || []);

            // Fetch medications
            const { data: medicationsData } = await supabase
                .from('medications')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });
            setMedications(medicationsData || []);

            // Fetch emergency contacts
            const { data: contactsData } = await supabase
                .from('emergency_contacts')
                .select('*')
                .eq('user_id', user?.id)
                .order('is_primary', { ascending: false });
            setContacts(contactsData || []);

            // Fetch medical documents
            const { data: documentsData } = await supabase
                .from('medical_documents')
                .select('*')
                .eq('user_id', user?.id)
                .order('uploaded_at', { ascending: false });
            setDocuments(documentsData || []);

        } catch (err: any) {
            console.error('Error fetching profile data:', err);
            setError('Failed to load profile data');
        } finally {
            setLoading(false);
        }
    };

    // NEW: Text-to-Speech function
    const readProfileAloud = () => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            alert('Text-to-speech not supported in this browser');
            return;
        }

        // Stop any ongoing speech
        window.speechSynthesis.cancel();

        // Build health summary text
        const allergyList = allergies.map(a => a.allergen).join(', ') || 'None';
        const contactName = contacts[0]?.name || 'Not set';
        const contactPhone = contacts[0]?.phone_number || 'Not set';
        
        let summaryText = `Medical Profile. Name: ${fullName}. `;
        if (bloodType) summaryText += `Blood Type: ${bloodType}. `;
        if (dateOfBirth) summaryText += `Date of Birth: ${dateOfBirth}. `;
        summaryText += `Allergies: ${allergyList}. `;
        summaryText += `Emergency Contact: ${contactName}, Phone: ${contactPhone}.`;

        const utterance = new SpeechSynthesisUtterance(summaryText);
        utterance.lang = language === 'en' ? 'en-US' : 'hi-IN';
        utterance.onstart = () => {};
        utterance.onend = () => {};
        
        window.speechSynthesis.speak(utterance);
    };

    // NEW: Emergency contact auto-dial
    const callEmergencyContact = () => {
        if (contacts.length === 0 || !contacts[0].phone_number) {
            alert('No emergency contact set. Please add an emergency contact first.');
            return;
        }
        
        const phoneNumber = contacts[0].phone_number;
        window.location.href = `tel:${phoneNumber}`;
    };

    // NEW: Translate health summary to Hindi (simple hardcoded translations)
    const getTranslatedSummary = () => {
        if (language === 'en') {
            return {
                name: 'Name',
                bloodType: 'Blood Type',
                dob: 'Date of Birth',
                allergies: 'Allergies',
                emergencyContact: 'Emergency Contact',
                conditions: 'Medical Conditions',
                medications: 'Current Medications',
            };
        } else {
            return {
                name: 'नाम',
                bloodType: 'रक्त समूह',
                dob: 'जन्म तिथि',
                allergies: 'एलर्जी',
                emergencyContact: 'आपातकालीन संपर्क',
                conditions: 'चिकित्सा स्थितियां',
                medications: 'वर्तमान दवाएं',
            };
        }
    };

    const handleSaveProfile = async () => {
        try {
            setSaving(true);
            setError('');
            setSuccess('');

            // Validation: Check required fields
            if (!fullName.trim()) {
                setError('Full name is required');
                setSaving(false);
                return;
            }

            if (!profilePin || profilePin.length !== 4) {
                setError('A 4-digit PIN is required for security');
                setSaving(false);
                return;
            }

            // NEW: Check if profile should be verified
            // Profile is verified if it has:
            // 1. Basic info (name, blood type, DOB, PIN)
            // 2. At least one emergency contact
            // 3. At least one medical record (allergy, condition, or medication)
            const hasBasicInfo = fullName.trim() && bloodType && dateOfBirth && profilePin;
            const hasEmergencyContact = contacts.some(c => c.name.trim() && c.phone_number.trim());
            const hasMedicalRecords = 
                allergies.some(a => a.allergen.trim()) || 
                conditions.some(c => c.condition_name.trim()) || 
                medications.some(m => m.medication_name.trim());
            
            const shouldBeVerified = hasBasicInfo && hasEmergencyContact && hasMedicalRecords;

            // Update profile with verification status
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: user?.id,
                    full_name: fullName,
                    date_of_birth: dateOfBirth || null,
                    blood_type: bloodType || null,
                    profile_pin: profilePin || null,
                    verified: shouldBeVerified, // NEW: Auto-verify if criteria met
                    updated_at: new Date().toISOString(),
                });

            if (profileError) throw profileError;

            // Delete removed allergies first
            const existingAllergyIds = allergies
                .filter(a => !a.id.startsWith('new-'))
                .map(a => a.id);
            
            if (existingAllergyIds.length > 0) {
                const { data: dbAllergies } = await supabase
                    .from('allergies')
                    .select('id')
                    .eq('user_id', user?.id);
                
                const dbAllergyIds = dbAllergies?.map(a => a.id) || [];
                const allergiesToDelete = dbAllergyIds.filter(id => !existingAllergyIds.includes(id));
                
                if (allergiesToDelete.length > 0) {
                    await supabase
                        .from('allergies')
                        .delete()
                        .in('id', allergiesToDelete);
                }
            }

            // Save or update allergies
            for (const allergy of allergies) {
                if (!allergy.allergen.trim()) continue;
                
                if (allergy.id.startsWith('new-')) {
                    const { error } = await supabase.from('allergies').insert({
                        user_id: user?.id,
                        allergen: allergy.allergen,
                        severity: allergy.severity,
                        reaction: allergy.reaction || null,
                    });
                    if (error) throw error;
                } else {
                    const { error } = await supabase
                        .from('allergies')
                        .update({
                            allergen: allergy.allergen,
                            severity: allergy.severity,
                            reaction: allergy.reaction || null,
                        })
                        .eq('id', allergy.id);
                    if (error) throw error;
                }
            }

            // Delete removed conditions first
            const existingConditionIds = conditions
                .filter(c => !c.id.startsWith('new-'))
                .map(c => c.id);
            
            if (existingConditionIds.length > 0) {
                const { data: dbConditions } = await supabase
                    .from('medical_conditions')
                    .select('id')
                    .eq('user_id', user?.id);
                
                const dbConditionIds = dbConditions?.map(c => c.id) || [];
                const conditionsToDelete = dbConditionIds.filter(id => !existingConditionIds.includes(id));
                
                if (conditionsToDelete.length > 0) {
                    await supabase
                        .from('medical_conditions')
                        .delete()
                        .in('id', conditionsToDelete);
                }
            }

            // Save or update conditions
            for (const condition of conditions) {
                if (!condition.condition_name.trim()) continue;
                
                if (condition.id.startsWith('new-')) {
                    const { error } = await supabase.from('medical_conditions').insert({
                        user_id: user?.id,
                        condition_name: condition.condition_name,
                        priority_level: condition.priority_level,
                        notes: condition.notes || null,
                    });
                    if (error) throw error;
                } else {
                    const { error } = await supabase
                        .from('medical_conditions')
                        .update({
                            condition_name: condition.condition_name,
                            priority_level: condition.priority_level,
                            notes: condition.notes || null,
                        })
                        .eq('id', condition.id);
                    if (error) throw error;
                }
            }

            // Delete removed medications first
            const existingMedicationIds = medications
                .filter(m => !m.id.startsWith('new-'))
                .map(m => m.id);
            
            if (existingMedicationIds.length > 0) {
                const { data: dbMedications } = await supabase
                    .from('medications')
                    .select('id')
                    .eq('user_id', user?.id);
                
                const dbMedicationIds = dbMedications?.map(m => m.id) || [];
                const medicationsToDelete = dbMedicationIds.filter(id => !existingMedicationIds.includes(id));
                
                if (medicationsToDelete.length > 0) {
                    await supabase
                        .from('medications')
                        .delete()
                        .in('id', medicationsToDelete);
                }
            }

            // Save or update medications
            for (const medication of medications) {
                if (!medication.medication_name.trim()) continue;
                
                if (medication.id.startsWith('new-')) {
                    const { error } = await supabase.from('medications').insert({
                        user_id: user?.id,
                        medication_name: medication.medication_name,
                        dosage: medication.dosage || null,
                        frequency: medication.frequency || null,
                        notes: medication.notes || null,
                    });
                    if (error) throw error;
                } else {
                    const { error } = await supabase
                        .from('medications')
                        .update({
                            medication_name: medication.medication_name,
                            dosage: medication.dosage || null,
                            frequency: medication.frequency || null,
                            notes: medication.notes || null,
                        })
                        .eq('id', medication.id);
                    if (error) throw error;
                }
            }

            // Delete removed emergency contacts first
            const existingContactIds = contacts
                .filter(c => !c.id.startsWith('new-'))
                .map(c => c.id);
            
            if (existingContactIds.length > 0) {
                const { data: dbContacts } = await supabase
                    .from('emergency_contacts')
                    .select('id')
                    .eq('user_id', user?.id);
                
                const dbContactIds = dbContacts?.map(c => c.id) || [];
                const contactsToDelete = dbContactIds.filter(id => !existingContactIds.includes(id));
                
                if (contactsToDelete.length > 0) {
                    await supabase
                        .from('emergency_contacts')
                        .delete()
                        .in('id', contactsToDelete);
                }
            }

            // Save or update emergency contacts
            for (const contact of contacts) {
                if (!contact.name.trim() || !contact.phone_number.trim()) continue;
                
                if (contact.id.startsWith('new-')) {
                    const { error } = await supabase.from('emergency_contacts').insert({
                        user_id: user?.id,
                        name: contact.name,
                        relationship: contact.relationship || null,
                        phone_number: contact.phone_number,
                        is_primary: contact.is_primary,
                    });
                    if (error) throw error;
                } else {
                    const { error } = await supabase
                        .from('emergency_contacts')
                        .update({
                            name: contact.name,
                            relationship: contact.relationship || null,
                            phone_number: contact.phone_number,
                            is_primary: contact.is_primary,
                        })
                        .eq('id', contact.id);
                    if (error) throw error;
                }
            }

            // NEW: Show verification status in success message
            if (shouldBeVerified) {
                setSuccess('✅ Profile updated and verified successfully! Your emergency medical ID is now complete.');
            } else {
                setSuccess('Profile updated! Add emergency contact and medical information to get verified.');
            }

            // Scroll to top to show success message
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            setTimeout(() => {
                router.push('/dashboard');
            }, 1500);

        } catch (err: any) {
            console.error('Error saving profile:', err);
            setError(err.message || 'Failed to save profile');
            
            // Scroll to top to show error message
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setSaving(false);
        }
    };

    // Add new allergy
    const addAllergy = () => {
        const newAllergy: Allergy = {
            id: `new-${Date.now()}-${Math.random()}`,
            user_id: user?.id || '',
            allergen: '',
            severity: 'moderate',
            reaction: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        setAllergies([...allergies, newAllergy]);
    };

    // Delete allergy
    const deleteAllergy = async (id: string) => {
        if (id.startsWith('new-')) {
            setAllergies(allergies.filter((a) => a.id !== id));
        } else {
            const { error } = await supabase.from('allergies').delete().eq('id', id);
            if (!error) {
                setAllergies(allergies.filter((a) => a.id !== id));
            } else {
                console.error('Error deleting allergy:', error);
            }
        }
    };

    // Add new condition
    const addCondition = () => {
        const newCondition: MedicalCondition = {
            id: `new-${Date.now()}-${Math.random()}`,
            user_id: user?.id || '',
            condition_name: '',
            priority_level: 'medium',
            notes: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        setConditions([...conditions, newCondition]);
    };

    // Delete condition
    const deleteCondition = async (id: string) => {
        if (id.startsWith('new-')) {
            setConditions(conditions.filter((c) => c.id !== id));
        } else {
            const { error } = await supabase.from('medical_conditions').delete().eq('id', id);
            if (!error) {
                setConditions(conditions.filter((c) => c.id !== id));
            } else {
                console.error('Error deleting condition:', error);
            }
        }
    };

    // Add new medication
    const addMedication = () => {
        const newMedication: Medication = {
            id: `new-${Date.now()}-${Math.random()}`,
            user_id: user?.id || '',
            medication_name: '',
            dosage: '',
            frequency: '',
            notes: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        setMedications([...medications, newMedication]);
    };

    // Delete medication
    const deleteMedication = async (id: string) => {
        if (id.startsWith('new-')) {
            setMedications(medications.filter((m) => m.id !== id));
        } else {
            const { error } = await supabase.from('medications').delete().eq('id', id);
            if (!error) {
                setMedications(medications.filter((m) => m.id !== id));
            } else {
                console.error('Error deleting medication:', error);
            }
        }
    };

    // Add new emergency contact
    const addContact = () => {
        const newContact: EmergencyContact = {
            id: `new-${Date.now()}-${Math.random()}`,
            user_id: user?.id || '',
            name: '',
            relationship: '',
            phone_number: '',
            is_primary: contacts.length === 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        setContacts([...contacts, newContact]);
    };

    // Delete emergency contact
    const deleteContact = async (id: string) => {
        if (id.startsWith('new-')) {
            setContacts(contacts.filter((c) => c.id !== id));
        } else {
            const { error } = await supabase.from('emergency_contacts').delete().eq('id', id);
            if (!error) {
                setContacts(contacts.filter((c) => c.id !== id));
            } else {
                console.error('Error deleting contact:', error);
            }
        }
    };

    // Handle document upload
    const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'prescription' | 'surgery') => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            setError('Please upload JPG, PNG, HEIC, or PDF files only');
            return;
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            setError('File size must be less than 10MB');
            return;
        }

        try {
            setUploadingDoc(true);
            setError('');

            // Upload to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${user?.id}/${type}/${Date.now()}.${fileExt}`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('medical-documents')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('medical-documents')
                .getPublicUrl(fileName);

            // Save document metadata to database
            const { error: dbError } = await supabase
                .from('medical_documents')
                .insert({
                    user_id: user?.id,
                    document_name: file.name,
                    document_type: type,
                    document_url: urlData.publicUrl,
                    file_size: file.size,
                    uploaded_at: new Date().toISOString(),
                });

            if (dbError) throw dbError;

            setSuccess(`${type === 'prescription' ? 'Prescription' : 'Surgery document'} uploaded successfully!`);
            fetchProfileData(); // Refresh documents list
            
            // Reset file input
            e.target.value = '';
        } catch (err: any) {
            console.error('Error uploading document:', err);
            setError(err.message || 'Failed to upload document');
        } finally {
            setUploadingDoc(false);
        }
    };

    // Delete document
    const handleDeleteDocument = async (doc: MedicalDocument) => {
        if (!confirm(`Delete ${doc.document_name}?`)) return;

        try {
            // Extract file path from URL
            const urlParts = doc.document_url.split('/');
            const filePath = urlParts.slice(urlParts.indexOf('medical-documents') + 1).join('/');

            // Delete from storage
            await supabase.storage
                .from('medical-documents')
                .remove([filePath]);

            // Delete from database
            const { error } = await supabase
                .from('medical_documents')
                .delete()
                .eq('id', doc.id);

            if (error) throw error;

            setSuccess('Document deleted successfully');
            fetchProfileData();
        } catch (err: any) {
            console.error('Error deleting document:', err);
            setError('Failed to delete document');
        }
    };

    const getDocumentIcon = (fileName: string) => {
        const ext = fileName.toLowerCase().split('.').pop();
        if (['jpg', 'jpeg', 'png', 'heic'].includes(ext || '')) {
            return <ImageIcon className="h-8 w-8 text-blue-400" />;
        }
        return <FileText className="h-8 w-8 text-green-400" />;
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-theme-page flex items-center justify-center">
                <Loader2 className="h-12 w-12 text-cyan-400 animate-spin" />
            </div>
        );
    }

    const translations = getTranslatedSummary();

    return (
        <div className="min-h-screen bg-theme-page relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-48 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            {/* Navigation */}
            <nav className="border-b border-white/10 backdrop-blur-xl bg-slate-900/30 relative z-10">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <Button 
                        variant="ghost" 
                        onClick={() => router.push('/dashboard')}
                        className="hover:bg-cyan-500/10 hover:text-cyan-300"
                    >
                        <ArrowLeft className="h-5 w-5 mr-2" />
                        Back to Dashboard
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-theme-gradient flex items-center justify-center">
                            <Heart className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white">
                            Edit Profile
                        </span>
                    </div>
                </div>
            </nav>

            <div className="container mx-auto px-4 py-8 relative z-10 max-w-5xl">
                {/* REMOVED: Quick Actions Banner with Read Profile, Call Emergency, and Generate QR buttons */}

                {/* Success/Error Messages */}
                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-400/30 flex items-center gap-3 text-red-300">
                        <AlertCircle className="h-5 w-5" />
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-400/30 flex items-center gap-3 text-green-300">
                        <CheckCircle className="h-5 w-5" />
                        <span>{success}</span>
                    </div>
                )}

                {/* NEW: Health Summary Card (Multi-language) */}
                <Card className="mb-6 bg-slate-900/40 border-cyan-400/30 backdrop-blur-xl hover-theme">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 border border-green-400/30 flex items-center justify-center">
                                <User className="h-6 w-6 text-green-400" />
                            </div>
                            <CardTitle className="text-white text-2xl">Public Health Summary</CardTitle>
                        </div>
                        <CardDescription className="text-blue-200/70">
                            This information is always visible to emergency responders
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white">
                            <div>
                                <p className="text-cyan-300/70 text-sm">{translations.name}</p>
                                <p className="text-lg font-semibold">{fullName || 'Not set'}</p>
                            </div>
                            <div>
                                <p className="text-cyan-300/70 text-sm">{translations.bloodType}</p>
                                <p className="text-lg font-semibold">{bloodType || 'Not set'}</p>
                            </div>
                            <div>
                                <p className="text-cyan-300/70 text-sm">{translations.dob}</p>
                                <p className="text-lg font-semibold">{dateOfBirth || 'Not set'}</p>
                            </div>
                            <div>
                                <p className="text-cyan-300/70 text-sm">{translations.allergies}</p>
                                <p className="text-lg font-semibold">
                                    {allergies.length > 0 
                                        ? allergies.map(a => a.allergen).join(', ')
                                        : 'None'}
                                </p>
                            </div>
                            <div className="md:col-span-2">
                                <p className="text-cyan-300/70 text-sm">{translations.emergencyContact}</p>
                                <p className="text-lg font-semibold">
                                    {contacts[0] 
                                        ? `${contacts[0].name} - ${contacts[0].phone_number}`
                                        : 'Not set'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Personal Information */}
                <Card className="mb-6 bg-slate-900/40 border-cyan-400/30 backdrop-blur-xl hover-theme">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border border-cyan-400/30 flex items-center justify-center">
                                <User className="h-6 w-6 text-cyan-400" />
                            </div>
                            <CardTitle className="text-white text-2xl">Personal Information</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-cyan-300 font-medium">Full Name *</label>
                                <Input
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="bg-slate-800/50 border-slate-600/50 text-white"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-cyan-300 font-medium">Date of Birth</label>
                                <Input
                                    type="date"
                                    value={dateOfBirth}
                                    onChange={(e) => setDateOfBirth(e.target.value)}
                                    className="bg-slate-800/50 border-slate-600/50 text-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-cyan-300 font-medium">Blood Type</label>
                                <select
                                    value={bloodType}
                                    onChange={(e) => setBloodType(e.target.value)}
                                    className="w-full h-10 rounded-md bg-slate-800/50 border border-slate-600/50 text-white px-3"
                                >
                                    <option value="">Select Blood Type</option>
                                    <option value="A+">A+</option>
                                    <option value="A-">A-</option>
                                    <option value="B+">B+</option>
                                    <option value="B-">B-</option>
                                    <option value="AB+">AB+</option>
                                    <option value="AB-">AB-</option>
                                    <option value="O+">O+</option>
                                    <option value="O-">O-</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-cyan-300 font-medium">Security PIN (4 digits) *</label>
                                <Input
                                    type="password"
                                    value={profilePin}
                                    onChange={(e) => setProfilePin(e.target.value.slice(0, 4))}
                                    className="bg-slate-800/50 border-slate-600/50 text-white"
                                    placeholder="••••"
                                    maxLength={4}
                                />
                                <p className="text-xs text-blue-200/70">
                                    Required to protect sensitive medical information
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Allergies Section */}
                <Card className="mb-6 bg-slate-900/40 border-cyan-400/30 backdrop-blur-xl hover-theme">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-400/30 flex items-center justify-center">
                                    <AlertCircle className="h-6 w-6 text-red-400" />
                                </div>
                                <div>
                                    <CardTitle className="text-white text-2xl">Allergies</CardTitle>
                                    <CardDescription className="text-blue-200/70">
                                        Critical allergy information
                                    </CardDescription>
                                </div>
                            </div>
                            <Button
                                onClick={addAllergy}
                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Allergy
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {allergies.length === 0 ? (
                            <p className="text-blue-200/70 text-center py-4">No allergies added yet</p>
                        ) : (
                            allergies.map((allergy, index) => (
                                <div key={allergy.id} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-cyan-300 font-semibold">Allergy #{index + 1}</span>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => deleteAllergy(allergy.id)}
                                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs text-cyan-300/70">Allergen *</label>
                                            <Input
                                                value={allergy.allergen}
                                                onChange={(e) => {
                                                    const updated = [...allergies];
                                                    updated[index].allergen = e.target.value;
                                                    setAllergies(updated);
                                                }}
                                                placeholder="e.g., Peanuts, Penicillin"
                                                className="bg-slate-900/50 border-slate-600/50 text-white"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-cyan-300/70">Severity</label>
                                            <select
                                                value={allergy.severity}
                                                onChange={(e) => {
                                                    const updated = [...allergies];
                                                    updated[index].severity = e.target.value as any;
                                                    setAllergies(updated);
                                                }}
                                                className="w-full h-10 rounded-md bg-slate-900/50 border border-slate-600/50 text-white px-3"
                                            >
                                                <option value="mild">Mild</option>
                                                <option value="moderate">Moderate</option>
                                                <option value="severe">Severe</option>
                                                <option value="life-threatening">Life-Threatening</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-cyan-300/70">Reaction</label>
                                            <Input
                                                value={allergy.reaction || ''}
                                                onChange={(e) => {
                                                    const updated = [...allergies];
                                                    updated[index].reaction = e.target.value;
                                                    setAllergies(updated);
                                                }}
                                                className="bg-slate-900/50 border-slate-600/50 text-white"
                                                placeholder="e.g., Hives, Anaphylaxis"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Medical Conditions Section */}
                <Card className="mb-6 bg-slate-900/40 border-cyan-400/30 backdrop-blur-xl hover-theme">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-400/30 flex items-center justify-center">
                                    <Shield className="h-6 w-6 text-yellow-400" />
                                </div>
                                <div>
                                    <CardTitle className="text-white text-2xl">Medical Conditions</CardTitle>
                                    <CardDescription className="text-blue-200/70">
                                        Current health conditions
                                    </CardDescription>
                                </div>
                            </div>
                            <Button
                                onClick={addCondition}
                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Condition
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {conditions.length === 0 ? (
                            <p className="text-blue-200/70 text-center py-4">No conditions added yet</p>
                        ) : (
                            conditions.map((condition, index) => (
                                <div key={condition.id} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-cyan-300 font-semibold">Condition #{index + 1}</span>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => deleteCondition(condition.id)}
                                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs text-cyan-300/70">Condition Name *</label>
                                            <Input
                                                value={condition.condition_name}
                                                onChange={(e) => {
                                                    const updated = [...conditions];
                                                    updated[index].condition_name = e.target.value;
                                                    setConditions(updated);
                                                }}
                                                placeholder="e.g., Diabetes, Hypertension"
                                                className="bg-slate-900/50 border-slate-600/50 text-white"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-cyan-300/70">Priority Level</label>
                                            <select
                                                value={condition.priority_level}
                                                onChange={(e) => {
                                                    const updated = [...conditions];
                                                    updated[index].priority_level = e.target.value as any;
                                                    setConditions(updated);
                                                }}
                                                className="w-full h-10 rounded-md bg-slate-900/50 border border-slate-600/50 text-white px-3"
                                            >
                                                <option value="low">Low</option>
                                                <option value="medium">Medium</option>
                                                <option value="high">High</option>
                                                <option value="critical">Critical</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1 md:col-span-2">
                                            <label className="text-xs text-cyan-300/70">Notes</label>
                                            <Input
                                                value={condition.notes || ''}
                                                onChange={(e) => {
                                                    const updated = [...conditions];
                                                    updated[index].notes = e.target.value;
                                                    setConditions(updated);
                                                }}
                                                className="bg-slate-900/50 border-slate-600/50 text-white"
                                                placeholder="Additional information"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Medications Section */}
                <Card className="mb-6 bg-slate-900/40 border-cyan-400/30 backdrop-blur-xl hover-theme">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-400/30 flex items-center justify-center">
                                    <Droplet className="h-6 w-6 text-green-400" />
                                </div>
                                <div>
                                    <CardTitle className="text-white text-2xl">Current Medications</CardTitle>
                                    <CardDescription className="text-blue-200/70">
                                        Active prescriptions
                                    </CardDescription>
                                </div>
                            </div>
                            <Button
                                onClick={addMedication}
                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Medication
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {medications.length === 0 ? (
                            <p className="text-blue-200/70 text-center py-4">No medications added yet</p>
                        ) : (
                            medications.map((medication, index) => (
                                <div key={medication.id} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-cyan-300 font-semibold">Medication #{index + 1}</span>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => deleteMedication(medication.id)}
                                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs text-cyan-300/70">Medication Name *</label>
                                            <Input
                                                value={medication.medication_name}
                                                onChange={(e) => {
                                                    const updated = [...medications];
                                                    updated[index].medication_name = e.target.value;
                                                    setMedications(updated);
                                                }}
                                                placeholder="e.g., Aspirin, Metformin"
                                                className="bg-slate-900/50 border-slate-600/50 text-white"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-cyan-300/70">Dosage</label>
                                            <Input
                                                value={medication.dosage || ''}
                                                onChange={(e) => {
                                                    const updated = [...medications];
                                                    updated[index].dosage = e.target.value;
                                                    setMedications(updated);
                                                }}
                                                className="bg-slate-900/50 border-slate-600/50 text-white"
                                                placeholder="e.g., 500mg"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-cyan-300/70">Frequency</label>
                                            <Input
                                                value={medication.frequency || ''}
                                                onChange={(e) => {
                                                    const updated = [...medications];
                                                    updated[index].frequency = e.target.value;
                                                    setMedications(updated);
                                                }}
                                                className="bg-slate-900/50 border-slate-600/50 text-white"
                                                placeholder="e.g., Twice daily"
                                            />
                                        </div>
                                        <div className="space-y-1 md:col-span-3">
                                            <label className="text-xs text-cyan-300/70">Notes</label>
                                            <Input
                                                value={medication.notes || ''}
                                                onChange={(e) => {
                                                    const updated = [...medications];
                                                    updated[index].notes = e.target.value;
                                                    setMedications(updated);
                                                }}
                                                className="bg-slate-900/50 border-slate-600/50 text-white"
                                                placeholder="Special instructions"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Emergency Contacts Section */}
                <Card className="mb-6 bg-slate-900/40 border-cyan-400/30 backdrop-blur-xl hover-theme">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-400/30 flex items-center justify-center">
                                    <Phone className="h-6 w-6 text-blue-400" />
                                </div>
                                <div>
                                    <CardTitle className="text-white text-2xl">Emergency Contacts</CardTitle>
                                    <CardDescription className="text-blue-200/70">
                                        Who to call in emergencies
                                    </CardDescription>
                                </div>
                            </div>
                            <Button
                                onClick={addContact}
                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Contact
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {contacts.length === 0 ? (
                            <p className="text-blue-200/70 text-center py-4">No emergency contacts added yet</p>
                        ) : (
                            contacts.map((contact, index) => (
                                <div key={contact.id} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-cyan-300 font-semibold">Contact #{index + 1}</span>
                                            {contact.is_primary && (
                                                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs border border-green-400/30">
                                                    Primary
                                                </span>
                                            )}
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => deleteContact(contact.id)}
                                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs text-cyan-300/70">Name *</label>
                                            <Input
                                                value={contact.name}
                                                onChange={(e) => {
                                                    const updated = [...contacts];
                                                    updated[index].name = e.target.value;
                                                    setContacts(updated);
                                                }}
                                                className="bg-slate-900/50 border-slate-600/50 text-white"
                                                placeholder="Contact name"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-cyan-300/70">Relationship</label>
                                            <Input
                                                value={contact.relationship || ''}
                                                onChange={(e) => {
                                                    const updated = [...contacts];
                                                    updated[index].relationship = e.target.value;
                                                    setContacts(updated);
                                                }}
                                                className="bg-slate-900/50 border-slate-600/50 text-white"
                                                placeholder="e.g., Mother, Friend"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-cyan-300/70">Phone Number *</label>
                                            <Input
                                                value={contact.phone_number}
                                                onChange={(e) => {
                                                    const updated = [...contacts];
                                                    updated[index].phone_number = e.target.value;
                                                    setContacts(updated);
                                                }}
                                                className="bg-slate-900/50 border-slate-600/50 text-white"
                                                placeholder="+1 234 567 8900"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 md:col-span-3">
                                            <input
                                                type="checkbox"
                                                checked={contact.is_primary}
                                                onChange={(e) => {
                                                    const updated = contacts.map((c, i) => ({
                                                        ...c,
                                                        is_primary: i === index ? e.target.checked : false,
                                                    }));
                                                    setContacts(updated);
                                                }}
                                                className="h-4 w-4"
                                            />
                                            <label className="text-sm text-cyan-300">Set as primary contact</label>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Prescriptions Section */}
                <Card className="mb-6 bg-slate-900/40 border-cyan-400/30 backdrop-blur-xl hover-theme">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-400/30 flex items-center justify-center">
                                    <FileText className="h-6 w-6 text-blue-400" />
                                </div>
                                <div>
                                    <CardTitle className="text-white text-2xl">Prescriptions</CardTitle>
                                    <CardDescription className="text-blue-200/70">
                                        Upload current and past prescriptions
                                    </CardDescription>
                                </div>
                            </div>
                            <label htmlFor="prescription-upload">
                                <Button
                                    type="button"
                                    disabled={uploadingDoc}
                                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 cursor-pointer"
                                    onClick={() => document.getElementById('prescription-upload')?.click()}
                                >
                                    {uploadingDoc && uploadType === 'prescription' ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4 mr-2" />
                                            Upload Prescription
                                        </>
                                    )}
                                </Button>
                                <input
                                    id="prescription-upload"
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/heic,application/pdf"
                                    onChange={(e) => handleDocumentUpload(e, 'prescription')}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {documents.filter(d => d.document_type === 'prescription').length === 0 ? (
                            <p className="text-blue-200/70 text-center py-4">No prescriptions uploaded yet</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {documents.filter(d => d.document_type === 'prescription').map((doc) => (
                                    <div key={doc.id} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0">
                                                {getDocumentIcon(doc.document_name)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-semibold truncate">{doc.document_name}</p>
                                                <p className="text-blue-200/70 text-xs">
                                                    Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                                                </p>
                                                {doc.file_size && (
                                                    <p className="text-blue-200/50 text-xs">
                                                        Size: {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() => window.open(doc.document_url, '_blank')}
                                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                                            >
                                                View
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDeleteDocument(doc)}
                                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Past Surgeries Section */}
                <Card className="mb-6 bg-slate-900/40 border-cyan-400/30 backdrop-blur-xl hover-theme">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-400/30 flex items-center justify-center">
                                    <FileText className="h-6 w-6 text-purple-400" />
                                </div>
                                <div>
                                    <CardTitle className="text-white text-2xl">Past Surgeries</CardTitle>
                                    <CardDescription className="text-blue-200/70">
                                        Upload surgery records and reports
                                    </CardDescription>
                                </div>
                            </div>
                            <label htmlFor="surgery-upload">
                                <Button
                                    type="button"
                                    disabled={uploadingDoc}
                                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 cursor-pointer"
                                    onClick={() => document.getElementById('surgery-upload')?.click()}
                                >
                                    {uploadingDoc && uploadType === 'surgery' ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4 mr-2" />
                                            Upload Surgery Record
                                        </>
                                    )}
                                </Button>
                                <input
                                    id="surgery-upload"
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/heic,application/pdf"
                                    onChange={(e) => handleDocumentUpload(e, 'surgery')}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {documents.filter(d => d.document_type === 'surgery').length === 0 ? (
                            <p className="text-blue-200/70 text-center py-4">No surgery records uploaded yet</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {documents.filter(d => d.document_type === 'surgery').map((doc) => (
                                    <div key={doc.id} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0">
                                                {getDocumentIcon(doc.document_name)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-semibold truncate">{doc.document_name}</p>
                                                <p className="text-purple-200/70 text-xs">
                                                    Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                                                </p>
                                                {doc.file_size && (
                                                    <p className="text-purple-200/50 text-xs">
                                                        Size: {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() => window.open(doc.document_url, '_blank')}
                                                className="flex-1 bg-purple-600 hover:bg-purple-700"
                                            >
                                                View
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDeleteDocument(doc)}
                                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-4 justify-end">
                    <Button
                        variant="outline"
                        onClick={() => router.push('/dashboard')}
                        disabled={saving}
                        className="border-cyan-400/30 hover:border-cyan-400 hover:bg-cyan-500/10 text-cyan-300"
                    >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSaveProfile}
                        disabled={saving || !fullName || !profilePin || profilePin.length !== 4}
                        className="bg-theme-gradient hover:shadow-xl hover:shadow-cyan-500/50"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                Save Profile
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}