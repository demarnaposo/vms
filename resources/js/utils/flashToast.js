export function resolveFlashToast(flash, translate) {
    if (!flash) return null;

    const success = flash.success ? translate(flash.success) : null;
    const error = flash.error ? translate(flash.error) : null;

    if (success && error) {
        return { type: 'warning', title: success, description: error };
    }
    if (error) return { type: 'error', title: error };
    if (success) return { type: 'success', title: success };
    if (flash.status) {
        const status =
            flash.status === 'verification-link-sent'
                ? 'A new verification link has been sent to your email address.'
                : flash.status;
        return { type: 'success', title: translate(status) };
    }

    return null;
}
