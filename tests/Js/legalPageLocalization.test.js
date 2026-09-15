import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { translateMessage } from '../../resources/js/i18n/translations.js';

// Start Update 15 September 2026, by @WNP: Verify the public privacy and terms headings follow the selected language.
test('public legal page headings are localized', () => {
    const examples = [
        ['Privacy Policy', 'Kebijakan Privasi'],
        ['Terms of Service', 'Ketentuan Layanan'],
        ['Effective Date: January 15, 2026', 'Tanggal Berlaku: 15 Januari 2026'],
        ['Contents', 'Daftar Isi'],
        ['1. Information We Collect', '1. Informasi yang Kami Kumpulkan'],
        ['2. How We Use Your Information', '2. Cara Kami Menggunakan Informasi Anda'],
        ['3. Information Sharing', '3. Pembagian Informasi'],
        ['4. Data Security', '4. Keamanan Data'],
        ['5. Data Retention', '5. Penyimpanan Data'],
        ['6. Your Rights', '6. Hak Anda'],
        ['7. Cookies and Tracking', '7. Cookie dan Pelacakan'],
        ['1. Acceptance of Terms', '1. Penerimaan Ketentuan'],
        ['2. Description of Service', '2. Deskripsi Layanan'],
        ['3. User Accounts', '3. Akun Pengguna'],
        ['4. Acceptable Use', '4. Penggunaan yang Diizinkan'],
        ['5. Vendor Data & Responsibility', '5. Data dan Tanggung Jawab Vendor'],
        ['6. Payment Terms', '6. Ketentuan Pembayaran'],
        ['7. Intellectual Property', '7. Kekayaan Intelektual'],
        ['8. Limitation of Liability', '8. Batasan Tanggung Jawab'],
        ['9. Termination', '9. Penghentian'],
        ['10. Governing Law', '10. Hukum yang Berlaku'],
    ];

    for (const [source, translated] of examples) {
        assert.equal(translateMessage('id', source), translated);
        assert.equal(translateMessage('en', source), source);
    }
});

// Start Update 15 September 2026, by @WNP: Guard VMS naming and centralized translation usage on both legal pages.
test('public legal pages use the shared translator and VMS application name', () => {
    for (const page of ['Privacy.jsx', 'Terms.jsx']) {
        const source = readFileSync(
            new URL(`../../resources/js/Pages/${page}`, import.meta.url),
            'utf8'
        );
        const sourceWithoutContactEmail = source.replaceAll(
            '@vendorflow.com',
            '@contact-domain.test'
        );

        assert.match(source, /useLanguage/);
        assert.match(source, /const \{ t \} = useLanguage\(\)/);
        assert.doesNotMatch(sourceWithoutContactEmail, /VendorFlow/);
    }
});
