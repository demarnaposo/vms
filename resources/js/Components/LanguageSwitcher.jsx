// Start Update 11 September 2026, by @WNP: Consume the global language state in a reusable accessible switch.
import { useLanguage } from '@/Contexts/LanguageContext';

// Start Update 11 September 2026, by @WNP: Keep static language options outside render for stable reuse.
const LANGUAGE_OPTIONS = Object.freeze([
    { code: 'en', label: 'EN', title: 'English' },
    { code: 'id', label: 'ID', title: 'Indonesian' },
]);

export default function LanguageSwitcher({ compact = false }) {
    const { language, setLanguage, t } = useLanguage();

    return (
        <div
            className="inline-flex items-center rounded-lg border border-(--color-border-primary) bg-(--color-bg-primary) p-0.5"
            role="group"
            aria-label={t('Language')}
        >
            {LANGUAGE_OPTIONS.map((option) => (
                <button
                    key={option.code}
                    type="button"
                    onClick={() => setLanguage(option.code)}
                    className={`${compact ? 'h-7 min-w-8 text-[10px]' : 'h-8 min-w-9 text-xs'} rounded-md px-2 font-semibold transition-colors ${
                        language === option.code
                            ? 'bg-(--color-brand-primary) text-white shadow-sm'
                            : 'text-(--color-text-tertiary) hover:bg-(--color-bg-hover) hover:text-(--color-text-primary)'
                    }`}
                    aria-pressed={language === option.code}
                    title={t(option.title)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
