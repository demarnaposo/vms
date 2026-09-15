import { useState } from 'react';
import AppIcon from '@/Components/AppIcon';
import { useLanguage } from '@/Contexts/LanguageContext';

// Start Update 15 September 2026, by @WNP: Provide a reusable accessible password visibility control for authentication forms.
export default function PasswordInput({
    value,
    onChange,
    placeholder = '',
    required = false,
    autoComplete,
    className = '',
}) {
    const [isVisible, setIsVisible] = useState(false);
    const { t } = useLanguage();
    const toggleLabel = t(isVisible ? 'Hide password' : 'Show password');

    return (
        <div className="relative">
            {/* Start Update 15 September 2026, by @WNP: Translate only the static password placeholder while preserving the entered value. */}
            <input
                type={isVisible ? 'text' : 'password'}
                value={value}
                onChange={onChange}
                placeholder={t(placeholder)}
                required={required}
                autoComplete={autoComplete}
                className={`${className} pr-12`}
            />
            <button
                type="button"
                onClick={() => setIsVisible((currentVisibility) => !currentVisibility)}
                aria-label={toggleLabel}
                aria-pressed={isVisible}
                title={toggleLabel}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-(--color-text-muted) transition-colors hover:text-(--color-text-primary) focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--color-brand-primary)"
            >
                <AppIcon name={isVisible ? 'eye-off' : 'eye'} className="h-5 w-5" />
            </button>
        </div>
    );
}
