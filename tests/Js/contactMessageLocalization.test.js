import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { translateMessage } from '../../resources/js/i18n/translations.js';

const contactPage = readFileSync(
    new URL('../../resources/js/Pages/Contact.jsx', import.meta.url),
    'utf8'
);

// Verify static contact-message list and detail copy follows the selected language.
test('contact-message interface labels are localized', () => {
    const examples = [
        ['Contact Messages', 'Pesan Kontak'],
        ['Manage and respond to customer inquiries', 'Kelola dan tanggapi pertanyaan pelanggan'],
        ['Message', 'Pesan'],
        ['Sender', 'Pengirim'],
        ['Status', 'Status'],
        ['Received', 'Diterima'],
        ['Actions', 'Aksi'],
        ['View', 'Lihat'],
        ['Search', 'Cari'],
        ['Search messages...', 'Cari pesan...'],
        ['No messages found', 'Pesan tidak ditemukan'],
        ['all', 'Semua'],
        ['new', 'Baru'],
        ['read', 'Dibaca'],
        ['replied', 'Dibalas'],
        ['closed', 'Ditutup'],
        ['Message Details', 'Detail Pesan'],
        ['Update Status', 'Perbarui Status'],
        ['Internal Notes', 'Catatan Internal'],
        ['Add notes for your team...', 'Tambahkan catatan untuk tim Anda...'],
        ['Saving...', 'Menyimpan...'],
        ['Save Changes', 'Simpan Perubahan'],
        ['Sender Details', 'Detail Pengirim'],
        ['Quick Reply', 'Balasan Cepat'],
        ['Compose Reply', 'Tulis Balasan'],
        ['Delete', 'Hapus'],
        ['Delete Message', 'Hapus Pesan'],
        [
            'Are you sure you want to delete this message? This action cannot be undone.',
            'Apakah Anda yakin ingin menghapus pesan ini? Tindakan ini tidak dapat dibatalkan.',
        ],
        [
            "Thank you for your message! We'll get back to you soon.",
            'Terima kasih atas pesan Anda! Kami akan segera menghubungi Anda.',
        ],
        [
            'Your message could not be sent. Please try again.',
            'Pesan Anda tidak dapat dikirim. Silakan coba lagi.',
        ],
    ];

    for (const [source, translated] of examples) {
        assert.equal(translateMessage('id', source), translated);
        assert.equal(translateMessage('en', source), source);
    }
});

// Translate only the static frame around an untouched database sender name.
test('message title interpolation preserves the sender name', () => {
    assert.equal(
        translateMessage('id', 'Message from :name', { name: 'PT Contoh' }),
        'Pesan dari PT Contoh'
    );
});

test('manual contact-message content remains unchanged', () => {
    const manualContent = 'Permintaan khusus dari PT Contoh';

    assert.equal(translateMessage('id', manualContent), manualContent);
});

test('contact form only resets after stored-success feedback and exposes failures', () => {
    assert.match(contactPage, /if \(page\.props\.flash\?\.success\) \{\s*form\.reset\(\)/);
    assert.match(contactPage, /toast\.error\(t\('Your message could not be sent/);
    assert.doesNotMatch(contactPage, /setFeedback|feedback\?\.type/);
    assert.match(contactPage, /router\.on\('exception'/);
    assert.match(contactPage, /disabled=\{form\.processing\}/);
    assert.match(contactPage, /form\.errors\.(name|email|subject|message)/);
});
