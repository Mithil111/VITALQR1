'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import {
    ArrowLeft,
    Heart,
    Globe,
    WifiOff,
    Loader2,
    Download,
    Share2,
    Printer,
    Palette,
    Type,
    CheckCircle,
    AlertCircle,
    Save,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import type { Profile, MedicalCondition, Allergy, EmergencyContact, Medication } from '@/lib/types';
import QRCodeLib from 'qrcode';

// NEW: Color presets for cards and QR codes
const CARD_COLOR_PRESETS = [
    { name: 'Classic White', color: '#ffffff', textColor: '#000000' },
    { name: 'Medical Blue', color: '#e3f2fd', textColor: '#1565c0' },
    { name: 'Emergency Red', color: '#ffebee', textColor: '#c62828' },
    { name: 'Health Green', color: '#e8f5e9', textColor: '#2e7d32' },
    { name: 'Professional Gray', color: '#f5f5f5', textColor: '#424242' },
];

const QR_COLOR_PRESETS = [
    { name: 'Classic Black', fg: '#000000', bg: '#ffffff', safe: true },
    { name: 'Medical Blue', fg: '#0ea5e9', bg: '#ffffff', safe: true },
    { name: 'Emergency Red', fg: '#dc2626', bg: '#ffffff', safe: true },
    { name: 'Health Green', fg: '#16a34a', bg: '#ffffff', safe: true },
    { name: 'Purple', fg: '#a855f7', bg: '#ffffff', safe: true },
];

export default function QRPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [conditions, setConditions] = useState<MedicalCondition[]>([]);
    const [allergies, setAllergies] = useState<Allergy[]>([]);
    const [contacts, setContacts] = useState<EmergencyContact[]>([]);
    const [medications, setMedications] = useState<Medication[]>([]);
    const [loading, setLoading] = useState(true);
    
    // QR Code states
    const [onlineQR, setOnlineQR] = useState<string>('');
    const [offlineQR, setOfflineQR] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'online' | 'offline'>('online');

    // NEW: Customization states
    const [customText, setCustomText] = useState('');
    const [textSize, setTextSize] = useState<'small' | 'medium' | 'large'>('medium');
    const [cardBgColor, setCardBgColor] = useState('#ffffff');
    const [cardTextColor, setCardTextColor] = useState('#000000');
    const [qrFgColor, setQrFgColor] = useState('#000000');
    const [qrBgColor, setQrBgColor] = useState('#ffffff');
    const [showCustomization, setShowCustomization] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [colorWarning, setColorWarning] = useState('');

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user) {
            fetchProfileData();
        }
    }, [user]);

    useEffect(() => {
        if (profile) {
            // Load saved customization preferences
            setCustomText(profile.qr_custom_text || '');
            setTextSize(profile.qr_text_size || 'medium');
            setCardBgColor(profile.card_bg_color || '#ffffff');
            setCardTextColor(profile.card_text_color || '#000000'); // FIXED: Now properly loads saved value
            setQrFgColor(profile.qr_fg_color || '#000000');
            setQrBgColor(profile.qr_bg_color || '#ffffff');
            
            generateQRCodes();
        }
    }, [profile, customText, textSize, cardBgColor, cardTextColor, qrFgColor, qrBgColor]); // ADDED: cardTextColor to dependency array

    const fetchProfileData = async () => {
        try {
            setLoading(true);

            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user?.id)
                .single();
            setProfile(profileData);

            const { data: conditionsData } = await supabase
                .from('medical_conditions')
                .select('*')
                .eq('user_id', user?.id)
                .order('priority_level', { ascending: false });
            setConditions(conditionsData || []);

            const { data: allergiesData } = await supabase
                .from('allergies')
                .select('*')
                .eq('user_id', user?.id)
                .order('severity', { ascending: false });
            setAllergies(allergiesData || []);

            const { data: medicationsData } = await supabase
                .from('medications')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });
            setMedications(medicationsData || []);

            const { data: contactsData } = await supabase
                .from('emergency_contacts')
                .select('*')
                .eq('user_id', user?.id)
                .eq('is_primary', true)
                .limit(1);
            setContacts(contactsData || []);
        } catch (error) {
            console.error('Error fetching profile data:', error);
        } finally {
            setLoading(false);
        }
    };

    // NEW: Check QR color contrast for scannability
    const checkQRColorContrast = (fg: string, bg: string) => {
        const getLuminance = (hex: string) => {
            const rgb = parseInt(hex.slice(1), 16);
            const r = (rgb >> 16) & 0xff;
            const g = (rgb >> 8) & 0xff;
            const b = (rgb >> 0) & 0xff;
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };

        const fgLum = getLuminance(fg);
        const bgLum = getLuminance(bg);
        const contrast = Math.abs(fgLum - bgLum);

        if (contrast < 100) {
            setColorWarning('⚠️ Low contrast! QR code may be hard to scan. Choose darker foreground or lighter background.');
            return false;
        } else {
            setColorWarning('');
            return true;
        }
    };

    const generateQRCodes = async () => {
        if (!profile) return;

        const onlineURL = `${window.location.origin}/emergency/${user?.id}`;
        const offlineData = createOfflineData();

        try {
            const onlineDataURL = await QRCodeLib.toDataURL(onlineURL, {
                width: 400,
                color: { dark: qrFgColor, light: qrBgColor },
                errorCorrectionLevel: 'H',
            });
            setOnlineQR(onlineDataURL);

            const offlineDataURL = await QRCodeLib.toDataURL(offlineData, {
                width: 400,
                color: { dark: qrFgColor, light: qrBgColor },
                errorCorrectionLevel: 'M',
            });
            setOfflineQR(offlineDataURL);
        } catch (error) {
            console.error('Error generating QR codes:', error);
        }
    };

    const createOfflineData = (): string => {
        const criticalAllergies = allergies
            .filter(a => a.severity === 'severe' || a.severity === 'life-threatening')
            .map(a => a.allergen)
            .join(', ');

        const highPriorityConditions = conditions
            .filter(c => c.priority_level === 'high' || c.priority_level === 'critical')
            .map(c => c.condition_name)
            .join(', ');

        const currentMedications = medications && medications.length > 0 
            ? medications.map(med => {
                let medInfo = med.medication_name;
                if (med.dosage) medInfo += ` (${med.dosage})`;
                if (med.frequency) medInfo += ` - ${med.frequency}`;
                return medInfo;
            }).join('\n')
            : 'None recorded';

        const primaryContact = contacts[0];

        return `
EMERGENCY MEDICAL ID
Name: ${profile?.full_name || 'N/A'}
Blood Type: ${profile?.blood_type || 'N/A'}
DOB: ${profile?.date_of_birth || 'N/A'}

CRITICAL ALLERGIES:
${criticalAllergies || 'None recorded'}

HIGH PRIORITY CONDITIONS:
${highPriorityConditions || 'None recorded'}

CURRENT MEDICATIONS:
${currentMedications}

EMERGENCY CONTACT:
${primaryContact ? `${primaryContact.name} (${primaryContact.relationship || 'Contact'})` : 'Not set'}
Phone: ${primaryContact?.phone_number || 'Not set'}

For full medical profile, scan the ONLINE QR code.
`.trim();
    };

    // NEW: Save customization preferences
    const saveCustomization = async () => {
        try {
            setSaving(true);
            setSaveSuccess(false);

            const { error } = await supabase
                .from('profiles')
                .update({
                    qr_custom_text: customText.slice(0, 100),
                    qr_text_size: textSize,
                    card_bg_color: cardBgColor,
                    card_text_color: cardTextColor, // ADDED: Save card text color
                    qr_fg_color: qrFgColor,
                    qr_bg_color: qrBgColor,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user?.id);

            if (error) throw error;

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error('Error saving customization:', error);
            alert('Failed to save customization preferences');
        } finally {
            setSaving(false);
        }
    };

    // NEW: Share card
    const shareCard = async () => {
        try {
            const blob = await generateCardImage(activeTab);
            const file = new File([blob], `medical-id-card-${activeTab}.png`, { type: 'image/png' });

            if (typeof navigator !== 'undefined' && navigator.share) {
                await navigator.share({
                    title: 'My VitalQR Medical ID Card',
                    text: 'Emergency Medical ID Card - Scan in case of emergency',
                    files: [file],
                });
            } else {
                alert('Share not supported on this device. Use Download instead.');
            }
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    // NEW: Print card
    const printCard = async () => {
        const blob = await generateCardImage(activeTab);
        const url = URL.createObjectURL(blob);
        
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head>
                    <title>Print Medical ID Card</title>
                    <style>
                        @page { size: 3.375in 2.125in; margin: 0; }
                        body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; }
                        img { width: 100%; height: auto; }
                    </style>
                </head>
                <body>
                    <img src="${url}" onload="window.print(); window.close();" />
                </body>
                </html>
            `);
        }
    };

    // NEW: Add missing generateCardImage function
    const generateCardImage = async (type: 'online' | 'offline'): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('Canvas not supported');

                // Card dimensions (3.375" × 2.125" at 300 DPI)
                const width = 1012; // 3.375 * 300
                const height = 637; // 2.125 * 300
                canvas.width = width;
                canvas.height = height;

                // Draw card background
                ctx.fillStyle = cardBgColor;
                ctx.fillRect(0, 0, width, height);

                // Draw border
                ctx.strokeStyle = cardTextColor;
                ctx.lineWidth = 12;
                ctx.strokeRect(6, 6, width - 12, height - 12);

                // Draw title
                ctx.fillStyle = cardTextColor;
                ctx.font = 'bold 48px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('EMERGENCY MEDICAL ID', width / 2, 80);

                // Draw QR code
                const qrImage = new Image();
                qrImage.crossOrigin = 'anonymous';
                qrImage.src = type === 'online' ? onlineQR : offlineQR;
                
                qrImage.onload = () => {
                    const qrSize = 320;
                    const qrX = (width - qrSize) / 2;
                    const qrY = 120;
                    ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

                    // Draw custom text
                    if (customText) {
                        const fontSize = textSize === 'small' ? 28 : textSize === 'large' ? 44 : 36;
                        ctx.font = `600 ${fontSize}px Arial`;
                        ctx.fillStyle = cardTextColor;
                        ctx.textAlign = 'center';
                        ctx.fillText(customText, width / 2, qrY + qrSize + 60);
                    }

                    // Draw type label
                    ctx.font = '32px Arial';
                    ctx.fillStyle = cardTextColor;
                    ctx.textAlign = 'center';
                    const typeText = type === 'online' ? '🌐 Online (Requires Internet)' : '📴 Offline (Works Anywhere)';
                    ctx.fillText(typeText, width / 2, height - 40);

                    // Convert canvas to blob
                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('Failed to create image'));
                    }, 'image/png');
                };

                qrImage.onerror = () => reject(new Error('Failed to load QR code'));
            } catch (error) {
                reject(error);
            }
        });
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-theme-page flex items-center justify-center">
                <Loader2 className="h-12 w-12 text-cyan-400 animate-spin" />
            </div>
        );
    }

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
                        className="hover:bg-cyan-500/10 hover:text-cyan-300 transition-all duration-300"
                    >
                        <ArrowLeft className="h-5 w-5 mr-2" />
                        Back to Dashboard
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-theme-gradient flex items-center justify-center shadow-lg">
                            <Heart className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xl font-bold text-theme-gradient">
                            Your QR Codes
                        </span>
                    </div>
                </div>
            </nav>

            <div className="container mx-auto px-4 py-8 relative z-10 max-w-6xl">
                {/* QR Type Selector */}
                <div className="flex gap-4 justify-center mb-8">
                    <Button
                        onClick={() => setActiveTab('online')}
                        className={`${
                            activeTab === 'online'
                                ? 'bg-theme-gradient shadow-lg shadow-cyan-500/50'
                                : 'bg-slate-800/50 border border-cyan-400/30 hover:border-cyan-400'
                        } transition-all duration-300 transform hover:scale-105`}
                    >
                        <Globe className="h-5 w-5 mr-2" />
                        Online QR
                    </Button>
                    <Button
                        onClick={() => setActiveTab('offline')}
                        className={`${
                            activeTab === 'offline'
                                ? 'bg-theme-accent shadow-lg shadow-purple-500/50'
                                : 'bg-slate-800/50 border border-cyan-400/30 hover:border-cyan-400'
                        } transition-all duration-300 transform hover:scale-105`}
                    >
                        <WifiOff className="h-5 w-5 mr-2" />
                        Offline QR
                    </Button>
                </div>

                {/* MODIFIED: Improved Customization Toggle */}
                <div className="flex justify-center mb-6">
                    <Button
                        onClick={() => setShowCustomization(!showCustomization)}
                        variant="outline"
                        className="border-cyan-400/30 hover:border-cyan-400 hover:bg-cyan-500/10 h-14 px-8 text-lg gap-3 transition-all duration-300"
                    >
                        <Palette className="h-6 w-6" />
                        {showCustomization ? 'Hide Customization' : 'Customize Your Card'}
                        <span className={`transition-transform duration-300 ${showCustomization ? 'rotate-180' : ''}`}>
                            ▼
                        </span>
                    </Button>
                </div>

                {/* ENHANCED: Customization Panel */}
                {showCustomization && (
                    <Card className="bg-slate-900/40 border-cyan-400/30 backdrop-blur-xl hover-theme mb-6">
                        <CardHeader>
                            <CardTitle className="text-white text-2xl flex items-center gap-3">
                                <Palette className="h-6 w-6 text-cyan-400" />
                                Customize Your Medical ID Card
                            </CardTitle>
                            <CardDescription className="text-blue-200/70 text-base">
                                Personalize colors, text, and styling - all changes update in real-time
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            {/* SECTION 1: Custom Text */}
                            <div className="p-6 rounded-xl bg-slate-800/50 border border-cyan-400/20 space-y-4">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="h-10 w-10 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                                        <Type className="h-5 w-5 text-blue-400" />
                                    </div>
                                    <h3 className="text-white text-xl font-bold">Add Text Below QR Code</h3>
                                </div>
                                
                                <div className="space-y-3">
                                    <label className="text-cyan-300 font-semibold flex items-center gap-2 text-base">
                                        Custom Text (Optional)
                                        <span className="text-xs text-blue-200/50 font-normal">(Appears below QR code)</span>
                                    </label>
                                    <Input
                                        value={customText}
                                        onChange={(e) => setCustomText(e.target.value.slice(0, 100))}
                                        placeholder="e.g., John Doe - Emergency: +1-555-0123"
                                        className="bg-slate-900/50 border-slate-600/50 text-white h-12 text-base"
                                        maxLength={100}
                                    />
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-blue-200/70">
                                            💡 Tip: Add your name or emergency contact number
                                        </span>
                                        <span className="text-cyan-300 font-medium">
                                            {customText.length}/100
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-cyan-300 font-semibold text-base">Text Size</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['small', 'medium', 'large'].map((size) => (
                                            <Button
                                                key={size}
                                                onClick={() => setTextSize(size as any)}
                                                className={`h-14 text-base font-semibold transition-all duration-300 ${
                                                    textSize === size
                                                        ? 'bg-cyan-600 hover:bg-cyan-700 scale-105 shadow-lg shadow-cyan-500/30'
                                                        : 'bg-slate-800 hover:bg-slate-700 border border-slate-600'
                                                }`}
                                            >
                                                {size === 'small' && '📏 Small'}
                                                {size === 'medium' && '📐 Medium'}
                                                {size === 'large' && '📊 Large'}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: Card Colors */}
                            <div className="p-6 rounded-xl bg-slate-800/50 border border-cyan-400/20 space-y-4">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="h-10 w-10 rounded-lg bg-purple-500/20 border border-purple-400/30 flex items-center justify-center">
                                        <Palette className="h-5 w-5 text-purple-400" />
                                    </div>
                                    <h3 className="text-white text-xl font-bold">Card Background & Text Colors</h3>
                                </div>
                                
                                <label className="text-cyan-300 font-semibold text-base block mb-3">Preset Color Themes</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {CARD_COLOR_PRESETS.map((preset) => (
                                        <button
                                            key={preset.name}
                                            onClick={() => {
                                                setCardBgColor(preset.color);
                                                setCardTextColor(preset.textColor);
                                            }}
                                            className={`p-5 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                                                cardBgColor === preset.color
                                                    ? 'border-cyan-400 shadow-xl shadow-cyan-500/30 scale-105'
                                                    : 'border-slate-600 hover:border-cyan-400/50'
                                            }`}
                                            style={{ 
                                                backgroundColor: preset.color, 
                                                color: preset.textColor 
                                            }}
                                        >
                                            <div className="font-bold text-base text-center">
                                                {preset.name}
                                            </div>
                                            <div className="text-xs mt-2 opacity-70 text-center">
                                                Sample Text
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                    <div className="space-y-2">
                                        <label className="text-xs text-cyan-300 font-semibold">Custom Background Color</label>
                                        <div className="flex gap-3 items-center p-3 bg-slate-900/50 rounded-lg">
                                            <Input
                                                type="color"
                                                value={cardBgColor}
                                                onChange={(e) => setCardBgColor(e.target.value)}
                                                className="w-16 h-12 cursor-pointer border-2 border-slate-600"
                                            />
                                            <span className="text-white font-mono text-sm">{cardBgColor.toUpperCase()}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-cyan-300 font-semibold">Custom Text Color</label>
                                        <div className="flex gap-3 items-center p-3 bg-slate-900/50 rounded-lg">
                                            <Input
                                                type="color"
                                                value={cardTextColor}
                                                onChange={(e) => setCardTextColor(e.target.value)}
                                                className="w-16 h-12 cursor-pointer border-2 border-slate-600"
                                            />
                                            <span className="text-white font-mono text-sm">{cardTextColor.toUpperCase()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: QR Code Colors */}
                            <div className="p-6 rounded-xl bg-slate-800/50 border border-cyan-400/20 space-y-4">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="h-10 w-10 rounded-lg bg-green-500/20 border border-green-400/30 flex items-center justify-center">
                                        <QrCodeIcon className="h-5 w-5 text-green-400" />
                                    </div>
                                    <h3 className="text-white text-xl font-bold">QR Code Colors</h3>
                                </div>

                                {colorWarning && (
                                    <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-400/30 text-yellow-300 text-sm flex items-start gap-3 animate-in fade-in duration-300">
                                        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                        <span>{colorWarning}</span>
                                    </div>
                                )}
                                
                                <label className="text-cyan-300 font-semibold text-base block mb-3">Preset QR Colors</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {QR_COLOR_PRESETS.map((preset) => (
                                        <button
                                            key={preset.name}
                                            onClick={() => {
                                                setQrFgColor(preset.fg);
                                                setQrBgColor(preset.bg);
                                                checkQRColorContrast(preset.fg, preset.bg);
                                            }}
                                            className={`p-5 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                                                qrFgColor === preset.fg
                                                    ? 'border-cyan-400 shadow-xl shadow-cyan-500/30 scale-105'
                                                    : 'border-slate-600 hover:border-cyan-400/50'
                                            }`}
                                            style={{ backgroundColor: preset.bg }}
                                        >
                                            <div className="font-bold text-base" style={{ color: preset.fg }}>
                                                {preset.name}
                                            </div>
                                            <div className="text-xs mt-2 opacity-70" style={{ color: preset.fg }}>
                                                ▣ QR Sample
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 mt-6">
                                    <div className="space-y-2">
                                        <label className="text-xs text-cyan-300 font-semibold">Foreground (Dark Pattern)</label>
                                        <div className="flex gap-3 items-center p-3 bg-slate-900/50 rounded-lg">
                                            <Input
                                                type="color"
                                                value={qrFgColor}
                                                onChange={(e) => {
                                                    setQrFgColor(e.target.value);
                                                    checkQRColorContrast(e.target.value, qrBgColor);
                                                }}
                                                className="w-16 h-12 cursor-pointer border-2 border-slate-600"
                                            />
                                            <span className="text-white font-mono text-sm">{qrFgColor.toUpperCase()}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-cyan-300 font-semibold">Background (Light)</label>
                                        <div className="flex gap-3 items-center p-3 bg-slate-900/50 rounded-lg">
                                            <Input
                                                type="color"
                                                value={qrBgColor}
                                                onChange={(e) => {
                                                    setQrBgColor(e.target.value);
                                                    checkQRColorContrast(qrFgColor, e.target.value);
                                                }}
                                                className="w-16 h-12 cursor-pointer border-2 border-slate-600"
                                            />
                                            <span className="text-white font-mono text-sm">{qrBgColor.toUpperCase()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 p-4 bg-blue-500/10 rounded-lg border border-blue-400/30">
                                    <p className="text-blue-300 text-sm flex items-start gap-2">
                                        <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                        <span>
                                            <strong>Tip:</strong> For best scanning results, use high contrast colors - dark foreground on light background
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {/* Save Button */}
                            <Button
                                onClick={saveCustomization}
                                disabled={saving}
                                className="w-full h-16 bg-theme-gradient hover:shadow-xl hover:shadow-cyan-500/50 text-lg font-semibold"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                        Saving Preferences...
                                    </>
                                ) : saveSuccess ? (
                                    <>
                                        <CheckCircle className="h-5 w-5 mr-2" />
                                        ✨ Saved Successfully!
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-5 w-5 mr-2" />
                                        Save Customization Preferences
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* MODIFIED: QR Code Display Card with improved preview */}
                <Card className="bg-slate-900/40 border-cyan-400/30 backdrop-blur-xl hover-theme mb-6">
                    <CardContent className="flex flex-col items-center p-8 gap-6">
                        {/* QR Code Label */}
                        <div className="text-center">
                            <h2 className="text-white text-2xl font-bold mb-2 flex items-center justify-center gap-2">
                                {activeTab === 'online' ? (
                                    <>
                                        <Globe className="h-6 w-6 text-blue-400" />
                                        Online QR Code
                                    </>
                                ) : (
                                    <>
                                        <WifiOff className="h-6 w-6 text-purple-400" />
                                        Offline QR Code
                                    </>
                                )}
                            </h2>
                            <p className="text-blue-200/70 text-sm">
                                {activeTab === 'online' 
                                    ? 'Requires internet connection to access your full profile'
                                    : 'Works without internet with embedded medical data'
                                }
                            </p>
                        </div>

                        {/* Enhanced QR Code Card Preview */}
                        <div 
                            className="p-8 rounded-2xl shadow-2xl border-4 transition-all duration-300 hover:scale-105"
                            style={{ 
                                backgroundColor: cardBgColor,
                                borderColor: cardTextColor,
                                minWidth: '400px',
                                maxWidth: '500px',
                            }}
                        >
                            <h3 
                                className="text-center font-bold text-xl mb-4"
                                style={{ color: cardTextColor }}
                            >
                                EMERGENCY MEDICAL ID
                            </h3>
                            <img 
                                src={activeTab === 'online' ? onlineQR : offlineQR} 
                                alt={`${activeTab} QR Code`}
                                className="w-full h-full max-w-sm mx-auto"
                            />
                            {customText && (
                                <p 
                                    className={`text-center mt-4 font-semibold break-words ${
                                        textSize === 'small' ? 'text-sm' :
                                        textSize === 'large' ? 'text-xl' :
                                        'text-base'
                                    }`}
                                    style={{ color: cardTextColor }}
                                >
                                    {customText}
                                </p>
                            )}
                            <p 
                                className="text-center mt-4 text-sm"
                                style={{ color: cardTextColor }}
                            >
                                {activeTab === 'online' ? '🌐 Online (Requires Internet)' : '📴 Offline (Works Anywhere)'}
                            </p>
                        </div>

                        {/* MODIFIED: Action Buttons with better spacing and styling */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                            <Button
                                onClick={shareCard}
                                className="h-16 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-lg font-semibold transform hover:scale-105 transition-all duration-300"
                            >
                                <Share2 className="h-5 w-5 mr-2" />
                                📤 Share to Apps
                            </Button>
                            <Button
                                onClick={printCard}
                                className="h-16 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg font-semibold transform hover:scale-105 transition-all duration-300"
                            >
                                <Printer className="h-5 w-5 mr-2" />
                                🖨️ Print Card
                            </Button>
                        </div>

                        {/* ENHANCED: Info section */}
                        <div className="text-center text-blue-200/70 text-sm max-w-md space-y-2">
                            <p className="flex items-center justify-center gap-2">
                                <Palette className="h-4 w-4 text-cyan-400" />
                                🎨 Customize colors and text above
                            </p>
                            <p className="flex items-center justify-center gap-2">
                                <Download className="h-4 w-4 text-green-400" />
                                💳 Cards are wallet-sized (3.375" × 2.125")
                            </p>
                            <p className="flex items-center justify-center gap-2">
                                <Share2 className="h-4 w-4 text-purple-400" />
                                📱 Share to WhatsApp, Email, or Print
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

import { QrCode as QrCodeIcon } from 'lucide-react';