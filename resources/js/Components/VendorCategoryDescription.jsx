import { useId } from 'react';
import { useLanguage } from '@/Contexts/LanguageContext';
import { vendorCategoryLabel } from '@/i18n/vendorCategories';

export default function VendorCategoryDescription({ category, className = '' }) {
    const id = useId();
    const { language, t } = useLanguage();
    return (
        <div className={`min-w-0 ${className}`}>
            <label
                htmlFor={id}
                className="mb-2 block text-sm font-medium text-(--color-text-secondary)"
            >
                {t('Category Description')}
            </label>
            <textarea
                id={id}
                readOnly
                rows={3}
                value={vendorCategoryLabel(language, category, 'description')}
                placeholder={t('No category description available.')}
                spellCheck={false}
                className="input-field w-full resize-y bg-(--color-bg-secondary) focus-visible:ring-2 focus-visible:ring-(--color-brand-primary)"
            />
        </div>
    );
}
