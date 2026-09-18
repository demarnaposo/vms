import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { translateMessage } from '../../resources/js/i18n/translations.js';

const errorPage = readFileSync(
    new URL('../../resources/js/Pages/Error.jsx', import.meta.url),
    'utf8'
);
const serviceProvider = readFileSync(
    new URL('../../app/Providers/AppServiceProvider.php', import.meta.url),
    'utf8'
);

// Start Update 16 September 2026, by @WNP: Keep throttled sensitive actions on the current page with feedback.
test('sensitive-action throttling redirects back with a visible error', () => {
    assert.match(serviceProvider, /->with\('error', __\('alerts\.too_many_requests'\)\)/);
    assert.match(serviceProvider, /->withHeaders\(\$headers\)/);
});

// Start Update 16 September 2026, by @WNP: Ensure generic rate limits never use the not-found message.
test('the error page represents HTTP 429 accurately in both languages', () => {
    assert.match(errorPage, /429:\s*\{/);
    assert.match(errorPage, /title: 'Too Many Requests'/);
    assert.equal(translateMessage('id', 'Too Many Requests'), 'Terlalu Banyak Permintaan');
    assert.equal(
        translateMessage('id', 'Please wait a moment before trying again.'),
        'Tunggu sebentar sebelum mencoba kembali.'
    );
});
