'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import {
    ArrowLeft,
    Heart,
    Mic,
    Send,
    Volume2,
    Loader2,
    Globe,
    CheckCircle,
    Languages,
    Sparkles,
    Download,
    QrCode as QrCodeIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { generateMedicalResponse, buildConversationHistory } from '@/lib/geminiClient';
import QRCodeLib from 'qrcode';

interface Language {
    code: string;
    name: string;
    nativeName: string;
    flag: string;
    voiceCode: string;
}

const LANGUAGES: Language[] = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', voiceCode: 'en-US' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳', voiceCode: 'hi-IN' },
];

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    originalLanguage?: string;
}

interface MedicalData {
    name?: string;
    age?: string;
    bloodGroup?: string;
    dob?: string;
    allergies?: string;
    operations?: string;
    conditions?: string;
    history?: string;
    emergencyContactName?: string;
    emergencyContactRelation?: string;
    emergencyContactPhone?: string;
}

const MEDICAL_SYSTEM_PROMPT = `You are a helpful medical assistant for VitalQR, an emergency medical ID platform. Your role is to:
- Provide clear and concise medical information
- Use simple language that is easy to understand
- Be empathetic and supportive
- Always prioritize patient safety and well-being
- Never provide medical advice without proper context
- Use the VitalQR platform to store and share medical data securely
- Ensure all data is accurate and up-to-date
- Be respectful and professional at all times`;

// NEW: Add validation and extraction helpers at the top of the component
const extractMedicalTerm = (input: string): string => {
    // Remove common conversational phrases
    const fillers = [
        /^i\s+have\s+/i,
        /^i\s+suffer\s+from\s+/i,
        /^i\s+take\s+/i,
        /^i'm\s+allergic\s+to\s+/i,
        /^i\s+am\s+allergic\s+to\s+/i,
        /^my\s+condition\s+is\s+/i,
        /^my\s+medication\s+is\s+/i,
        /^it's\s+/i,
        /^it\s+is\s+/i,
        /^yes,?\s+/i,
        /^yeah,?\s+/i,
        /^well,?\s+/i,
        /^um,?\s+/i,
        /^uh,?\s+/i,
    ];
    
    let cleaned = input.trim();
    
    // Remove filler phrases
    for (const filler of fillers) {
        cleaned = cleaned.replace(filler, '');
    }
    
    // Remove trailing phrases like "daily", "every day", etc.
    cleaned = cleaned.replace(/\s+(daily|every\s+day|per\s+day|twice\s+daily).*$/i, '');
    
    // Capitalize first letter
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    
    return cleaned.trim();
};

const validateBloodType = (input: string): boolean => {
    const validTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const normalized = input.toUpperCase().replace(/\s+/g, '');
    return validTypes.includes(normalized);
};

const validateDate = (input: string): boolean => {
    // Check if input contains date-like patterns (DD/MM/YYYY, DD-MM-YYYY, etc.)
    const datePattern = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/;
    return datePattern.test(input);
};

const isValidName = (input: string): boolean => {
    // Name should contain letters and be at least 2 characters
    const namePattern = /^[a-zA-Z\s]{2,}$/;
    return namePattern.test(input.trim());
};

const isYesNoResponse = (input: string): { isValid: boolean; value: boolean | null } => {
    const cleaned = input.toLowerCase().trim();
    const yesWords = ['yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'correct', 'right', 'हां', 'हाँ', 'అవును'];
    const noWords = ['no', 'nope', 'nah', 'wrong', 'incorrect', 'నాహీ', 'లేదు'];
    
    const isYes = yesWords.some(word => cleaned.includes(word));
    const isNo = noWords.some(word => cleaned.includes(word));
    
    if (isYes) return { isValid: true, value: true };
    if (isNo) return { isValid: true, value: false };
    return { isValid: false, value: null };
};

export default function ChatbotPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [detectedLanguage, setDetectedLanguage] = useState<string>('');
    const [medicalData, setMedicalData] = useState<MedicalData>({});
    const [collectionStep, setCollectionStep] = useState<string>('greeting');
    const [showQRCodes, setShowQRCodes] = useState(false);
    const [onlineQR, setOnlineQR] = useState<string>('');
    const [offlineQR, setOfflineQR] = useState<string>('');

    // Validation states
    const [pendingConfirmation, setPendingConfirmation] = useState<{
        step: string;
        value: string;
        extractedValue: string;
    } | null>(null);
    const [invalidAttempts, setInvalidAttempts] = useState(0);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
            return;
        }
        
        // Don't redirect if user is authenticated - let them stay on chatbot page
    }, [user, authLoading, router]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const translateText = async (text: string, fromLang: string, toLang: string): Promise<string> => {
        try {
            const response = await fetch('https://libretranslate.de/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    q: text,
                    source: fromLang,
                    target: toLang,
                    format: 'text',
                }),
            });
            const data = await response.json();
            return data.translatedText || text;
        } catch (error) {
            console.error('Translation error:', error);
            return text;
        }
    };

    const detectLanguage = async (text: string): Promise<string> => {
        try {
            const response = await fetch('https://libretranslate.de/detect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ q: text }),
            });
            const data = await response.json();
            return data[0]?.language || 'en';
        } catch (error) {
            console.error('Language detection error:', error);
            return 'en';
        }
    };

    const handleLanguageSelect = (lang: Language) => {
        setSelectedLanguage(lang);
        const welcomeMessages = {
            en: "Hey! I'm your medical assistant. I'll help you generate your medical QR code. Let's start with a few quick questions. What's your full name?",
            hi: "नमस्ते! मैं आपका चिकित्सा सहायक हूं। मैं आपका मेडिकल QR कोड बनाने में मदद करूंगा। चलिए कुछ सवालों से शुरू करते हैं। आपका पूरा नाम क्या है?",
        };
        
        const welcomeMsg = welcomeMessages[lang.code as keyof typeof welcomeMessages];
        
        setMessages([{
            role: 'assistant',
            content: welcomeMsg,
        }]);
        
        setCollectionStep('name');
        
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(welcomeMsg);
            utterance.lang = lang.voiceCode;
            window.speechSynthesis.speak(utterance);
        }
    };

    const startVoiceInput = () => {
        if (typeof window === 'undefined' || !('webkitSpeechRecognition' in window)) {
            alert('🎤 Speech recognition not supported. Please type your message instead.');
            return;
        }

        const SpeechRecognition = (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = false;  // Prevents infinite loops
        recognition.interimResults = false;  // Only final results
        recognition.lang = selectedLanguage?.voiceCode || 'en-US';
        recognition.maxAlternatives = 1;

        // Track retry attempts
        let hasRetried = false;

        recognition.onstart = () => {
            console.log('🎤 Voice recognition started');
            setIsListening(true);
        };

        recognition.onend = () => {
            console.log('🛑 Voice recognition ended');
            setIsListening(false);
        };

        recognition.onresult = async (event: any) => {
            const transcript = event.results[0][0].transcript;
            console.log('✅ Voice input captured:', transcript);
            setInput(transcript);
            
            // Auto-detect language if not English
            if (selectedLanguage?.code !== 'en') {
                const detected = await detectLanguage(transcript);
                setDetectedLanguage(detected);
            }
        };

        recognition.onerror = (event: any) => {
            console.error('❌ Speech recognition error:', event.error);
            setIsListening(false);
            
            // Handle network errors with auto-retry
            if (event.error === 'network' && !hasRetried) {
                hasRetried = true;
                console.log('🔄 Network error - retrying in 500ms...');
                
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: '🔄 Connection interrupted. Retrying voice input automatically...',
                }]);
                
                setTimeout(() => {
                    try {
                        recognition.start();
                        console.log('🎤 Retry attempt started');
                    } catch (retryError) {
                        console.error('Retry failed:', retryError);
                        showNetworkErrorMessage();
                    }
                }, 500);
                return;
            }
            
            // Show user-friendly error messages
            const errorMessages: { [key: string]: string } = {
                'no-speech': '🎤 **No Speech Detected**\n\nI didn\'t hear anything. Please:\n1. Check your microphone\n2. Speak clearly and try again\n3. Or type your answer instead',
                'audio-capture': '🔇 **Microphone Not Found**\n\nPlease:\n1. Connect a microphone\n2. Check browser permissions\n3. Or type your answer',
                'not-allowed': '⛔ **Microphone Access Denied**\n\nTo use voice input:\n1. Click the 🔒 lock icon in your browser\n2. Allow microphone access\n3. Refresh the page\n\nOr continue by typing!',
                'network': showNetworkErrorMessage(),
                'service-not-allowed': showNetworkErrorMessage(),
                'bad-grammar': '❓ **Couldn\'t Understand**\n\nPlease:\n1. Speak more clearly\n2. Try again\n3. Or type your answer',
                'aborted': '⏹️ **Voice Input Cancelled**\n\nClick the microphone 🎤 to try again, or type your answer.',
            };
            
            const errorMsg = errorMessages[event.error] || `⚠️ Voice input failed: ${event.error}. Please type your answer instead.`;
            
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: errorMsg,
            }]);
        };

        recognitionRef.current = recognition;
        
        // Start with error handling
        try {
            recognition.start();
            console.log('🎤 Recognition start requested');
        } catch (error) {
            console.error('❌ Failed to start recognition:', error);
            setIsListening(false);
            
            if (!navigator.onLine) {
                showOfflineMessage();
            } else {
                alert('⚠️ Could not start voice input. Please check your internet connection or try typing instead.');
            }
        }
    };

    // Helper function for network error messages
    const showNetworkErrorMessage = () => {
        return `🌐 **Internet Connection Required**

Voice input needs internet to work.

**Quick Fixes:**
1. ✅ Check your WiFi or mobile data
2. 🔄 Refresh this page
3. ⌨️ Use text input (type your answer)
4. 🎤 Try voice again when online

**Why does voice need internet?**
Speech recognition uses cloud AI to understand your voice. But don't worry - you can always type your answers!`;
    };

    const showOfflineMessage = () => {
        setMessages(prev => [...prev, {
            role: 'assistant',
            content: `📴 **You're Offline**

Voice input requires an internet connection.

**To continue:**
1. 📶 Connect to WiFi or mobile data
2. 🔄 Refresh the page
3. ⌨️ Or type your answers (works offline!)

Medical profiles are important - you can use text input without internet! Just type in the box below. 🏥`,
        }]);
    };

    const speakMessage = (text: string) => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window && selectedLanguage) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = selectedLanguage.voiceCode;
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => setIsSpeaking(false);
            window.speechSynthesis.speak(utterance);
        }
    };

    // UPDATED: Enhanced handleSend with validation and extraction
    const handleSend = async () => {
        if (!input.trim() || !selectedLanguage) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        const userInput = input;
        setInput('');
        setIsProcessing(true);

        try {
            // FIXED: Handle confirmation step FIRST to avoid loop
            if (collectionStep === 'confirmation') {
                const yesNoCheck = isYesNoResponse(userInput);
                
                if (!yesNoCheck.isValid) {
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: selectedLanguage.code === 'en' 
                            ? "I didn't understand. Please say 'yes' to save your profile or 'no' to make changes."
                            : "मुझे समझ नहीं आया। कृपया 'हां' कहें अपनी प्रोफ़ाइल सहेजने के लिए या 'नहीं' कहें बदलाव करने के लिए।",
                    }]);
                    setIsProcessing(false);
                    return;
                }
                
                if (yesNoCheck.value) {
                    // FIXED: User confirmed - save to database and generate QR codes
                    await saveToDatabase(medicalData, selectedLanguage);
                    setIsProcessing(false);
                    return; // End here - no more questions
                } else {
                    // User wants to make changes - restart flow
                    setCollectionStep('name');
                    await askNextQuestion('name', selectedLanguage);
                    setIsProcessing(false);
                    return;
                }
            }

            // Handle confirmation responses
            if (pendingConfirmation) {
                const yesNoCheck = isYesNoResponse(userInput);
                
                if (!yesNoCheck.isValid) {
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: selectedLanguage.code === 'en' 
                            ? "I didn't understand. Please say 'yes' if correct or 'no' to re-enter."
                            : "मुझे समझ नहीं आया। कृपया 'हां' कहें यदि सही है या 'नहीं' कहें फिर से दर्ज करने के लिए।",
                    }]);
                    setIsProcessing(false);
                    return;
                }
                
                if (yesNoCheck.value) {
                    // User confirmed - save the extracted value
                    const updatedData = { ...medicalData, [pendingConfirmation.step]: pendingConfirmation.extractedValue };
                    setMedicalData(updatedData);
                    setPendingConfirmation(null);
                    setInvalidAttempts(0);
                    
                    // Move to next question
                    await askNextQuestion(getNextStep(pendingConfirmation.step), selectedLanguage);
                } else {
                    // User rejected - ask the question again
                    setPendingConfirmation(null);
                    await askNextQuestion(pendingConfirmation.step, selectedLanguage);
                }
                
                setIsProcessing(false);
                return;
            }

            // Validate response based on current step
            const isValid = await validateResponse(userInput, collectionStep, selectedLanguage);
            
            if (!isValid) {
                setIsProcessing(false);
                return;
            }

            // Extract and confirm medical information
            if (['allergies', 'operations', 'conditions', 'history'].includes(collectionStep)) {
                const extracted = extractMedicalTerm(userInput);
                
                // Ask for confirmation
                const confirmationMessages = {
                    en: `I understood: "${extracted}". Is that correct?`,
                    hi: `मैंने समझा: "${extracted}"। क्या यह सही है?`,
                    te: `నేను అర్థం చేసుకున్నాను: "${extracted}"। ఇది సరైనదేనా?`,
                };
                
                setPendingConfirmation({
                    step: collectionStep,
                    value: userInput,
                    extractedValue: extracted,
                });
                
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: confirmationMessages[selectedLanguage.code as keyof typeof confirmationMessages],
                }]);
                
                speakMessage(confirmationMessages[selectedLanguage.code as keyof typeof confirmationMessages]);
            } else {
                // For non-medical fields, save directly after validation
                const updatedData = { ...medicalData };
                
                if (collectionStep === 'name') {
                    updatedData.name = userInput;
                } else if (collectionStep === 'age') {
                    updatedData.age = userInput;
                } else if (collectionStep === 'bloodGroup') {
                    updatedData.bloodGroup = userInput.toUpperCase().replace(/\s+/g, '');
                } else if (collectionStep === 'dob') {
                    updatedData.dob = userInput;
                } else if (collectionStep === 'emergencyContactName') {
                    updatedData.emergencyContactName = userInput;
                } else if (collectionStep === 'emergencyContactRelation') {
                    updatedData.emergencyContactRelation = userInput;
                } else if (collectionStep === 'emergencyContactPhone') {
                    updatedData.emergencyContactPhone = userInput;
                } else if (collectionStep === 'profilePin') {
                    // NEW: Save PIN
                    updatedData.profilePin = userInput;
                }
                
                setMedicalData(updatedData);
                setInvalidAttempts(0);
                
                // FIXED: Check if we reached the PIN step (NOW the last question)
                const nextStep = getNextStep(collectionStep);
                if (nextStep === 'confirmation') {
                    // Show confirmation summary
                    await showConfirmation(updatedData, selectedLanguage);
                } else {
                    // Move to next question
                    await askNextQuestion(nextStep, selectedLanguage);
                }
            }

        } catch (error: any) {
            console.error('Error processing message:', error);
            
            // NEW: Improved error messages for different scenarios
            let errorMessage = '';
            
            if (error.message === 'Request timeout') {
                errorMessage = '⏱️ **Request Timed Out**\n\nThe AI assistant is taking too long to respond. This might be due to:\n- Network issues\n- Blocked connection\n- Server overload\n\nPlease try again or continue typing manually.';
            } else if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
                errorMessage = '🚫 **Connection Error**\n\nYour browser extension is blocking the AI assistant.\n\n**Quick Fix:**\n1. Click the shield/extension icon in your browser\n2. Disable ad blocker for this site\n3. Refresh the page\n\nOr continue by typing responses directly!';
            } else {
                errorMessage = selectedLanguage.code === 'en'
                    ? 'I apologize, but I encountered an error. Please try again.'
                    : selectedLanguage.code === 'hi'
                    ? 'मुझे खेद है, लेकिन मुझे एक त्रुटि का सामना करना पड़ा। कृपया पुनः प्रयास करें।'
                    : 'నన్ను క్షమించండి, కానీ నేను ఒక లోపాన్ని ఎదుర్కొన్నాను। దయచేసి మళ్లీ ప్రయత్నించండి।';
            }
            
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: errorMessage,
            }]);
        } finally {
            setIsProcessing(false);
        }
    };

    // NEW: Validation function
    const validateResponse = async (input: string, step: string, lang: Language): Promise<boolean> => {
        const trimmedInput = input.trim();
        
        // Empty input
        if (!trimmedInput || trimmedInput.length < 1) {
            const errorMessages = {
                en: "I didn't catch that. Could you please try again?",
                hi: "मुझे सुनाई नहीं दिया। कृपया पुनः प्रयास करें?",
                te: "నాకు వినబడలేదు. దయచేసి మళ్లీ ప్రయత్నించండి?",
            };
            
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: errorMessages[lang.code as keyof typeof errorMessages],
            }]);
            
            speakMessage(errorMessages[lang.code as keyof typeof errorMessages]);
            return false;
        }
        
        // Validate based on step
        switch (step) {
            case 'name':
                if (!isValidName(trimmedInput)) {
                    const errorMessages = {
                        en: "That doesn't seem like a valid name. Please tell me your full name using letters only.",
                        hi: "यह एक वैध नाम नहीं लगती। कृपया 1 से 120 के बीच एक संख्या के रूप में अपनी उम्र बताएं।",
                        te: "అది చెల్లుబాటు అయ్యే పేరు కాదు. దయచేసి 1 మరియు 120 మధ్య సంఖ్యగా మీ వయస్సు చెప్పండి.",
                    };
                    
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: errorMessages[lang.code as keyof typeof errorMessages],
                    }]);
                    
                    speakMessage(errorMessages[lang.code as keyof typeof errorMessages]);
                    return false;
                }
                break;
                
            case 'age':
                const age = parseInt(trimmedInput);
                if (isNaN(age) || age < 1 || age > 120) {
                    const errorMessages = {
                        en: "That doesn't seem like a valid age. Please tell me your age as a number between 1 and 120.",
                        hi: "यह एक वैध उम्र नहीं लगती। कृपया 1 से 120 के बीच एक संख्या के रूप में अपनी उम्र बताएं।",
                        te: "అది చెల్లుబాటు అయ్యే తేదీ కాదు. దయచేసి 1 మరియు 120 మధ్య సంఖ్యగా మీ వయస్సు చెప్పండి.",
                    };
                    
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: errorMessages[lang.code as keyof typeof errorMessages],
                    }]);
                    
                    speakMessage(errorMessages[lang.code as keyof typeof errorMessages]);
                    return false;
                }
                break;
                
            case 'bloodGroup':
                if (!validateBloodType(trimmedInput)) {
                    const errorMessages = {
                        en: "That's not a valid blood type. Please say one of these: A+, A-, B+, B-, AB+, AB-, O+, or O-",
                        hi: "यह एक वैध रक्त समूह नहीं है। कृपया इनमें से एक कहें: A+, A-, B+, B-, AB+, AB-, O+, या O-",
                        te: "అది చెల్లుబాటు అయ్యే రక్త గ్రూప్ కాదు. దయచేసి ఇవిలో ఒకటి చెప్పండి: A+, A-, B+, B-, AB+, AB-, O+, లేదా O-",
                    };
                    
                    setInvalidAttempts(prev => prev + 1);
                    
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: errorMessages[lang.code as keyof typeof errorMessages],
                    }]);
                    
                    speakMessage(errorMessages[lang.code as keyof typeof errorMessages]);
                    return false;
                }
                break;
                
            case 'dob':
                if (!validateDate(trimmedInput)) {
                    const errorMessages = {
                        en: "That doesn't look like a valid date. Please use DD/MM/YYYY format, like 15/03/1990",
                        hi: "यह एक वैध तारीख नहीं लगती। कृपया DD/MM/YYYY प्रारूप का उपयोग करें, जैसे 15/03/1990",
                        te: "అది చెల్లుబాటు అయ్యే తేదీ కాదు. దయచేసి DD/MM/YYYY ఫార్మాట్ ఉపయోగించండి, ఉదాహరణకు 15/03/1990",
                    };
                    
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: errorMessages[lang.code as keyof typeof errorMessages],
                    }]);
                    
                    speakMessage(errorMessages[lang.code as keyof typeof errorMessages]);
                    return false;
                }
                break;
                
            case 'allergies':
            case 'operations':
            case 'conditions':
            case 'history':
                // Check if response is just "none" or similar
                if (['none', 'no', 'nothing', 'నాహీ', 'కొన్ని లేకు', 'లేదు'].some(word => 
                    trimmedInput.toLowerCase() === word)) {
                    // Valid "none" response
                    return true;
                }
                
                // Check if response contains actual information
                if (trimmedInput.length < 3) {
                    const errorMessages = {
                        en: "I need more information. Please describe in detail, or say 'none' if you don't have any.",
                        hi: "मुझे और जानकारी चाहिए। कृपया विस्तार से बताएं, या 'कोई नहीं' कहें यदि आपके पास कोई नहीं है।",
                        te: "నాకు మరింత సమాచారం కావాలి. దయచేసి వివరంగా వివరించండి, లేదా మీకు లేకపోతే 'లేదు' అని చెప్పండి.",
                    };
                    
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: errorMessages[lang.code as keyof typeof errorMessages],
                    }]);
                    
                    speakMessage(errorMessages[lang.code as keyof typeof errorMessages]);
                    return false;
                }
                break;
                
            case 'emergencyContactName':
                if (!isValidName(trimmedInput)) {
                    const errorMessages = {
                        en: "That doesn't seem like a valid name. Please tell me the full name of your emergency contact.",
                        hi: "यह एक वैध नाम नहीं लगता। कृपया अपने आपातकालीन संपर्क का पूरा नाम बताएं।",
                        te: "అది చెల్లుబాటు అయ్యే పేరు కాదు. దయచేసి మీ అత్యవసర సంపరింపు యొక్క పూర్తి పేరు చెప్పండి.",
                    };
                    
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: errorMessages[lang.code as keyof typeof errorMessages],
                    }]);
                    
                    speakMessage(errorMessages[lang.code as keyof typeof errorMessages]);
                    return false;
                }
                break;
                
            case 'emergencyContactPhone':
                const phonePattern = /\d{10,}/;
                if (!phonePattern.test(trimmedInput.replace(/\s+/g, ''))) {
                    const errorMessages = {
                        en: "That doesn't look like a valid phone number. Please provide at least 10 digits.",
                        hi: "यह एक वैध फोन नंबर नहीं लगता। कृपया कम से कम 10 अंक प्रदान करें।",
                        te: "అది చెల్లుబాటు అయ్యే ఫోన్ నంబర్ కాదు. దయచేసి కనీసం 10 అంశాంకం అందించండి.",
                    };
                    
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: errorMessages[lang.code as keyof typeof errorMessages],
                    }]);
                    
                    speakMessage(errorMessages[lang.code as keyof typeof errorMessages]);
                    return false;
                }
                break;
                
            case 'profilePin':
                // NEW: Validate 4-digit PIN
                const pinPattern = /^\d{4}$/;
                if (!pinPattern.test(trimmedInput)) {
                    const errorMessages = {
                        en: "Please enter exactly 4 digits for your PIN (like 1234).",
                        hi: "कृपया अपने पिन के लिए ठीक 4 अंक दर्ज करें (जैसे 1234)।",
                        te: "అది చెల్లుబాటు అయ్యే పిన్ (అంశాంకం 1234) కాదు. దయచేసి మరియు 4-అంశాంకం అందించండి.",
                    };
                    
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: errorMessages[lang.code as keyof typeof errorMessages],
                    }]);
                    
                    speakMessage(errorMessages[lang.code as keyof typeof errorMessages]);
                    return false;
                }
                break;
        }
        
        return true;
    };

    // UPDATED: Helper to get next step - NOW includes surgery and PIN
    const getNextStep = (currentStep: string): string => {
        const stepOrder = [
            'name', 'age', 'bloodGroup', 'dob', 'allergies', 'operations', 
            'conditions', 'history', 'emergencyContactName', 'emergencyContactRelation', 
            'emergencyContactPhone', 'profilePin', 'confirmation'
        ];
        
        const currentIndex = stepOrder.indexOf(currentStep);
        if (currentIndex === -1 || currentIndex === stepOrder.length - 1) {
            return 'confirmation';
        }
        
        return stepOrder[currentIndex + 1];
    };

    // UPDATED: askNextQuestion to handle surgery and PIN questions
    const askNextQuestion = async (step: string, lang: Language) => {
        setCollectionStep(step);
        
        const questions = {
            name: {
                en: "What's your full name?",
                hi: "आपका पूरा नाम क्या है?"
            },
            age: {
                en: "How old are you?",
                hi: "आपकी उम्र कितनी है?"
            },
            bloodGroup: {
                en: "What's your blood group? (like A+, B+, O-, etc.)",
                hi: "आपका ब्लड ग्रुप क्या है? (जैसे A+, B+, O-, आदि)"
            },
            dob: {
                en: "What's your date of birth? (DD/MM/YYYY format)",
                hi: "आपकी जन्म तिथि क्या है? (DD/MM/YYYY प्रारूप)"
            },
            allergies: {
                en: "Do you have any allergies? If none, just say 'none'",
                hi: "क्या आपको कोई एलर्जी है? यदि नहीं तो 'कोई नहीं' कहें"
            },
            operations: {
                en: "Have you had any surgeries or operations? If none, say 'none'",
                hi: "क्या आपकी कोई सर्जरी या ऑपरेशन हुआ है? यदि नहीं तो 'कोई नहीं' कहें"
            },
            conditions: {
                en: "Do you have any current medical conditions? If none, say 'none'",
                hi: "क्या आपको कोई वर्तमान चिकित्सा स्थिति है? यदि नहीं तो 'कोई नहीं' कहें"
            },
            history: {
                en: "Any important medical history I should know? If none, say 'none'",
                hi: "कोई महत्वपूर्ण चिकित्सा इतिहास जो मुझे पता होना चाहिए? यदि नहीं तो 'कोई नहीं' कहें"
            },
            emergencyContactName: {
                en: "Who should we call in an emergency? Please provide their full name.",
                hi: "आपातकाल में हमें किसे कॉल करना चाहिए? कृपया उनका पूरा नाम बताएं।"
            },
            emergencyContactRelation: {
                en: "What is their relationship to you? (e.g., Mother, Father, Spouse, Friend)",
                hi: "आपके साथ उनका क्या रिश्ता है? (जैसे, माँ, पिता, जीवनसाथी, मित्र)"
            },
            emergencyContactPhone: {
                en: "What is their phone number?",
                hi: "उनका फोन नंबर क्या है?"
            },
            profilePin: {
                en: "Please create a 4-digit PIN to protect your sensitive medical information.",
                hi: "कृपया अपनी संवेदनशील चिकित्सा जानकारी की सुरक्षा के लिए 4-अंकीय पिन बनाएं।"
            }
        };

        const question = questions[step as keyof typeof questions]?.[lang.code as keyof typeof questions.name] || '';
        
        setMessages(prev => [...prev, {
            role: 'assistant',
            content: question,
        }]);
        
        speakMessage(question);
    };

    // UPDATED: showConfirmation with clearer instructions
    const showConfirmation = async (data: MedicalData, lang: Language) => {
        setCollectionStep('confirmation');
        
        const summaryText = {
            en: `Here's what I got:\n\n• Name: ${data.name}\n• Age: ${data.age}\n• Blood Group: ${data.bloodGroup}\n• DOB: ${data.dob}\n• Allergies: ${data.allergies || 'None'}\n• Operations: ${data.operations || 'None'}\n• Medical Conditions: ${data.conditions || 'None'}\n• Medical History: ${data.history || 'None'}\n• Emergency Contact: ${data.emergencyContactName} (${data.emergencyContactRelation})\n• Emergency Phone: ${data.emergencyContactPhone}\n• Security PIN: ****\n\nIs this information correct? Reply 'yes' to save and generate your QR codes, or 'no' to make changes.`,
            hi: `यह रहा आपका विवरण:\n\n• नाम: ${data.name}\n• उम्र: ${data.age}\n• ब्लड ग्रुप: ${data.bloodGroup}\n• जन्म तिथि: ${data.dob}\n• एलर्जी: ${data.allergies || 'कोई नहीं'}\n• ऑपरेशन: ${data.operations || 'कोई नहीं'}\n• चिकित्सा स्थिति: ${data.conditions || 'कोई नहीं'}\n• चिकित्सा इतिहास: ${data.history || 'कोई नहीं'}\n• आपातकालीन संपर्क: ${data.emergencyContactName} (${data.emergencyContactRelation})\n• आपातकालीन फोन: ${data.emergencyContactPhone}\n• सुरक्षा पिन: ****\n\nक्या यह जानकारी सही है? अपनी प्रोफ़ाइल सहेजने और QR कोड बनाने के लिए 'हां' कहें, या बदलाव करने के लिए 'नहीं' कहें।`,
        };

        const summary = summaryText[lang.code as keyof typeof summaryText];
        
        setMessages(prev => [...prev, {
            role: 'assistant',
            content: summary,
        }]);
        
        speakMessage(summary);
    };

    // NEW: Save to database function
    const saveToDatabase = async (data: MedicalData, lang: Language) => {
        try {
            setIsProcessing(true);

            // NEW: Determine if profile should be verified
            const hasBasicInfo = data.name && data.bloodGroup && data.dob && data.profilePin;
            const hasEmergencyContact = data.emergencyContactName && data.emergencyContactPhone;
            const hasMedicalInfo = 
                (data.allergies && data.allergies.toLowerCase() !== 'none') ||
                (data.conditions && data.conditions.toLowerCase() !== 'none') ||
                (data.operations && data.operations.toLowerCase() !== 'none');
            
            const shouldBeVerified = hasBasicInfo && hasEmergencyContact && hasMedicalInfo;
            
            // 1. Save profile data with verification status
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: user?.id,
                    full_name: data.name,
                    blood_type: data.bloodGroup,
                    date_of_birth: data.dob,
                    profile_pin: data.profilePin,
                    verified: shouldBeVerified, // NEW: Set verification status
                    updated_at: new Date().toISOString(),
                });

            if (profileError) throw profileError;

            // 2. Save allergies
            if (data.allergies && data.allergies.toLowerCase() !== 'none') {
                const { error: allergyError } = await supabase
                    .from('allergies')
                    .insert({
                        user_id: user?.id,
                        allergen: data.allergies,
                        severity: 'moderate',
                        created_at: new Date().toISOString(),
                    });
                if (allergyError) console.error('Allergy save error:', allergyError);
            }

            // 3. Save surgeries/operations as medical conditions
            if (data.operations && data.operations.toLowerCase() !== 'none') {
                const { error: operationError } = await supabase
                    .from('medical_conditions')
                    .insert({
                        user_id: user?.id,
                        condition_name: `Surgery: ${data.operations}`,
                        priority_level: 'medium',
                        notes: 'Past surgery/operation',
                        created_at: new Date().toISOString(),
                    });
                if (operationError) console.error('Operation save error:', operationError);
            }

            // 4. Save medical conditions
            if (data.conditions && data.conditions.toLowerCase() !== 'none') {
                const { error: conditionError } = await supabase
                    .from('medical_conditions')
                    .insert({
                        user_id: user?.id,
                        condition_name: data.conditions,
                        priority_level: 'medium',
                        notes: data.history || '',
                        created_at: new Date().toISOString(),
                    });
                if (conditionError) console.error('Condition save error:', conditionError);
            }

            // 5. Save emergency contact
            if (data.emergencyContactName && data.emergencyContactPhone) {
                const { error: contactError } = await supabase
                    .from('emergency_contacts')
                    .insert({
                        user_id: user?.id,
                        name: data.emergencyContactName,
                        relationship: data.emergencyContactRelation || 'Contact',
                        phone_number: data.emergencyContactPhone,
                        is_primary: true,
                        created_at: new Date().toISOString(),
                    });
                if (contactError) console.error('Contact save error:', contactError);
            }

            // 6. Generate QR codes
            await generateQRCodes(data, lang);
            
        } catch (error) {
            console.error('Error saving to database:', error);
            
            const errorMessages = {
                en: "Sorry, there was an error saving your information. Please try again or use the form on the Profile page.",
                hi: "क्षमा करें, आपकी जानकारी सहेजने में त्रुटि हुई। कृपया पुनः प्रयास करें या प्रोफ़ाइल पृष्ठ पर फ़ॉर्म का उपयोग करें।",
            };
            
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: errorMessages[lang.code as keyof typeof errorMessages],
            }]);
            
            setIsProcessing(false);
        }
    };

    const generateQRCodes = async (data: MedicalData, lang: Language) => {
        try {
            // Online QR - contains link to emergency profile
            const onlineURL = `${window.location.origin}/emergency/${user?.id}`;
            
            // Offline QR - contains all medical data directly
            const offlineData = `MEDICAL INFO\nName: ${data.name}\nAge: ${data.age}\nBlood: ${data.bloodGroup}\nDOB: ${data.dob}\nAllergies: ${data.allergies}\nOperations: ${data.operations}\nConditions: ${data.conditions}\nHistory: ${data.history}\nEmergency: ${data.emergencyContactName} (${data.emergencyContactRelation}) - ${data.emergencyContactPhone}`;

            const onlineQRData = await QRCodeLib.toDataURL(onlineURL, {
                width: 400,
                color: { dark: '#0ea5e9', light: '#ffffff' },
                errorCorrectionLevel: 'H',
            });

            const offlineQRData = await QRCodeLib.toDataURL(offlineData, {
                width: 400,
                color: { dark: '#a855f7', light: '#ffffff' },
                errorCorrectionLevel: 'M',
            });

            setOnlineQR(onlineQRData);
            setOfflineQR(offlineQRData);
            setShowQRCodes(true);

            // NEW: Updated success message to mention verification
            const successMessages = {
                en: "✅ **Success!**\n\n🎉 Your medical profile has been saved and verified!\n\n📱 Your QR codes have been generated and are ready to download!\n\n✨ **Your Profile is Now Verified** - Emergency responders will see a verified badge when they scan your QR code.\n\n👉 **Next Step:** Go to the **QR Code page** (click 'Back to Dashboard' then 'Generate QR Code') to view, download, and print your medical ID cards.\n\nThank you for using VitalQR. Stay safe! 🏥",
                hi: "✅ **सफल!**\n\n🎉 आपकी चिकित्सा प्रोफ़ाइल सहेजी और सत्यापित की गई है!\n\n📱 आपके QR कोड तैयार हैं और डाउनलोड के लिए उपलब्ध हैं!\n\n✨ **आपकी प्रोफ़ाइल अब सत्यापित है** - आपातकालीन प्रतिक्रियाकर्ता आपके QR कोड को स्कैन करते समय एक सत्यापित बैज देखेंगे।\n\n👉 **अगला कदम:** **QR कोड पृष्ठ** पर जाएं ('डैशबोर्ड पर वापस जाएं' फिर 'QR कोड बनाएं' पर क्लिक करें) अपने मेडिकल ID कार्ड देखने, डाउनलोड करने और प्रिंट करने के लिए।\n\nVitalQR का उपयोग करने के लिए धन्यवाद। सुरक्षित रहें! 🏥",
            };

            const summary = successMessages[lang.code as keyof typeof successMessages];
            
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: summary,
            }]);
            
            speakMessage(summary);
            setIsProcessing(false);
            
        } catch (error) {
            console.error('Error generating QR codes:', error);
            setIsProcessing(false);
        }
    };

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
                            <Heart className="h-6 w-6 text-white animate-pulse" />
                        </div>
                        <span className="text-xl font-bold text-theme-gradient">
                            Medical Assistant
                        </span>
                    </div>
                </div>
            </nav>

            {/* FIXED: Language Selection Screen */}
            {!selectedLanguage ? (
                <div className="container mx-auto px-4 py-16 relative z-10">
                    <Card className="max-w-2xl mx-auto bg-slate-900/40 border-cyan-400/30 backdrop-blur-xl shadow-2xl hover-theme">
                        <CardHeader className="text-center space-y-4">
                            <div className="mx-auto h-20 w-20 rounded-2xl bg-theme-gradient flex items-center justify-center shadow-lg">
                                <Languages className="h-11 w-11 text-white" />
                            </div>
                            <CardTitle className="text-4xl text-white">
                                Choose Your Language
                            </CardTitle>
                            <CardDescription className="text-blue-200/70 text-lg">
                                Select your preferred language for the medical assistant
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                            {LANGUAGES.map((lang) => (
                                <Button
                                    key={lang.code}
                                    onClick={() => handleLanguageSelect(lang)}
                                    className="h-32 flex-col gap-3 bg-slate-800/50 border-2 border-cyan-400/30 hover:border-cyan-400 hover:bg-cyan-500/10 transition-all duration-300 transform hover:scale-105"
                                >
                                    <span className="text-5xl">{lang.flag}</span>
                                    <div className="text-center">
                                        <div className="text-white font-bold text-xl">{lang.name}</div>
                                        <div className="text-cyan-300 text-sm">{lang.nativeName}</div>
                                    </div>
                                </Button>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <div className="container mx-auto px-4 py-8 relative z-10 max-w-4xl">
                    {/* FIXED: Chat Interface Card */}
                    <Card className="bg-slate-900/40 border-cyan-400/30 backdrop-blur-xl shadow-2xl hover-theme mb-6">
                        <CardHeader className="border-b border-white/10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 rounded-xl bg-theme-gradient flex items-center justify-center shadow-lg">
                                        <Sparkles className="h-6 w-6 text-white" />
                                    </div>
                                    <CardTitle className="text-white text-2xl">
                                        AI Medical Assistant
                                    </CardTitle>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-green-500/20 border border-green-400/30">
                                    <Globe className="h-4 w-4 text-green-400" />
                                    <span className="text-green-300 text-sm font-semibold">
                                        {selectedLanguage.nativeName}
                                    </span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            {/* Messages Container */}
                            <div className="h-[500px] overflow-y-auto space-y-4 mb-4 pr-4">
                                {messages.map((message, index) => (
                                    <div
                                        key={index}
                                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[80%] p-4 rounded-2xl ${
                                                message.role === 'user'
                                                    ? 'bg-theme-gradient text-white'
                                                    : 'bg-slate-800/50 border border-cyan-400/30 text-white'
                                            }`}
                                        >
                                            <div className="whitespace-pre-wrap break-words">
                                                {message.content}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {isProcessing && (
                                    <div className="flex justify-start">
                                        <div className="bg-slate-800/50 border border-cyan-400/30 p-4 rounded-2xl">
                                            <div className="flex items-center gap-2 text-cyan-300">
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                <span>Thinking...</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* FIXED: Input Section Card */}
                    <Card className="bg-slate-900/40 border-cyan-400/30 backdrop-blur-xl shadow-2xl hover-theme">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <Input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && !isProcessing && handleSend()}
                                    placeholder="Type your message or use voice input..."
                                    disabled={isProcessing}
                                    className="flex-1 bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-500 h-12 text-base"
                                />
                                <Button
                                    onClick={startVoiceInput}
                                    disabled={isListening || isProcessing}
                                    className={`h-12 w-12 ${
                                        isListening 
                                            ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                                            : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                                    }`}
                                >
                                    <Mic className={`h-5 w-5 ${isListening ? 'animate-pulse' : ''}`} />
                                </Button>
                                <Button
                                    onClick={handleSend}
                                    disabled={!input.trim() || isProcessing}
                                    className="h-12 bg-theme-gradient hover:shadow-xl hover:shadow-cyan-500/50"
                                >
                                    <Send className="h-5 w-5" />
                                </Button>
                            </div>

                            {/* Voice Input Status */}
                            {isListening && (
                                <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-400/30 flex items-center gap-2 text-red-300 animate-pulse">
                                    <Mic className="h-5 w-5" />
                                    <span className="font-semibold">🎤 Listening... Speak now!</span>
                                </div>
                            )}

                            {/* Internet Connection Notice */}
                            <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-400/30 text-blue-200 text-sm">
                                <p className="flex items-center gap-2 mb-1">
                                    <CheckCircle className="h-4 w-4 text-blue-400" />
                                    <strong>Voice Input Requires Internet Connection</strong>
                                </p>
                                <p className="text-xs text-blue-200/70 ml-6">
                                    Make sure you're connected to WiFi or mobile data. You can always type your answers if voice doesn't work.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}