import { useEffect } from 'react';
import AppIcon from './AppIcon';
// Start Update 11 September 2026, by @WNP: Translate reusable modal titles and actions.
import { useLanguage } from '@/Contexts/LanguageContext';

export default function Modal({ isOpen, onClose, title, children, footer = null, size = 'md' }) {
    const { t } = useLanguage();
    useEffect(() => {
        if (!isOpen) return;
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
                aria-hidden="true"
            />

            <div className="flex min-h-full items-center justify-center p-4">
                <div
                    className={`relative glass-modal p-6 w-full ${sizeClasses[size]} transform transition-all`}
                >
                    {title && (
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-(--color-text-primary)">
                                {t(title)}
                            </h3>
                            <button
                                type="button"
                                onClick={onClose}
                                className="text-(--color-text-tertiary) hover:text-(--color-text-primary) transition-colors"
                                aria-label={t('Close modal')}
                            >
                                <AppIcon name="x-mark" className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    <div>{children}</div>

                    {footer && (
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-(--color-border-primary)">
                            {footer}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function ModalCancelButton({ onClick, children = 'Cancel' }) {
    const { t } = useLanguage();

    return (
        <button type="button" onClick={onClick} className="btn-secondary">
            {t(children)}
        </button>
    );
}

export function ModalPrimaryButton({ onClick, disabled = false, variant = 'primary', children }) {
    const { t } = useLanguage();
    const variants = {
        primary: 'bg-(--color-brand-primary) hover:bg-(--color-brand-primary-hover) text-white',
        success: 'bg-(--color-success) hover:bg-(--color-success-hover) text-white',
        danger: 'bg-(--color-danger) hover:bg-(--color-danger-hover) text-white',
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]}`}
        >
            {t(children)}
        </button>
    );
}
