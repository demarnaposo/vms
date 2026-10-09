import { DisabledButton } from './DisabledActionTooltip';
import { Link } from '@inertiajs/react';
import { useLanguage } from '@/Contexts/LanguageContext';

const variants = {
    primary: 'theme-primary-action shadow-md shadow-(--color-brand-primary)/30',
    secondary:
        'bg-(--color-bg-secondary) hover:bg-(--color-bg-tertiary) text-(--color-text-secondary)',
    success: 'bg-(--color-success) hover:bg-(--color-success-dark) text-white',
    danger: 'bg-(--color-danger) hover:bg-(--color-danger-dark) text-white',
    warning: 'bg-(--color-warning) hover:bg-(--color-warning-dark) text-white',
    ghost: 'hover:bg-(--color-bg-secondary) text-(--color-text-secondary) hover:text-(--color-text-primary)',
    outline:
        'border border-(--color-border-primary) hover:border-(--color-border-secondary) text-(--color-text-secondary) hover:bg-(--color-bg-secondary)',
};

function actionClasses(variant, className) {
    return `inline-flex items-center gap-2 rounded-xl font-medium px-3 py-1.5 text-sm transition-colors motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-brand-primary) ${variants[variant] || variants.primary} ${className}`;
}

// Opt-in list and detail actions; form buttons retain their existing sizes.
export function ActionButton({
    children,
    variant = 'primary',
    className = '',
    type = 'button',
    ...props
}) {
    const { t } = useLanguage();
    return (
        <DisabledButton {...props} type={type} className={actionClasses(variant, className)}>
            {t(children)}
        </DisabledButton>
    );
}

export function ActionLink({ children, variant = 'outline', className = '', ...props }) {
    return (
        <Link {...props} className={actionClasses(variant, className)}>
            {children}
        </Link>
    );
}

export function ActionAnchor({ children, variant = 'outline', className = '', ...props }) {
    return (
        <a {...props} className={actionClasses(variant, className)}>
            {children}
        </a>
    );
}
