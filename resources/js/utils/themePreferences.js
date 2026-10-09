export const DEFAULT_THEME = 'ocean';
export const SUPPORTED_THEMES = Object.freeze(['ocean', 'midnight']);
const STORAGE_KEY = 'vms-theme';

export function normalizeTheme(theme) {
    return SUPPORTED_THEMES.includes(theme) ? theme : DEFAULT_THEME;
}

export function applyTheme(
    theme,
    browserDocument = typeof document === 'undefined' ? null : document
) {
    const normalized = normalizeTheme(theme);
    if (browserDocument) {
        browserDocument.documentElement.dataset.theme = normalized;
        browserDocument.documentElement.classList.toggle('dark', normalized === 'midnight');
    }
    return normalized;
}

export function getInitialTheme(
    browserWindow = typeof window === 'undefined' ? null : window,
    browserDocument = typeof document === 'undefined' ? null : document
) {
    if (!browserWindow) return DEFAULT_THEME;

    try {
        const stored = browserWindow.localStorage.getItem(STORAGE_KEY);
        const normalized = normalizeTheme(stored);
        if (stored !== null && stored !== normalized) persistTheme(normalized, browserWindow);
        return normalized;
    } catch {
        // Keep the theme applied before React when storage becomes unavailable.
    }

    const applied = browserDocument?.documentElement?.dataset.theme;
    return normalizeTheme(applied);
}

export function persistTheme(theme, browserWindow = typeof window === 'undefined' ? null : window) {
    const normalized = normalizeTheme(theme);

    try {
        browserWindow?.localStorage.setItem(STORAGE_KEY, normalized);
    } catch {
        // Theme switching must still work when storage is blocked or full.
    }
}
