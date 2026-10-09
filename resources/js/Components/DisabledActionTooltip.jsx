import { cloneElement, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/Contexts/LanguageContext';

export function ExplanationTooltip({ content, children, className = '' }) {
    const id = useId();
    const anchorRef = useRef(null);
    const tooltipRef = useRef(null);
    const hideTimer = useRef(null);
    const touchClick = useRef(false);
    const [visible, setVisible] = useState(false);
    const [position, setPosition] = useState({ top: 16, left: 16, placement: 'top' });
    const open = visible;
    const { t } = useLanguage();
    const description = t(content);
    const tooltipId = `${id}-reason`;
    const buttonId = children.props.id || `${id}-control`;

    const show = () => {
        clearTimeout(hideTimer.current);
        setVisible(true);
    };
    const hide = () => {
        clearTimeout(hideTimer.current);
        setVisible(false);
    };
    const deferHide = () => {
        hideTimer.current = setTimeout(() => setVisible(false), 150);
    };

    useEffect(() => () => clearTimeout(hideTimer.current), []);

    useLayoutEffect(() => {
        if (!open) return;
        const update = () => {
            const anchor = anchorRef.current?.getBoundingClientRect();
            const tooltip = tooltipRef.current?.getBoundingClientRect();
            if (!anchor || !tooltip) return;
            const below = anchor.top < tooltip.height + 24;
            setPosition({
                left: Math.max(
                    16,
                    Math.min(anchor.right - tooltip.width, window.innerWidth - tooltip.width - 16)
                ),
                top: Math.max(
                    16,
                    Math.min(
                        below ? anchor.bottom + 8 : anchor.top - tooltip.height - 8,
                        window.innerHeight - tooltip.height - 16
                    )
                ),
                placement: below ? 'bottom' : 'top',
            });
        };
        update();
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [open, content]);

    useEffect(() => {
        if (!open) return;
        const dismiss = (event) => {
            if (event.key === 'Escape') hide();
        };
        const outside = (event) => {
            if (
                !anchorRef.current?.contains(event.target) &&
                !tooltipRef.current?.contains(event.target)
            )
                hide();
        };
        document.addEventListener('keydown', dismiss);
        document.addEventListener('pointerdown', outside);
        return () => {
            document.removeEventListener('keydown', dismiss);
            document.removeEventListener('pointerdown', outside);
        };
    }, [open]);

    // Keep only layout classes on the explanation trigger; button styling stays on the button.
    const layout = (children.props.className || '')
        .split(/\s+/)
        .filter((name) =>
            /^(?:[\w-]+:)*(?:w-|min-w-|max-w-|min-h-|flex-1$|grow$|shrink-|col-span-|absolute$|inset-|right-|left-|top-|bottom-|mt-|mb-|self-)/.test(
                name
            )
        )
        .join(' ');
    const control = cloneElement(children, {
        id: buttonId,
        title: undefined,
        className: children.props.className
            ?.split(/\s+/)
            .filter((name) => !/^(?:[\w-]+:)*(?:mt-|mb-|self-|col-span-)/.test(name))
            .join(' '),
        'aria-describedby': [children.props['aria-describedby'], tooltipId]
            .filter(Boolean)
            .join(' '),
    });
    return (
        <span
            ref={anchorRef}
            data-disabled-trigger=""
            className={`inline-flex min-w-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-brand-primary) [&>button]:w-full ${layout} ${className}`}
            tabIndex={0}
            role="group"
            aria-labelledby={buttonId}
            aria-describedby={tooltipId}
            onMouseEnter={show}
            onMouseLeave={deferHide}
            onFocus={show}
            onBlur={hide}
            onPointerDown={(event) => {
                touchClick.current = event.pointerType === 'touch';
                if (touchClick.current) {
                    event.preventDefault();
                    event.stopPropagation();
                    setVisible((current) => !current);
                }
            }}
            onClickCapture={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (touchClick.current) {
                    touchClick.current = false;
                    return;
                }
                setVisible((current) => !current);
            }}
            onKeyDownCapture={(event) => {
                if (event.key === 'Escape') {
                    event.stopPropagation();
                    hide();
                }
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    show();
                }
            }}
        >
            {control}
            {!open && (
                <span id={tooltipId} role="tooltip" className="sr-only">
                    {description}
                </span>
            )}
            {open &&
                createPortal(
                    <div
                        ref={tooltipRef}
                        id={tooltipId}
                        role="tooltip"
                        data-placement={position.placement}
                        className="fixed z-[200] w-72 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-y-auto rounded-lg bg-gray-900 p-3 text-left text-xs text-white shadow-xl [overflow-wrap:anywhere]"
                        style={{ top: position.top, left: position.left }}
                        onMouseEnter={show}
                        onMouseLeave={deferHide}
                    >
                        {description}
                    </div>,
                    document.body
                )}
        </span>
    );
}

export function DisabledActionTooltip({ disabled, content, children, className }) {
    return disabled && content ? (
        <ExplanationTooltip content={content} className={className}>
            {children}
        </ExplanationTooltip>
    ) : (
        children
    );
}

export function DisabledButton({ disabledReason, ...props }) {
    return (
        <DisabledActionTooltip disabled={props.disabled} content={disabledReason}>
            <button {...props} />
        </DisabledActionTooltip>
    );
}
