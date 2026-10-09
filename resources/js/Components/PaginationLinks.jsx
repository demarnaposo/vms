import { DisabledActionTooltip } from './DisabledActionTooltip';
import { Link } from '@inertiajs/react';
import { useLanguage } from '@/Contexts/LanguageContext';

export default function PaginationLinks({ links = [] }) {
    const { t } = useLanguage();

    if (links.length <= 3) return null;

    return (
        <nav aria-label={t('Pagination')} className="flex flex-wrap gap-1 justify-end p-4">
            {links.map((link, index) => {
                const label = link.label.replace(/&laquo;|&raquo;|&amp;|<[^>]*>/g, '').trim();
                const classes = `rounded-lg border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-brand-primary) ${link.active ? 'bg-(--color-brand-primary) text-white' : 'border-(--color-border-primary) text-(--color-text-secondary)'}`;

                return link.url ? (
                    <Link
                        key={index}
                        href={link.url}
                        preserveScroll
                        className={classes}
                        aria-current={link.active ? 'page' : undefined}
                    >
                        {t(label || (index === 0 ? 'Previous' : 'Next'))}
                    </Link>
                ) : (
                    <DisabledActionTooltip
                        key={index}
                        disabled
                        content={
                            link.active
                                ? 'This is the current page.'
                                : index === 0
                                  ? 'You are already on the first page.'
                                  : index === links.length - 1
                                    ? 'You are already on the last page.'
                                    : 'This pagination item is not a navigable page.'
                        }
                    >
                        <span aria-disabled="true" className={`${classes} opacity-50`}>
                            {t(label || (index === 0 ? 'Previous' : 'Next'))}
                        </span>
                    </DisabledActionTooltip>
                );
            })}
        </nav>
    );
}
