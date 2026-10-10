'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Send, X, Mic, Volume2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/translations';
import { useRouter } from 'next/navigation';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export function ChatBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content:
                'Hello! I\'m your medical assistant. I can help answer health questions and explain medical terms. Please note: I don\'t replace professional medical care. How can I help you today?',
        },
    ]);
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { language } = useLanguage();
    const router = useRouter();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');

        // Simulate AI response (in production, integrate with OpenAI or similar)
        setTimeout(() => {
            const response = generateMedicalResponse(input);
            setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
        }, 1000);
    };

    const handleVoiceInput = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert('Speech recognition not supported in this browser');
            return;
        }

        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.lang = language === 'en' ? 'en-US' : 'hi-IN';
        recognition.continuous = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(transcript);
        };

        recognition.start();
    };

    const speakMessage = (text: string) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language === 'en' ? 'en-US' : 'hi-IN';
        window.speechSynthesis.speak(utterance);
    };

    const generateMedicalResponse = (query: string): string => {
        const lowerQuery = query.toLowerCase();

        if (lowerQuery.includes('emergency') || lowerQuery.includes('911')) {
            return 'If this is a medical emergency, please call emergency services immediately (911 in US, 112 in India). I can provide general information but not emergency medical care.';
        }

        if (lowerQuery.includes('blood pressure')) {
            return 'Normal blood pressure is typically around 120/80 mmHg. High blood pressure (hypertension) is 130/80 or higher. If you have concerns about your blood pressure, please consult a healthcare provider.';
        }

        if (lowerQuery.includes('diabetes')) {
            return 'Diabetes is a condition where blood sugar levels are too high. Type 1 requires insulin, Type 2 can often be managed with lifestyle changes and medication. Regular monitoring and medical care are essential.';
        }

        return 'I understand your question. For specific medical advice, please consult a healthcare professional. I can provide general health information - could you rephrase your question?';
    };

    if (!isOpen) {
        return (
            <Button
                onClick={() => router.push('/chatbot')}
                className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl z-50 bg-theme-accent hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 transform hover:scale-110 glow-cyan group"
                size="icon"
            >
                <MessageCircle className="h-7 w-7 animate-pulse group-hover:scale-110 transition-transform" />
            </Button>
        );
    }

    return null;
}