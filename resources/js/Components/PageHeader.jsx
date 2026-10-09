import { Link } from '@inertiajs/react';
import AppIcon from './AppIcon';
// Translate shared page headers from the global language context.
import { useLanguage } from '@/Contexts/LanguageContext';

export default function PageHeader({
    title,
    subtitle,
    backLink = null,
    actions = null,
    actionsClassName = '',
}) {
    const { t } = useLanguage();

    return (
        <header className="sticky top-0 z-40 min-h-[73px] bg-(--color-bg-primary)/85 backdrop-blur-xl border-b border-(--color-border-primary) px-4 sm:px-6 md:px-8 py-3">
            <div className="w-full flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
                <div className="min-w-0 flex items-start gap-4 md:flex-1">
                    {backLink && (
                        <Link
                            href={backLink}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-(--color-text-tertiary) hover:text-(--color-text-primary) hover:bg-(--color-bg-hover) transition-colors"
                        >
                            <AppIcon name="chevron-down" className="h-4 w-4 -rotate-90" />
                            {t('Back')}
                        </Link>
                    )}
                    <div className="min-w-0 break-words">
                        <h1 className="text-xl sm:text-2xl font-bold text-(--color-text-primary) tracking-tight">
                            {t(title)}
                        </h1>
                        {subtitle && (
                            <p className="text-(--color-text-tertiary) text-sm mt-1">
                                {t(subtitle)}
                            </p>
                        )}
                    </div>
                </div>

                {actions && (
                    <div
                        className={`min-w-0 max-w-full shrink-0 flex items-center gap-2 flex-wrap md:justify-end ${actionsClassName}`}
                    >
                        <div className="min-w-0 max-w-full flex items-center gap-2 flex-wrap">
                            {actions}
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
