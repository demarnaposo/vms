import { translateDocumentTypeLabel } from '../i18n/documentTypes.js';

export function resolveFlashToast(flash, translate, language = 'en') {
    if (!flash) return null;

    const documentMessage = flash.success_i18n;
    const hasDocumentMessage =
        [':document verified successfully.', ':document rejected.'].includes(
            documentMessage?.message
        ) &&
        typeof documentMessage?.document_type?.name === 'string' &&
        typeof documentMessage?.document_type?.display_name === 'string';
    const success = flash.success
        ? hasDocumentMessage
            ? translate(documentMessage.message, {
                  document: translateDocumentTypeLabel(language, documentMessage.document_type),
              })
            : translate(flash.success)
        : null;
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
