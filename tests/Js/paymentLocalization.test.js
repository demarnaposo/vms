import test from 'node:test';
import assert from 'node:assert/strict';
import { translateMessage } from '../../resources/js/i18n/translations.js';
// Start Update 16 September 2026, by @WNP: Verify known stored payment methods separately from manual text.
import { translatePaymentMethod } from '../../resources/js/i18n/paymentMethods.js';

// Start Update 13 September 2026, by @WNP: Cover fixed payment labels, status enums, and count frames in both languages.
test('payment UI labels follow the selected language', () => {
    assert.equal(translateMessage('id', 'Pending Amount'), 'Nominal Tertunda');
    assert.equal(translateMessage('id', 'pending finance'), 'Menunggu Keuangan');
    assert.equal(translateMessage('id', 'Mark as Paid'), 'Tandai Dibayar');
    assert.equal(translateMessage('id', 'Amount (:code)', { code: 'IDR' }), 'Nominal (IDR)');
    assert.equal(
        translateMessage('id', 'Payment Records (:count shown)', { count: 2 }),
        'Catatan Pembayaran (2 ditampilkan)'
    );
    assert.equal(translateMessage('en', 'Mark as Paid'), 'Mark as Paid');
});

// Start Update 13 September 2026, by @WNP: Ensure transaction references and typed descriptions stay verbatim.
test('payment free text remains unchanged', () => {
    assert.equal(translateMessage('id', 'INV-2026-001'), 'INV-2026-001');
    assert.equal(
        translateMessage('id', 'Monthly maintenance for client A'),
        'Monthly maintenance for client A'
    );
});

// Start Update 16 September 2026, by @WNP: Translate fixed method choices case-insensitively and preserve custom values.
test('known payment methods are localized without changing stored custom methods', () => {
    assert.equal(translatePaymentMethod('id', 'Wire Transfer'), 'Transfer Bank');
    assert.equal(translatePaymentMethod('id', 'wire transfer'), 'Transfer Bank');
    assert.equal(translatePaymentMethod('id', 'Bank Transfer'), 'Transfer Bank');
    assert.equal(translatePaymentMethod('id', 'Cheque'), 'Cek');
    assert.equal(translatePaymentMethod('en', 'wire transfer'), 'Wire Transfer');
    assert.equal(
        translatePaymentMethod('id', 'Corporate Treasury Channel'),
        'Corporate Treasury Channel'
    );
    assert.equal(translatePaymentMethod('id', null, 'N/A'), 'N/A');
});
