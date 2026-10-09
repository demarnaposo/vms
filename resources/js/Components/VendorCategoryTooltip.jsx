import AppIcon from '@/Components/AppIcon';
import { ExplanationTooltip } from '@/Components/DisabledActionTooltip';
import { useLanguage } from '@/Contexts/LanguageContext';
import { vendorCategoryLabel } from '@/i18n/vendorCategories';

export default function VendorCategoryTooltip({ category }) {
    const { language, t } = useLanguage();
    const description = vendorCategoryLabel(language, category, 'description');
    if (!description) return null;

    return (
        <ExplanationTooltip content={<span className="whitespace-pre-wrap">{description}</span>}>
            <button
                type="button"
                tabIndex={-1}
                aria-label={t('Category Description')}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-(--color-text-tertiary) hover:bg-(--color-bg-secondary) hover:text-(--color-brand-primary) focus-visible:outline-2 focus-visible:outline-(--color-brand-primary)"
            >
                <AppIcon name="info" className="h-4 w-4" />
            </button>
        </ExplanationTooltip>
    );
}
