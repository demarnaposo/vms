import { createContext, useContext, useEffect, useMemo, useState } from 'react';
// Use the centralized bilingual message resolver.
import { translateMessage } from '@/i18n/translations';

// Keep supported languages and VMS persistence keys centralized.
const SUPPORTED_LANGUAGES = Object.freeze(['en', 'id']);
const STORAGE_KEY = 'vms.preferences.v1';
const COOKIE_NAME = 'vms_locale';
const LanguageContext = createContext(null);

// Restore a validated language preference from versioned browser storage or cookie.
function getInitialLanguage() {
    if (typeof window === 'undefined') return 'en';

    try {
        const preferences = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
        if (SUPPORTED_LANGUAGES.includes(preferences.language)) return preferences.language;
    } catch {
        // Ignore malformed local preferences and continue with the cookie/default.
    }

    const cookieLanguage = document.cookie
        .split('; ')
        .find((cookie) => cookie.startsWith(`${COOKIE_NAME}=`))
        ?.split('=')[1];

    return SUPPORTED_LANGUAGES.includes(cookieLanguage) ? cookieLanguage : 'en';
}

// Provide reactive bilingual state once for the entire Inertia application.
export function LanguageProvider({ children }) {
    const [language, setLanguage] = useState(getInitialLanguage);

    useEffect(() => {
        document.documentElement.lang = language === 'id' ? 'id-ID' : 'en';
        document.cookie = `${COOKIE_NAME}=${language}; path=/; max-age=31536000; samesite=lax`;

        let preferences = {};
        try {
            preferences = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
        } catch {
            preferences = {};
        }
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...preferences, language }));
    }, [language]);

    const value = useMemo(
        () => ({
            language,
            setLanguage: (nextLanguage) => {
                if (SUPPORTED_LANGUAGES.includes(nextLanguage)) setLanguage(nextLanguage);
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
