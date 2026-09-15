import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { translateMessage } from '../../resources/js/i18n/translations.js';
import { formatRelativeTime } from '../../resources/js/utils/dateFormatters.js';

// Start Update 15 September 2026, by @WNP: Verify fixed notification-center labels and empty states are bilingual.
test('notification center static copy is localized', () => {
    const examples = [
        [':count unread', '3 belum dibaca', { count: 3 }],
        [':count unread notifications', '3 notifikasi belum dibaca', { count: 3 }],
        ['Mark all as read', 'Tandai semua sudah dibaca'],
        ['Mark All as Read', 'Tandai Semua Sudah Dibaca'],
        ['Mark read', 'Tandai sudah dibaca'],
        ['No notifications', 'Tidak ada notifikasi'],
        ['You are all caught up.', 'Semua sudah selesai.'],
        ['No notifications found for this filter.', 'Tidak ada notifikasi untuk filter ini.'],
        ['Unread', 'Belum Dibaca'],
        ['View Details', 'Lihat Detail'],
        ['What notifications will you receive?', 'Notifikasi apa yang akan Anda terima?'],
        ['Document Updates', 'Pembaruan Dokumen'],
        ['Payment Status', 'Status Pembayaran'],
        ['Compliance Alerts', 'Peringatan Kepatuhan'],
        ['Account Updates', 'Pembaruan Akun'],
        ['All notifications marked as read.', 'Semua notifikasi telah ditandai dibaca.'],
    ];

    for (const [source, translated, replacements = {}] of examples) {
        assert.equal(translateMessage('id', source, replacements), translated);
        assert.equal(
            translateMessage('en', source, replacements),
            Object.entries(replacements).reduce(
                (result, [key, value]) => result.replaceAll(`:${key}`, String(value)),
                source
            )
        );
    }
});

// Start Update 15 September 2026, by @WNP: Verify relative notification timestamps follow the selected locale.
test('notification relative time follows the selected locale', () => {
    const twoMinutesAgo = new Date(Date.now() - 125000);

    assert.equal(formatRelativeTime(twoMinutesAgo, 'id-ID'), '2 menit yang lalu');
    assert.equal(formatRelativeTime(twoMinutesAgo, 'en-US'), '2 minutes ago');
});

// Start Update 15 September 2026, by @WNP: Preserve notification content stored in the database on both pages.
test('notification database content remains untranslated', () => {
    for (const page of [
        '../../resources/js/Pages/Notifications/Index.jsx',
        '../../resources/js/Pages/Vendor/Notifications.jsx',
    ]) {
        const source = readFileSync(new URL(page, import.meta.url), 'utf8');

        assert.match(source, /notification\.data\?\.title/);
        assert.match(source, /notification\.data\?\.message/);
    }

    assert.equal(
        translateMessage('id', 'Pengumuman khusus dari administrator'),
        'Pengumuman khusus dari administrator'
    );
});
