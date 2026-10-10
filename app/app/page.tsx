'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/translations';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import {
    Heart,
    Zap,
    Activity,
    BookOpen,
    X,
    QrCode,
    Globe,
    Shield,
    Smartphone,
    AlertCircle,
    Users,
    Lock,
    WifiOff,
    Phone,
    ChevronDown,
} from 'lucide-react';

export default function HomePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { language } = useLanguage();
    const [showLearnMore, setShowLearnMore] = useState(false);
    const [activeSection, setActiveSection] = useState<'features' | 'guide' | 'faqs'>('features');

    useEffect(() => {
        if (!loading && user) {
            router.push('/dashboard');
        }
    }, [user, loading, router]);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (showLearnMore) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showLearnMore]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 animate-pulse glow" />
                    <div className="text-white text-xl font-medium">Loading...</div>
                </div>
            </div>
        );
    }

    const features = [
        { icon: QrCode, title: 'Dual QR System', desc: 'Online & offline QR codes for any situation' },
        { icon: AlertCircle, title: 'Critical Alerts', desc: 'Life-threatening allergies displayed instantly' },
        { icon: Users, title: 'Emergency Contacts', desc: 'One-tap calling with location sharing' },
        { icon: Lock, title: 'PIN Protection', desc: 'Sensitive data secured with 4-digit PIN' },
        { icon: Smartphone, title: 'Voice Assistant', desc: 'AI chatbot with voice commands' },
        { icon: Globe, title: 'Multi-Language', desc: 'English and Hindi interface' },
    ];

    const howToSteps = [
        { step: '1', title: 'Create Profile', desc: 'Sign up and add your medical information using form or voice chatbot' },
        { step: '2', title: 'Generate QR Codes', desc: 'Create online (real-time) and offline (embedded data) QR codes' },
        { step: '3', title: 'Carry With You', desc: 'Print on cards, keychains, or save to phone for emergencies' },
    ];

    const faqs = [
        {
            category: 'Getting Started',
            questions: [
                { q: 'How do I create my medical profile?', a: 'Sign up, then use either our form or voice-powered chatbot to add your information.' },
                { q: 'Is VitalQR free?', a: 'Yes! VitalQR is completely free to use for creating your emergency medical profile.' },
                { q: 'What information should I include?', a: 'Add blood type, allergies, medications, medical conditions, and emergency contacts.' },
            ]
        },
        {
            category: 'QR Codes',
            questions: [
                { q: 'What\'s the difference between online and offline QR?', a: 'Online QR links to your live profile with real-time updates. Offline QR contains embedded data that works without internet.' },
                { q: 'Where should I place my QR code?', a: 'Print on medical ID cards, keychains, bag tags, phone cases, or keep on your lock screen.' },
                { q: 'Can I customize the QR code color?', a: 'Yes! You can choose from 8 preset colors or use a custom color picker.' },
            ]
        },
        {
            category: 'Privacy & Security',
            questions: [
                { q: 'Who can see my medical information?', a: 'Basic emergency info is public. Detailed medical history requires your 4-digit PIN.' },
                { q: 'Is my data secure?', a: 'Yes! We use enterprise-grade encryption and secure database storage.' },
                { q: 'Can I delete my account?', a: 'Yes, you can delete your account anytime from settings.' },
            ]
        },
        {
            category: 'Emergency Access',
            questions: [
                { q: 'What happens when someone scans my QR?', a: 'They instantly see your critical medical info: name, blood type, allergies, conditions, and emergency contacts.' },
                { q: 'Can they call my emergency contact?', a: 'Yes! Phone numbers are clickable for immediate calling.' },
                { q: 'Does it work without internet?', a: 'The offline QR code works without internet. Online QR requires internet for full profile access.' },
            ]
        },
    ];

    return (
        <div className="min-h-screen bg-theme-page relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-48 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            {/* Navigation */}
            <nav className="border-b border-white/10 backdrop-blur-xl bg-slate-900/30 relative z-10 sticky top-0">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3 group cursor-pointer">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-500 flex items-center justify-center shadow-lg group-hover:shadow-blue-500/50 transition-all duration-300 group-hover:scale-110">
                            <Heart className="h-7 w-7 text-white animate-pulse" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                                VitalQR
                            </h1>
                            <p className="text-xs text-cyan-300/70">Emergency Medical ID</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <LanguageSwitcher />
                        <Button 
                            onClick={() => router.push('/auth/login')} 
                            variant="outline"
                            className="border-cyan-400/30 hover:border-cyan-400 hover:bg-cyan-500/10 text-cyan-300 hover:text-cyan-200 transition-all duration-300"
                        >
                            {t('login', language)}
                        </Button>
                        <Button
                            onClick={() => router.push('/auth/signup')}
                            className="bg-theme-gradient hover:shadow-xl hover:shadow-cyan-500/50 text-white transition-all duration-300 transform hover:scale-105"
                        >
                            {t('signup', language)}
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Hero Section - Minimal */}
            <section className="container mx-auto px-4 py-32 text-center relative z-10">
                <div className="max-w-4xl mx-auto space-y-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-400/30">
                        <Activity className="h-5 w-5 animate-pulse text-cyan-400" />
                        <span className="text-sm bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent font-medium">
                            Digital Emergency Medical Profile Platform
                        </span>
                    </div>

                    <h1 className="text-6xl md:text-8xl font-bold leading-tight">
                        <span className="bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent animate-gradient">
                            {t('tagline', language)}
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-blue-200/90 max-w-3xl mx-auto font-light leading-relaxed">
                        Scannable QR code with your critical medical information for emergency responders. 
                        <span className="block mt-2 text-cyan-400 font-semibold">When seconds matter.</span>
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                        <Button
                            size="lg"
                            onClick={() => router.push('/auth/signup')}
                            className="bg-theme-gradient hover:shadow-2xl hover:shadow-cyan-500/50 text-lg text-white transition-all duration-300 transform hover:scale-105"
                        >
                            <Zap className="h-5 w-5 mr-2" />
                            Create Your Profile Free
                        </Button>
                        <Button 
                            size="lg" 
                            variant="outline" 
                            onClick={() => setShowLearnMore(true)}
                            className="text-white border-white/30 hover:border-cyan-400 hover:bg-cyan-500/10 text-lg backdrop-blur-sm transition-all duration-300"
                        >
                            <BookOpen className="h-5 w-5 mr-2" />
                            Learn More
                        </Button>
                    </div>
                </div>
            </section>

            {/* Learn More Modal/Sheet */}
            {showLearnMore && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="fixed inset-y-0 right-0 w-full md:w-[600px] lg:w-[800px] bg-slate-900 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-xl border-b border-cyan-400/30 p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-theme-gradient flex items-center justify-center">
                                        <BookOpen className="h-6 w-6 text-white" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white">Learn About VitalQR</h2>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowLearnMore(false)}
                                    className="hover:bg-red-500/10 hover:text-red-400"
                                >
                                    <X className="h-6 w-6" />
                                </Button>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-2 mt-4">
                                <Button
                                    onClick={() => setActiveSection('features')}
                                    className={`flex-1 ${activeSection === 'features' ? 'bg-theme-gradient' : 'bg-slate-800 text-cyan-300 hover:bg-slate-700'}`}
                                >
                                    Features
                                </Button>
                                <Button
                                    onClick={() => setActiveSection('guide')}
                                    className={`flex-1 ${activeSection === 'guide' ? 'bg-theme-gradient' : 'bg-slate-800 text-cyan-300 hover:bg-slate-700'}`}
                                >
                                    How to Use
                                </Button>
                                <Button
                                    onClick={() => setActiveSection('faqs')}
                                    className={`flex-1 ${activeSection === 'faqs' ? 'bg-theme-gradient' : 'bg-slate-800 text-cyan-300 hover:bg-slate-700'}`}
                                >
                                    FAQs
                                </Button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {/* Features Section */}
                            {activeSection === 'features' && (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-3xl font-bold text-white mb-2">What VitalQR Offers</h3>
                                        <p className="text-blue-200/70">Powerful features designed to save lives in emergencies</p>
                                    </div>

                                    <div className="grid gap-4">
                                        {features.map((feature, idx) => (
                                            <Card key={idx} className="bg-slate-800/50 border-cyan-400/30 hover:border-cyan-400 transition-all duration-300">
                                                <CardContent className="p-6 flex items-start gap-4">
                                                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border border-cyan-400/30 flex items-center justify-center flex-shrink-0">
                                                        <feature.icon className="h-6 w-6 text-cyan-400" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-white font-bold text-lg mb-1">{feature.title}</h4>
                                                        <p className="text-blue-200/70">{feature.desc}</p>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* How to Use Guide */}
                            {activeSection === 'guide' && (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-3xl font-bold text-white mb-2">How to Use VitalQR</h3>
                                        <p className="text-blue-200/70">Get started in 3 simple steps</p>
                                    </div>

                                    <div className="space-y-6">
                                        {howToSteps.map((step, idx) => (
                                            <Card key={idx} className="bg-slate-800/50 border-cyan-400/30 hover:border-cyan-400 transition-all duration-300">
                                                <CardContent className="p-6">
                                                    <div className="flex items-start gap-4">
                                                        <div className="h-14 w-14 rounded-xl bg-theme-gradient flex items-center justify-center shadow-lg flex-shrink-0">
                                                            <span className="text-3xl font-bold text-white">{step.step}</span>
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="text-white font-bold text-xl mb-2">{step.title}</h4>
                                                            <p className="text-blue-200/80 text-base leading-relaxed">{step.desc}</p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>

                                    <div className="mt-8 p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-400/30">
                                        <h4 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                                            <Shield className="h-5 w-5 text-green-400" />
                                            Where to Place Your QR Code
                                        </h4>
                                        <ul className="space-y-2 text-blue-200/80">
                                            <li className="flex items-start gap-2">
                                                <span className="text-cyan-400 font-bold mt-1">•</span>
                                                <span>Medical ID cards in wallet</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-cyan-400 font-bold mt-1">•</span>
                                                <span>Keychains and bag tags</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-cyan-400 font-bold mt-1">•</span>
                                                <span>Medical alert bracelets</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-cyan-400 font-bold mt-1">•</span>
                                                <span>Phone case or lock screen</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-cyan-400 font-bold mt-1">•</span>
                                                <span>Refrigerator door (for home emergencies)</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {/* FAQs Section */}
                            {activeSection === 'faqs' && (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-3xl font-bold text-white mb-2">Frequently Asked Questions</h3>
                                        <p className="text-blue-200/70">Find answers to common questions</p>
                                    </div>

                                    {faqs.map((category, idx) => (
                                        <div key={idx} className="space-y-4">
                                            <h4 className="text-xl font-bold text-cyan-300 flex items-center gap-2">
                                                <ChevronDown className="h-5 w-5" />
                                                {category.category}
                                            </h4>
                                            <div className="space-y-3">
                                                {category.questions.map((faq, qIdx) => (
                                                    <Card key={qIdx} className="bg-slate-800/50 border-slate-700/50 hover:border-cyan-400/50 transition-all duration-300">
                                                        <CardContent className="p-5">
                                                            <h5 className="text-white font-semibold mb-2 text-base">{faq.q}</h5>
                                                            <p className="text-blue-200/70 text-sm leading-relaxed">{faq.a}</p>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        </div>
                                    ))}

                                    <div className="mt-8 p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-400/30">
                                        <h4 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                                            <Phone className="h-5 w-5 text-purple-400" />
                                            Still Have Questions?
                                        </h4>
                                        <p className="text-purple-200/70 mb-4">We're here to help! Feel free to reach out.</p>
                                        <Button
                                            onClick={() => router.push('/auth/signup')}
                                            className="bg-theme-accent hover:shadow-xl hover:shadow-purple-500/50"
                                        >
                                            Get Started Now
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="border-t border-white/10 py-12 relative z-10 backdrop-blur-sm bg-slate-900/20">
                <div className="container mx-auto px-4 text-center">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                            <Heart className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                            VitalQR
                        </span>
                    </div>
                    <p className="text-cyan-300/70">© 2024 VitalQR. Your emergency medical profile platform.</p>
                </div>
            </footer>
        </div>
    );
}