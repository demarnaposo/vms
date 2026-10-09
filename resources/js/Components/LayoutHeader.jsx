import { useLayoutEffect, useRef } from 'react';

export default function LayoutHeader({ children }) {
    const regionRef = useRef(null);

    useLayoutEffect(() => {
        const region = regionRef.current;
        const shell = region.closest('.app-shell');
        const elements = Array.from(region.children);
        let disposed = false;
        let previousHeight;

        const syncHeight = () => {
            if (disposed) return;

            // The last border includes any status banner still above the sticky header.
            const height = elements.at(-1)?.getBoundingClientRect().bottom ?? 0;
            if (height === previousHeight) return;
            previousHeight = height;

            if (height > 0) {
                shell.style.setProperty('--vms-header-height', `${height}px`);
            } else {
                shell.style.removeProperty('--vms-header-height');
            }
        };

        syncHeight();
        const observer =
            typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(syncHeight);
        elements.forEach((element) => observer?.observe(element));
        window.addEventListener('resize', syncHeight);
        window.addEventListener('scroll', syncHeight, { passive: true });
        document.fonts?.ready.then(syncHeight);

        return () => {
            disposed = true;
            observer?.disconnect();
            window.removeEventListener('resize', syncHeight);
            window.removeEventListener('scroll', syncHeight);
            shell.style.removeProperty('--vms-header-height');
        };
    });

    // Avoid a containing box that would constrain the existing sticky page header.
    return (
        <div ref={regionRef} className="contents">
            {children}
        </div>
    );
}
