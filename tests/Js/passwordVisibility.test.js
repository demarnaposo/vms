import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { translateMessage } from '../../resources/js/i18n/translations.js';

// Start Update 15 September 2026, by @WNP: Verify password visibility labels follow the selected language.
test('password visibility labels are localized', () => {
    assert.equal(translateMessage('id', 'Show password'), 'Tampilkan kata sandi');
    assert.equal(translateMessage('id', 'Hide password'), 'Sembunyikan kata sandi');
    assert.equal(translateMessage('en', 'Show password'), 'Show password');
    assert.equal(translateMessage('en', 'Hide password'), 'Hide password');
});

// Start Update 15 September 2026, by @WNP: Guard the toggle behavior and non-submitting accessible button semantics.
test('password input starts hidden and exposes an accessible toggle', () => {
    const source = readFileSync(
        new URL('../../resources/js/Components/PasswordInput.jsx', import.meta.url),
        'utf8'
    );

    assert.match(source, /useState\(false\)/);
    assert.match(source, /type=\{isVisible \? 'text' : 'password'\}/);
    assert.match(source, /type="button"/);
    assert.match(source, /aria-label=\{toggleLabel\}/);
    assert.match(source, /aria-pressed=\{isVisible\}/);
    assert.match(source, /isVisible \? 'eye-off' : 'eye'/);
});

// Start Update 15 September 2026, by @WNP: Ensure login and both registration password fields use the shared control.
test('login and registration use the shared password input', () => {
    const login = readFileSync(
        new URL('../../resources/js/Pages/Auth/Login.jsx', import.meta.url),
        'utf8'
    );
    const register = readFileSync(
        new URL('../../resources/js/Pages/Auth/Register.jsx', import.meta.url),
        'utf8'
    );

    assert.equal(login.match(/<PasswordInput/g)?.length, 1);
    assert.equal(register.match(/<PasswordInput/g)?.length, 2);
    assert.match(login, /autoComplete="current-password"/);
    assert.equal(register.match(/autoComplete="new-password"/g)?.length, 2);
});

// Start Update 15 September 2026, by @WNP: Verify reusable form password fields receive the same accessible visibility behavior.
test('reusable form password inputs expose an accessible toggle', () => {
    const source = readFileSync(
        new URL('../../resources/js/Components/FormInputs.jsx', import.meta.url),
        'utf8'
    );

    assert.match(source, /const isPassword = type === 'password'/);
    assert.match(source, /type=\{resolvedType\}/);
    assert.match(source, /type="button"/);
    assert.match(source, /aria-label=\{passwordToggleLabel\}/);
    assert.match(source, /aria-pressed=\{isPasswordVisible\}/);
    assert.match(source, /isPasswordVisible \? 'eye-off' : 'eye'/);
});

// Start Update 15 September 2026, by @WNP: Guard all profile and staff password fields that rely on the centralized form input.
test('profile and staff password fields use the reusable form input', () => {
    const profile = readFileSync(
        new URL('../../resources/js/Pages/Profile/Edit.jsx', import.meta.url),
        'utf8'
    );
    const staff = readFileSync(
        new URL('../../resources/js/Pages/Admin/Staff/Index.jsx', import.meta.url),
        'utf8'
    );

    assert.equal(profile.match(/type="password"/g)?.length, 4);
    assert.equal(staff.match(/type="password"/g)?.length, 2);
    assert.equal(profile.match(/<FormInput/g)?.length >= 4, true);
    assert.equal(staff.match(/<FormInput/g)?.length >= 2, true);
});
