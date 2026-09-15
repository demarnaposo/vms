import test from 'node:test';
import assert from 'node:assert/strict';
import { translateMessage } from '../../resources/js/i18n/translations.js';

// Start Update 15 September 2026, by @WNP: Verify fixed send-notification controls follow the selected language.
test('send-notification form labels and options are localized', () => {
    const examples = [
        ['Compose Notification', 'Buat Notifikasi'],
        ['Title', 'Judul'],
        ['Notification title', 'Judul notifikasi'],
        ['Write your notification message...', 'Tulis pesan notifikasi Anda...'],
        ['Severity', 'Tingkat Keparahan'],
        ['Send To', 'Kirim Kepada'],
        ['All Vendors', 'Semua Vendor'],
        ['Specific Vendor', 'Vendor Tertentu'],
        ['Specific User', 'Pengguna Tertentu'],
        ['Info', 'Informasi'],
        ['Warning', 'Peringatan'],
        ['Critical', 'Kritis'],
        ['Select Recipient', 'Pilih Penerima'],
        ['Choose a recipient...', 'Pilih penerima...'],
        ['Action URL (Optional)', 'URL Tindakan (Opsional)'],
        ['Clear', 'Kosongkan'],
        ['Sending...', 'Mengirim...'],
        ['Send Notification', 'Kirim Notifikasi'],
    ];

    for (const [source, translated] of examples) {
        assert.equal(translateMessage('id', source), translated);
        assert.equal(translateMessage('en', source), source);
    }
});

// Start Update 15 September 2026, by @WNP: Preserve recipient names and manually authored notification content.
test('manual notification and recipient content remains unchanged', () => {
    assert.equal(
        translateMessage('id', 'PT Vendor Contoh (vendor@example.test)'),
        'PT Vendor Contoh (vendor@example.test)'
    );
    assert.equal(
        translateMessage('id', 'Jadwal pemeliharaan khusus'),
        'Jadwal pemeliharaan khusus'
    );
});
