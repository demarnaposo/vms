import { useEffect, useRef, useState } from 'react';
import AppIcon from './AppIcon';
import { useLanguage } from '@/Contexts/LanguageContext';

import {
    DEFAULT_THEME,
    applyTheme,
    getInitialTheme,
    normalizeTheme,
    persistTheme,
} from '@/utils/themePreferences';

const THEME_OPTIONS = [
    {
        id: 'ocean',
        label: 'Ocean',
        description: 'Cool blue tones',
        icon: 'wave',
    },
    {
        id: 'midnight',
        label: 'Midnight',
        description: 'Dark workspace',
        icon: 'moon',
    },
];

export default function ThemeSwitcher({ className = '', compact = false, align = 'right' }) {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [theme, setTheme] = useState(() => getInitialTheme());
    const ref = useRef(null);

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    useEffect(() => {
        const onClick = (event) => {
            if (!ref.current?.contains(event.target)) {
                setIsOpen(false);
            }
        };

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener('mousedown', onClick);
        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('mousedown', onClick);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, []);

    const currentOption =
        THEME_OPTIONS.find((option) => option.id === theme) ||
        THEME_OPTIONS.find((option) => option.id === DEFAULT_THEME);

    const handleSelect = (nextTheme) => {
        const normalized = normalizeTheme(nextTheme);
        setTheme(normalized);
        applyTheme(normalized);
        persistTheme(normalized);
        setIsOpen(false);
    };

    const alignClass = {
        left: 'left-0',
        right: 'right-0',
    };

    return (
        <div ref={ref} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className={`inline-flex items-center gap-2 rounded-xl border border-(--color-border-primary) bg-(--color-bg-primary)/85 text-(--color-text-secondary) hover:text-(--color-text-primary) hover:border-(--color-border-hover) transition-colors focus-visible:ring-2 focus-visible:ring-(--color-brand-primary) ${
                    compact ? 'px-2.5 py-2 text-xs' : 'px-3 py-2 text-sm'
                }`}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-label={t('Theme options')}
                title={t('Theme options')}
            >
                <AppIcon name={currentOption.icon} className={compact ? 'h-4 w-4' : 'h-4 w-4'} />
                {!compact && <span>{currentOption.label}</span>}
                <AppIcon name="chevron-down" className="h-4 w-4" />
            </button>

            {isOpen && (
                <div
                    className={`absolute ${alignClass[align] || alignClass.right} mt-2 w-52 max-w-[calc(100vw-2rem)] rounded-2xl border border-(--color-border-primary) bg-(--color-bg-primary)/96 backdrop-blur-xl shadow-token-lg p-2 z-50`}
                    role="menu"
                >
                    {THEME_OPTIONS.map((option) => {
                        const isActive = option.id === theme;

                        return (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => handleSelect(option.id)}
                                className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-(--color-brand-primary) ${
                                    isActive
                                        ? 'bg-(--color-brand-primary-light) text-(--color-brand-primary)'
                                        : 'text-(--color-text-secondary) hover:bg-(--color-bg-secondary)'
                                }`}
                                role="menuitemradio"
                                aria-checked={isActive}
                            >
                                <span className="flex items-center gap-2 min-w-0">
                                    <AppIcon name={option.icon} className="h-4 w-4 shrink-0" />
                                    <span className="min-w-0">
                                        <span className="block text-sm font-semibold">
                                            {option.label}
                                        </span>
                                        <span className="block text-xs opacity-80">
                                            {t(option.description)}
                                        </span>
                                    </span>
                                </span>
                                {isActive && (
                                    <AppIcon name="success" className="h-4 w-4 shrink-0" />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
