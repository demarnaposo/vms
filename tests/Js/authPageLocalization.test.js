import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { translateMessage } from '../../resources/js/i18n/translations.js';

// Start Update 15 September 2026, by @WNP: Verify static login and registration examples and role labels are bilingual.
test('authentication form examples and demo labels are localized', () => {
    const examples = [
        ['you@company.com', 'anda@perusahaan.com'],
        ['John Doe', 'John Doe'],
        ['Min 8 characters', 'Minimal 8 karakter'],
        ['Repeat password', 'Ulangi kata sandi'],
        ['Ops', 'Operasional'],
        ['Finance', 'Keuangan'],
    ];

    for (const [source, translated] of examples) {
        assert.equal(translateMessage('id', source), translated);
        assert.equal(translateMessage('en', source), source);
    }
});

// Start Update 15 September 2026, by @WNP: Ensure static placeholders and role labels use the shared translator while credentials remain literal.
test('authentication pages route remaining static copy through the translator', () => {
    const login = readFileSync(
        new URL('../../resources/js/Pages/Auth/Login.jsx', import.meta.url),
        'utf8'
    );
    const register = readFileSync(
        new URL('../../resources/js/Pages/Auth/Register.jsx', import.meta.url),
        'utf8'
    );
    const passwordInput = readFileSync(
        new URL('../../resources/js/Components/PasswordInput.jsx', import.meta.url),
        'utf8'
    );

    assert.match(login, /placeholder=\{t\('you@company\.com'\)\}/);
    assert.match(login, /\{t\('Ops'\)\}: ops@vendorflow\.com \/ password/);
    assert.match(login, /\{t\('Finance'\)\}: finance@vendorflow\.com \/ password/);
    assert.match(register, /placeholder=\{t\('John Doe'\)\}/);
    assert.match(register, /placeholder=\{t\('you@company\.com'\)\}/);
    assert.match(passwordInput, /placeholder=\{t\(placeholder\)\}/);
});
