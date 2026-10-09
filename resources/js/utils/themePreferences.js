export const DEFAULT_THEME = 'ocean';
export const SUPPORTED_THEMES = Object.freeze(['aurora', 'ocean', 'sunset', 'midnight']);
const STORAGE_KEY = 'vms-theme';

export function getInitialTheme(
    browserWindow = typeof window === 'undefined' ? null : window,
    browserDocument = typeof document === 'undefined' ? null : document
) {
    if (!browserWindow) return DEFAULT_THEME;

    try {
        const stored = browserWindow.localStorage.getItem(STORAGE_KEY);
        return SUPPORTED_THEMES.includes(stored) ? stored : DEFAULT_THEME;
    } catch {
        // Keep the theme applied before React when storage becomes unavailable.
    }

    const applied = browserDocument?.documentElement?.dataset.theme;
    return SUPPORTED_THEMES.includes(applied) ? applied : DEFAULT_THEME;
}

export function persistTheme(theme, browserWindow = typeof window === 'undefined' ? null : window) {
    if (!SUPPORTED_THEMES.includes(theme)) return;

    try {
        browserWindow?.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
        // Theme switching must still work when storage is blocked or full.
    }
}
