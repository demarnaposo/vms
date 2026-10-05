import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
// Use the centralized bilingual message resolver.
import { translateMessage } from '@/i18n/translations';

import {
    SUPPORTED_LANGUAGES,
    COOKIE_NAME,
    getInitialLanguage,
    persistLanguage,
} from '@/utils/languagePreferences';

const LanguageContext = createContext(null);

// Provide reactive bilingual state once for the entire Inertia application.
export function LanguageProvider({ children }) {
    const [language, setLanguage] = useState(getInitialLanguage);

    useEffect(() => {
        let active = true;
        document.documentElement.lang = language === 'id' ? 'id-ID' : 'en';
        persistLanguage(language);

        axios.post('/locale').catch(() => {
            if (active) {
                toast.error(
                    translateMessage(
                        language,
                        'Your email language preference could not be saved. Please try again.'
                    ),
                    { id: 'locale-save-error' }
                );
            }
        });
        return () => {
            active = false;
        };
    }, [language]);

    const value = useMemo(
        () => ({
            language,
            setLanguage: (nextLanguage) => {
                if (!SUPPORTED_LANGUAGES.includes(nextLanguage) || nextLanguage === language)
                    return;

                document.cookie = `${COOKIE_NAME}=${nextLanguage}; path=/; max-age=31536000; samesite=lax`;
                setLanguage(nextLanguage);
            },
            t: (message, replacements) => translateMessage(language, message, replacements),
        }),
        [language]
    );

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// Expose the language API only inside the global provider.
export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) throw new Error('useLanguage must be used within LanguageProvider.');

    return context;
}
