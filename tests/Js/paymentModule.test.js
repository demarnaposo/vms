import test from 'node:test';
import assert from 'node:assert/strict';
import {
    paymentsEnabled,
    paymentLinkVisible,
    isPaymentUrl,
} from '../../resources/js/utils/paymentModule.js';

const disabled = { payments: { enabled: false } };
const enabled = { payments: { enabled: true } };
const paymentLinks = [
    '/vendor/payments',
    '/vendor/payments/request',
    '/admin/payments?status=approved',
    '/admin/payments/12',
    '/admin/reports/payment',
    '/admin/reports/export/payment',
    'https://vms.example/admin/reports/export/PAYMENT',
    '/admin/reports/export/%70ayment',
];
const otherLinks = [
    '/admin/vendors',
    '/vendor/documents',
    '/admin/performance',
    '/admin/reports',
    '/admin/reports/export/vendor',
    '/admin/reports/export/compliance_report',
    '/vendor/notifications?filter=payment',
];

test('payment navigation and historical action links default to hidden and return when enabled', () => {
    assert.equal(paymentsEnabled(), false);
    assert.equal(paymentsEnabled({ payments: { enabled: 'true' } }), false);
    for (const href of paymentLinks) {
        assert.equal(isPaymentUrl(href), true, href);
        assert.equal(paymentLinkVisible(href), false, href);
        assert.equal(paymentLinkVisible(href, disabled), false, href);
        assert.equal(paymentLinkVisible(href, enabled), true, href);
    }
    const navigation = [...paymentLinks, ...otherLinks];
    assert.deepEqual(
        navigation.filter((href) => paymentLinkVisible(href, disabled)),
        otherLinks
    );
    assert.deepEqual(
        navigation.filter((href) => paymentLinkVisible(href, enabled)),
        navigation
    );
});

test('shared navigation and historical notification filters remain available', () => {
    for (const href of otherLinks) assert.equal(paymentLinkVisible(href, disabled), true, href);
    assert.equal(isPaymentUrl(null), false);
    assert.equal(isPaymentUrl('http://['), false);
});
