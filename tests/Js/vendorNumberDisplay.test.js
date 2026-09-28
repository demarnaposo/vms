import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { translateMessage } from '../../resources/js/i18n/translations.js';

const readPage = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('Vendor ID label is bilingual', () => {
    assert.equal(translateMessage('en', 'Vendor ID'), 'Vendor ID');
    assert.equal(translateMessage('id', 'Vendor ID'), 'ID Vendor');
});

test('Vendor ID is visible in vendor and staff views', () => {
    const pages = [
        '../../resources/js/Pages/Vendor/Dashboard.jsx',
        '../../resources/js/Pages/Vendor/Profile.jsx',
        '../../resources/js/Pages/Admin/Vendors/Index.jsx',
        '../../resources/js/Pages/Admin/Vendors/Show.jsx',
        '../../resources/js/Pages/Admin/Reports/VendorSummaryReport.jsx',
    ];

    for (const page of pages) {
        const source = readPage(page);
        assert.match(source, /vendor_number/);
        assert.match(source, /Vendor ID/);
    }
});
