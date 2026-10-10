'use client';

import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage();

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            className="gap-2 hover:bg-cyan-500/10 hover:text-cyan-300 border border-transparent hover:border-cyan-400/30 transition-all duration-300"
        >
            <Globe className="h-4 w-4" />
            <span className="font-medium">{language === 'en' ? 'हिंदी' : 'English'}</span>
        </Button>
    );
}