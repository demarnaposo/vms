import { DisabledButton } from './DisabledActionTooltip';
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import AppIcon from './AppIcon';
// Translate reusable form labels, placeholders, options, and errors.
import { useLanguage } from '@/Contexts/LanguageContext';

export function FormInput({
    label,
    type = 'text',
    value,
    onChange,
    error = null,
    placeholder = '',
    required = false,
    showRequiredIndicator = false,
    inputMode,
    autoComplete,
    disabled = false,
    disabledReason,
    icon = null,
    className = '',
}) {
    const id = useId();
    const { t } = useLanguage();
    // Add reusable password visibility state for profile and staff forms.
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const isPassword = type === 'password';
    const resolvedType = isPassword && isPasswordVisible ? 'text' : type;
    const passwordToggleLabel = t(isPasswordVisible ? 'Hide password' : 'Show password');

    return (
        <div className={className}>
            {label && (
                <label
                    htmlFor={id}
                    className="text-sm font-semibold text-(--color-text-primary) mb-2 block"
                >
                    {t(label)}{' '}
                    {(required || showRequiredIndicator) && (
                        <span className="text-(--color-danger)">*</span>
                    )}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-tertiary)">
                        {typeof icon === 'string' ? (
                            <AppIcon
                                name={icon}
                                className="h-4 w-4"
                                fallback={<span className="leading-none">{icon}</span>}
                            />
                        ) : (
                            icon
                        )}
                    </span>
                )}
                <input
                    id={id}
                    type={resolvedType}
                    inputMode={inputMode}
                    autoComplete={autoComplete}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={t(placeholder)}
                    required={required}
                    disabled={disabled}
                    className={`
                        w-full bg-(--color-bg-primary) border-2 border-(--color-border-primary) rounded-xl px-4 py-3 text-(--color-text-primary)
                        placeholder:text-(--color-text-placeholder) transition-all duration-300
                        focus:outline-none focus:border-(--color-brand-primary) focus:ring-4 focus:ring-(--color-brand-primary)/10
                        hover:border-(--color-border-secondary) disabled:bg-(--color-bg-secondary) disabled:cursor-not-allowed
                        ${icon ? 'pl-10' : ''}
                        ${isPassword ? 'pr-12' : ''}
                        ${error ? 'border-(--color-danger) focus:border-(--color-danger) focus:ring-(--color-danger)/10' : ''}
                    `}
                />
                {/* Keep password toggles non-submitting, bilingual, and accessible. */}
                {isPassword && (
                    <DisabledButton
                        type="button"
                        onClick={() =>
                            setIsPasswordVisible((currentVisibility) => !currentVisibility)
                        }
                        disabled={disabled}
                        disabledReason={disabledReason}
                        aria-label={passwordToggleLabel}
                        aria-pressed={isPasswordVisible}
                        title={passwordToggleLabel}
                        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-(--color-text-muted) transition-colors hover:text-(--color-text-primary) focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--color-brand-primary) disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <AppIcon name={isPasswordVisible ? 'eye-off' : 'eye'} className="h-5 w-5" />
                    </DisabledButton>
                )}
            </div>
            {error && (
                <p className="text-sm text-(--color-danger) mt-1.5 flex items-center gap-1">
                    <AppIcon name="warning" className="h-4 w-4" /> {t(error)}
                </p>
            )}
        </div>
    );
}

export function FormTextarea({
    label,
    value,
    onChange,
    error = null,
    placeholder = '',
    required = false,
    showRequiredIndicator = false,
    disabled = false,
    rows = 4,
    className = '',
}) {
    const id = useId();
    const { t } = useLanguage();
    return (
        <div className={className}>
            {label && (
                <label
                    htmlFor={id}
                    className="text-sm font-semibold text-(--color-text-primary) mb-2 block"
                >
                    {t(label)}{' '}
                    {(required || showRequiredIndicator) && (
                        <span className="text-(--color-danger)">*</span>
                    )}
                </label>
            )}
            <textarea
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={t(placeholder)}
                required={required}
                aria-required={required || showRequiredIndicator || undefined}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : undefined}
                disabled={disabled}
                rows={rows}
                className={`
                    w-full bg-(--color-bg-primary) border-2 border-(--color-border-primary) rounded-xl px-4 py-3 text-(--color-text-primary)
                    placeholder:text-(--color-text-placeholder) transition-all duration-300 resize-none
                    focus:outline-none focus:border-(--color-brand-primary) focus:ring-4 focus:ring-(--color-brand-primary)/10
                    hover:border-(--color-border-secondary) disabled:bg-(--color-bg-secondary) disabled:cursor-not-allowed
                    ${error ? 'border-(--color-danger) focus:border-(--color-danger) focus:ring-(--color-danger)/10' : ''}
                `}
            />
            {error && (
                <p
                    id={`${id}-error`}
                    role="alert"
                    className="text-sm text-(--color-danger) mt-1.5 flex items-center gap-1"
                >
                    <AppIcon name="warning" className="h-4 w-4" /> {t(error)}
                </p>
            )}
        </div>
    );
}

export function FormSelect({
    label,
    value,
    onChange,
    options = [],
    translateOptions = true,
    error = null,
    placeholder = 'Select...',
    required = false,
    showRequiredIndicator = false,
    disabled = false,
    disabledReason,
    name = '',
    id,
    size = 'form',
    allowEmpty = true,
    className = '',
    'aria-label': ariaLabel,
    'aria-describedby': describedBy,
}) {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [menuStyle, setMenuStyle] = useState(null);
    const [portalTarget, setPortalTarget] = useState(null);
    const selectRef = useRef(null);
    const triggerRef = useRef(null);
    const menuRef = useRef(null);
    const typeahead = useRef({ text: '', at: 0 });
    const generatedId = useId();
    const buttonId = id || generatedId;
    const listboxId = `${buttonId}-listbox`;
    const open = isOpen && !disabled;

    const normalizedOptions = useMemo(() => {
        const rows = Array.isArray(options)
            ? options.map((option) => ({
                  value: option?.value ?? '',
                  label: option?.label ?? String(option?.value ?? ''),
                  disabled: !!option?.disabled,
              }))
            : [];
        return allowEmpty && !rows.some((option) => String(option.value) === '')
            ? [{ value: '', label: placeholder, placeholder: true }, ...rows]
            : rows;
    }, [options, allowEmpty, placeholder]);
    const selectedIndex = normalizedOptions.findIndex(
        (option) => String(option.value) === String(value ?? '')
    );
    const selectedOption = normalizedOptions[selectedIndex];
    // Retain an edit/draft value even when the current option catalogue excludes it.
    const selectedLabel = selectedOption?.label ?? (value ? String(value) : placeholder);
    const optionLabel = (option) =>
        option.placeholder || translateOptions ? t(option.label) : option.label;
    const selectedText = selectedOption
        ? optionLabel(selectedOption)
        : value != null && value !== ''
          ? String(value)
          : t(placeholder);
    const selectable = normalizedOptions
        .map((option, index) => (option.disabled ? -1 : index))
        .filter((index) => index !== -1);

    const updateMenuPosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        setPortalTarget(triggerRef.current.closest('[role="dialog"]') || document.body);
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const spaceBelow = Math.max(0, viewportHeight - rect.bottom - 16);
        const spaceAbove = Math.max(0, rect.top - 16);
        const upward = spaceBelow < 140 && spaceAbove > spaceBelow;
        const maxHeight = Math.max(1, Math.min(240, upward ? spaceAbove : spaceBelow));
        const width = Math.max(1, Math.min(rect.width, viewportWidth - 16));
        setMenuStyle({
            left: Math.max(8, Math.min(rect.left, viewportWidth - width - 8)),
            top: upward
                ? Math.max(8, rect.top - maxHeight - 8)
                : Math.max(8, Math.min(rect.bottom + 8, viewportHeight - maxHeight - 8)),
            width,
            maxHeight,
        });
    }, []);

    useEffect(() => {
        if (!open) return;
        const outside = (event) => {
            if (
                !selectRef.current?.contains(event.target) &&
                !menuRef.current?.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('pointerdown', outside);
        return () => document.removeEventListener('pointerdown', outside);
    }, [open]);

    useLayoutEffect(() => {
        if (!open) return;
        window.addEventListener('resize', updateMenuPosition);
        window.addEventListener('scroll', updateMenuPosition, true);
        return () => {
            window.removeEventListener('resize', updateMenuPosition);
            window.removeEventListener('scroll', updateMenuPosition, true);
        };
    }, [open, updateMenuPosition]);

    useEffect(() => {
        if (open && activeIndex >= 0) {
            menuRef.current
                ?.querySelector(`[data-option-index="${activeIndex}"]`)
                ?.scrollIntoView({ block: 'nearest' });
        }
    }, [open, activeIndex]);

    const close = () => setIsOpen(false);
    const openMenu = (last = false) => {
        updateMenuPosition();
        setActiveIndex(
            selectable.includes(selectedIndex)
                ? selectedIndex
                : last
                  ? (selectable.at(-1) ?? -1)
                  : (selectable[0] ?? -1)
        );
        setIsOpen(true);
    };
    const handleSelect = (index) => {
        const option = normalizedOptions[index];
        if (!option || option.disabled || disabled) return;
        onChange(option.value);
        close();
        triggerRef.current?.focus();
    };
    const handleKeyDown = (event) => {
        if (disabled) return;
        if (event.key === 'Tab') {
            close();
            return;
        }
        if (event.key === 'Escape' && open) {
            event.preventDefault();
            event.stopPropagation();
            close();
            triggerRef.current?.focus();
            return;
        }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            if (!open) {
                openMenu(event.key === 'ArrowUp' || event.key === 'End');
                if (event.key === 'Home') setActiveIndex(selectable[0] ?? -1);
                if (event.key === 'End') setActiveIndex(selectable.at(-1) ?? -1);
                return;
            }
            const current = selectable.indexOf(activeIndex);
            const next =
                event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? selectable.length - 1
                      : (current + (event.key === 'ArrowUp' ? -1 : 1) + selectable.length) %
                        selectable.length;
            setActiveIndex(selectable[next] ?? -1);
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (open) handleSelect(activeIndex);
            else openMenu();
        } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            const now = Date.now();
            typeahead.current = {
                text:
                    (now - typeahead.current.at < 700 ? typeahead.current.text : '') +
                    event.key.toLocaleLowerCase(),
                at: now,
            };
            const index = selectable.find((i) =>
                String(optionLabel(normalizedOptions[i]))
                    .toLocaleLowerCase()
                    .startsWith(typeahead.current.text)
            );
            if (index !== undefined) {
                event.preventDefault();
                updateMenuPosition();
                setActiveIndex(index);
                setIsOpen(true);
            }
        }
    };
    const sizes = {
        form: 'border-2 rounded-xl px-4 py-3',
        field: 'input-field',
        compact: 'min-h-9 rounded-lg border px-3 py-[7px] text-sm',
    };
    const errorId = `${buttonId}-error`;

    return (
        <div className={`relative min-w-0 ${className}`} ref={selectRef}>
            {label && (
                <label
                    htmlFor={buttonId}
                    className="text-sm font-semibold text-(--color-text-primary) mb-2 block"
                >
                    {t(label)}{' '}
                    {(required || showRequiredIndicator) && (
                        <span aria-hidden="true" className="text-(--color-danger)">
                            *
                        </span>
                    )}
                </label>
            )}
            {name && <input type="hidden" name={name} value={value ?? ''} disabled={disabled} />}
            <DisabledButton
                ref={triggerRef}
                id={buttonId}
                type="button"
                disabled={disabled}
                disabledReason={disabledReason}
                onClick={() => (open ? close() : openMenu())}
                onKeyDown={handleKeyDown}
                onBlur={(event) => {
                    if (!menuRef.current?.contains(event.relatedTarget)) close();
                }}
                className={`w-full min-w-0 bg-(--color-bg-primary) text-(--color-text-primary) text-left transition-colors duration-200 flex items-center justify-between gap-2 focus-visible:outline-none focus-visible:border-(--color-brand-primary) focus-visible:ring-4 focus-visible:ring-(--color-brand-primary)/10 disabled:bg-(--color-bg-secondary) disabled:cursor-not-allowed ${sizes[size] || sizes.form} ${error ? 'border-(--color-danger)' : 'border-(--color-border-primary) hover:border-(--color-border-secondary)'}`}
                role="combobox"
                aria-label={t(ariaLabel || label || placeholder)}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listboxId}
                aria-activedescendant={
                    open && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined
                }
                aria-required={required || showRequiredIndicator || undefined}
                aria-invalid={!!error}
                aria-describedby={
                    [describedBy, error ? errorId : null].filter(Boolean).join(' ') || undefined
                }
                title={selectedOption && !translateOptions ? selectedLabel : selectedText}
            >
                <span
                    className={`min-w-0 flex-1 truncate ${value == null || value === '' ? 'text-(--color-text-placeholder)' : 'text-(--color-text-primary)'}`}
                >
                    {selectedText}
                </span>
                <AppIcon
                    name="chevron-down"
                    className={`h-4 w-4 shrink-0 text-(--color-text-tertiary) ${open ? 'rotate-180' : ''}`}
                />
            </DisabledButton>
            {open &&
                menuStyle &&
                portalTarget &&
                createPortal(
                    <div
                        id={listboxId}
                        ref={menuRef}
                        role="listbox"
                        aria-label={t(ariaLabel || label || placeholder)}
                        className="z-[120] overflow-y-auto overscroll-contain rounded-xl border border-(--color-border-primary) bg-(--color-bg-primary) shadow-2xl"
                        style={{ ...menuStyle, position: 'fixed' }}
                        onKeyDown={handleKeyDown}
                    >
                        {normalizedOptions.every((option) => option.placeholder) && (
                            <p className="px-4 py-2.5 text-sm text-(--color-text-tertiary)">
                                {t('No options available')}
                            </p>
                        )}
                        {normalizedOptions.map((option, index) => (
                            <button
                                key={String(option.value)}
                                id={`${listboxId}-${index}`}
                                data-option-index={index}
                                type="button"
                                role="option"
                                tabIndex={-1}
                                disabled={option.disabled}
                                aria-disabled={option.disabled || undefined}
                                aria-selected={index === selectedIndex}
                                onPointerDown={(event) => event.preventDefault()}
                                onClick={() => handleSelect(index)}
                                className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--color-brand-primary) disabled:opacity-50 disabled:cursor-not-allowed ${index === activeIndex ? 'bg-(--color-bg-secondary)' : ''} ${index === selectedIndex ? 'text-(--color-brand-primary) font-semibold' : 'text-(--color-text-secondary) hover:bg-(--color-bg-secondary)'}`}
                            >
                                <span className="min-w-0 [overflow-wrap:anywhere]">
                                    {optionLabel(option)}
                                </span>
                                {index === selectedIndex && (
                                    <AppIcon name="check" className="h-4 w-4 shrink-0" />
                                )}
                            </button>
                        ))}
                    </div>,
                    portalTarget
                )}
            {error && (
                <p
                    id={errorId}
                    role="alert"
                    className="text-sm text-(--color-danger) mt-1.5 flex items-center gap-1"
                >
                    <AppIcon name="warning" className="h-4 w-4" /> {t(error)}
                </p>
            )}
        </div>
    );
}

export function FormCheckbox({ label, checked, onChange, error = null, className = '' }) {
    const { t } = useLanguage();

    return (
        <div className={className}>
            <label className="flex items-center gap-3 text-sm text-(--color-text-secondary) cursor-pointer group">
                <div className="relative">
                    <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => onChange(e.target.checked)}
                        className="sr-only peer"
                    />
                    <div className="w-5 h-5 rounded-md border-2 border-(--color-border-primary) bg-(--color-bg-primary) transition-all duration-200 peer-checked:bg-(--color-brand-primary) peer-checked:border-(--color-brand-primary) peer-focus:ring-4 peer-focus:ring-(--color-brand-primary)/20 group-hover:border-(--color-brand-primary)"></div>
                    <svg
                        className="absolute top-1 left-1 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                </div>
                <span className="font-medium">{t(label)}</span>
            </label>
            {error && (
                <p className="text-sm text-(--color-danger) mt-1.5 flex items-center gap-1">
                    <AppIcon name="warning" className="h-4 w-4" /> {t(error)}
                </p>
            )}
        </div>
    );
}

// Button component for forms
export function FormButton({
    children,
    type = 'button',
    variant = 'primary',
    disabled = false,
    disabledReason,
    loading = false,
    onClick,
    className = '',
}) {
    const variants = {
        primary:
            'theme-primary-action shadow-lg shadow-(--color-brand-primary)/30 hover:-translate-y-0.5',
        secondary:
            'bg-(--color-bg-primary) text-(--color-text-secondary) border-2 border-(--color-border-primary) hover:border-(--color-brand-primary) hover:text-(--color-brand-primary)',
        success: 'bg-(--color-success) text-white shadow-lg shadow-(--color-success)/30',
        danger: 'bg-(--color-danger) text-white shadow-lg shadow-(--color-danger)/30',
    };

    return (
        <DisabledButton
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            disabledReason={loading ? 'A request is in progress. Please wait.' : disabledReason}
            className={`
                px-6 py-3 rounded-xl font-semibold transition-all duration-300
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                ${variants[variant]} ${className}
            `}
        >
            {loading ? (
                <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                    Processing...
                </span>
            ) : (
                children
            )}
        </DisabledButton>
    );
}
