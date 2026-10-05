// Keep the existing VMS preference keys and priority: storage, cookie, then Indonesian.
export const SUPPORTED_LANGUAGES = Object.freeze(['en', 'id']);
const STORAGE_KEY = 'vms.preferences.v1';
export const COOKIE_NAME = 'vms_locale';

export function getInitialLanguage(
    browserWindow = typeof window === 'undefined' ? null : window,
    browserDocument = typeof document === 'undefined' ? null : document
) {
    if (!browserWindow) return 'id';

    try {
        const preferences = JSON.parse(browserWindow.localStorage.getItem(STORAGE_KEY) || '{}');
        if (SUPPORTED_LANGUAGES.includes(preferences?.language)) return preferences.language;
    } catch {
        // Ignore malformed or unavailable storage and continue with the cookie/default.
    }

    const cookieLanguage = browserDocument?.cookie
        ?.split('; ')
        .find((cookie) => cookie.startsWith(`${COOKIE_NAME}=`))
        ?.split('=')[1];

    return SUPPORTED_LANGUAGES.includes(cookieLanguage) ? cookieLanguage : 'id';
}

export function persistLanguage(
    language,
    browserWindow = typeof window === 'undefined' ? null : window,
    browserDocument = typeof document === 'undefined' ? null : document
) {
    if (!SUPPORTED_LANGUAGES.includes(language)) return;
    if (browserDocument) {
        browserDocument.cookie = `${COOKIE_NAME}=${language}; path=/; max-age=31536000; samesite=lax`;
    }

    try {
        let preferences = {};
        try {
            preferences = JSON.parse(browserWindow.localStorage.getItem(STORAGE_KEY) || '{}');
        } catch {
            // Retain cookie-based persistence when existing storage cannot be read.
        }
        browserWindow.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ ...preferences, language })
        );
    } catch {
        // Blocked or full storage must not interrupt language state or server synchronization.
    }
}
