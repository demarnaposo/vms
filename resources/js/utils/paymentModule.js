// [VMS_PAYMENTS_DISABLED] Payments run externally; config/features.php supplies the flag through Inertia.
export const paymentsEnabled = (features) => features?.payments?.enabled === true;

export function isPaymentUrl(url) {
    if (typeof url !== 'string') return false;
    try {
        const path = decodeURIComponent(new URL(url, 'https://vms.invalid').pathname)
            .toLowerCase()
            .replace(/^\/+|\/+$/g, '');
        return /^(?:vendor\/payments(?:\/.*)?|admin\/payments(?:\/.*)?|admin\/reports\/payment|admin\/reports\/export\/payment(?:_report)?)$/.test(
            path
        );
    } catch {
        return false;
    }
}

export const paymentLinkVisible = (url, features) =>
    paymentsEnabled(features) || !isPaymentUrl(url);
