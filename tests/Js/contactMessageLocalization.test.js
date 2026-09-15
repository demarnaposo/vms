import test from 'node:test';
import assert from 'node:assert/strict';
import { translateMessage } from '../../resources/js/i18n/translations.js';

// Start Update 15 September 2026, by @WNP: Verify static contact-message list and detail copy follows the selected language.
test('contact-message interface labels are localized', () => {
    const examples = [
        ['Sender', 'Pengirim'],
        ['Received', 'Diterima'],
        ['Search messages...', 'Cari pesan...'],
        ['Message Details', 'Detail Pesan'],
        ['Update Status', 'Perbarui Status'],
        ['Sender Details', 'Detail Pengirim'],
        ['Quick Reply', 'Balasan Cepat'],
        ['Compose Reply', 'Tulis Balasan'],
        ['Delete Message', 'Hapus Pesan'],
    ];

    for (const [source, translated] of examples) {
        assert.equal(translateMessage('id', source), translated);
        assert.equal(translateMessage('en', source), source);
    }
});

// Start Update 15 September 2026, by @WNP: Translate only the static frame around an untouched database sender name.
test('message title interpolation preserves the sender name', () => {
    assert.equal(
        translateMessage('id', 'Message from :name', { name: 'PT Contoh' }),
        'Pesan dari PT Contoh'
    );
});
