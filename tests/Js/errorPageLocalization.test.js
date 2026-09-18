import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { translateMessage } from '../../resources/js/i18n/translations.js';

const errorPageSource = readFileSync(
    new URL('../../resources/js/Pages/Error.jsx', import.meta.url),
    'utf8'
);
const appSource = readFileSync(new URL('../../resources/js/app.jsx', import.meta.url), 'utf8');

// Start Update 16 September 2026, by @WNP: Verify every static HTTP error-page message has Indonesian coverage.
test('all shared HTTP error-page copy has Indonesian translations', () => {
    const messages = [
        'Access Denied',
        "You don't have permission to access this page.",
        'Page Not Found',
        "The page you're looking for doesn't exist or has been moved.",
        'Too Many Requests',
        'Please wait a moment before trying again.',
        'Server Error',
        'Something went wrong on our end. Please try again later.',
        'Service Unavailable',
        "We're temporarily offline for maintenance. Please check back soon.",
        'Go Back',
        'Go to Dashboard',
        'Or return to homepage',
    ];

    for (const message of messages) {
        assert.notEqual(translateMessage('id', message), message, message);
        assert.match(errorPageSource, new RegExp(escapeRegExp(message)));
    }
});

// Start Update 16 September 2026, by @WNP: Prevent the React runtime fallback from returning to hardcoded English copy.
test('global React error fallback routes all visible copy through the translator', () => {
    const messages = [
        'Something went wrong',
        'An unexpected error occurred. Please try refreshing the page.',
        'Refresh Page',
        'Go to Dashboard',
    ];

    assert.match(appSource, /function GlobalErrorFallback\(\)/);
    assert.match(appSource, /return <GlobalErrorFallback \/>/);

    for (const message of messages) {
        assert.notEqual(translateMessage('id', message), message, message);
        assert.match(appSource, new RegExp(`t\\('${escapeRegExp(message)}'\\)`));
    }
});

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
