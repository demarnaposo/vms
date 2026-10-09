import { router } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import { useLanguage } from '@/Contexts/LanguageContext';
import { resolveFlashToast } from '@/utils/flashToast';

const TOAST_OFFSET = { top: 72, right: 16 };

export default function NotificationToaster({ initialPage }) {
    const { language, t } = useLanguage();
    const lastPage = useRef(null);
    const shownFlashIds = useRef(new Set());
    const initialPageHandled = useRef(false);

    useEffect(() => {
        const showFlash = (page) => {
            if (!page || lastPage.current === page) return;
            lastPage.current = page;

            const flash = page.props?.flash;
            if (flash?.id && shownFlashIds.current.has(flash.id)) return;
            const notification = resolveFlashToast(flash, t, language);
            if (!notification) return;
            if (flash?.id) shownFlashIds.current.add(flash.id);

            const options = notification.description
                ? { description: notification.description }
                : undefined;
            toast[notification.type](notification.title, options);
        };

        if (!initialPageHandled.current) {
            initialPageHandled.current = true;
            showFlash(initialPage);
        }
        return router.on('success', (event) => showFlash(event.detail.page));
    }, [initialPage, language, t]);

    return (
        <Toaster
            position="top-right"
            offset={TOAST_OFFSET}
            containerAriaLabel={t('Notifications')}
            toastOptions={{ closeButtonAriaLabel: t('Dismiss') }}
            richColors
            closeButton
        />
    );
}
