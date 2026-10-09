import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import {
    DEFAULT_THEME,
    SUPPORTED_THEMES,
    getInitialTheme,
    persistTheme,
    normalizeTheme,
    applyTheme,
} from '../../resources/js/utils/themePreferences.js';

const blade = readFileSync(new URL('../../resources/views/app.blade.php', import.meta.url), 'utf8');
const bootstrap = blade.match(/<script>([\s\S]*?)<\/script>/)[1];
const documentError = readFileSync(
    new URL('../../resources/views/errors/document-not-found.blade.php', import.meta.url),
    'utf8'
);

test('standalone document errors initialize with the same theme policy', () => {
    assert.equal(documentError.match(/<script>([\s\S]*?)<\/script>/)[1], bootstrap);
});

function boot(stored, blocked = false) {
    const classes = new Set(['dark']);
    const document = {
        documentElement: {
            dataset: { theme: 'ocean' },
            classList: {
                toggle(name, enabled) {
                    if (enabled) classes.add(name);
                    else classes.delete(name);
                },
            },
        },
    };
    const preferences = JSON.stringify({
        language: 'id',
        density: 'compact',
        notifications: false,
    });
    const values = new Map([
        ['vms-theme', stored],
        ['vms.preferences.v1', preferences],
        ['other-setting', 'keep'],
    ]);
    const storage = {
        getItem(key) {
            assert.equal(key, 'vms-theme');
            if (blocked) throw new Error('Storage blocked');
            return values.get(key);
        },
        setItem(key, value) {
            assert.equal(key, 'vms-theme');
            if (blocked) throw new Error('Storage blocked');
            values.set(key, value);
        },
    };
    runInNewContext(bootstrap, { document, localStorage: storage });
    return { document, classes, values, preferences, window: { localStorage: storage } };
}

test('Ocean is the fallback before React and during initialization for absent/invalid preferences', () => {
    assert.equal(DEFAULT_THEME, 'ocean');
    assert.equal(getInitialTheme(null, null), 'ocean');
    assert.equal(
        getInitialTheme(
            { localStorage: { getItem: () => null } },
            { documentElement: { dataset: { theme: 'midnight' } } }
        ),
        'ocean'
    );
    for (const stored of [null, '', 'invalid', 'OCEAN', 'aurora', 'sunset']) {
        const browser = boot(stored);
        assert.equal(browser.document.documentElement.dataset.theme, 'ocean');
        assert.equal(getInitialTheme(browser.window, browser.document), 'ocean');
        assert.equal(browser.classes.has('dark'), false);
    }
});

test('every valid saved theme survives bootstrap, React initialization and reload', () => {
    for (const theme of SUPPORTED_THEMES) {
        for (let reload = 0; reload < 2; reload++) {
            const browser = boot(theme);
            assert.equal(browser.document.documentElement.dataset.theme, theme);
            assert.equal(getInitialTheme(browser.window, browser.document), theme);
            assert.equal(browser.classes.has('dark'), theme === 'midnight');
        }
    }
});

test('theme switching persists using the existing key and blocked storage does not throw', () => {
    let stored = null;
    const window = {
        localStorage: {
            setItem(key, value) {
                assert.equal(key, 'vms-theme');
                stored = value;
            },
            getItem: () => stored,
        },
    };
    for (const theme of SUPPORTED_THEMES) {
        persistTheme(theme, window);
        assert.equal(getInitialTheme(window), theme);
    }
    persistTheme('invalid', window);
    assert.equal(stored, 'ocean');
    const browser = boot('sunset', true);
    assert.equal(getInitialTheme(browser.window, browser.document), 'ocean');
    assert.doesNotThrow(() =>
        persistTheme('sunset', {
            get localStorage() {
                throw new Error('Storage blocked');
            },
        })
    );
    browser.document.documentElement.dataset.theme = 'sunset';
    assert.equal(getInitialTheme(browser.window, browser.document), 'ocean');
});

test('only Ocean and Midnight are supported; removed values normalize and apply safely', () => {
    assert.deepEqual(SUPPORTED_THEMES, ['ocean', 'midnight']);
    for (const theme of ['ocean', 'midnight', 'aurora', 'sunset', 'unknown', null]) {
        const expected = theme === 'midnight' ? 'midnight' : 'ocean';
        assert.equal(normalizeTheme(theme), expected);
        const browser = boot('midnight');
        assert.equal(applyTheme(theme, browser.document), expected);
        assert.equal(browser.document.documentElement.dataset.theme, expected);
        assert.equal(browser.classes.has('dark'), expected === 'midnight');
    }
});

test('legacy bootstrap and React storage normalization preserve every other preference', () => {
    for (const old of ['aurora', 'sunset', 'unknown']) {
        const browser = boot(old);
        assert.equal(browser.values.get('vms-theme'), 'ocean');
        assert.equal(browser.values.get('vms.preferences.v1'), browser.preferences);
        assert.equal(browser.values.get('other-setting'), 'keep');
        browser.values.set('vms-theme', old);
        assert.equal(getInitialTheme(browser.window, browser.document), 'ocean');
        assert.equal(browser.values.get('vms-theme'), 'ocean');
        assert.equal(browser.values.get('vms.preferences.v1'), browser.preferences);
        assert.equal(browser.values.get('other-setting'), 'keep');
        persistTheme(old, browser.window);
        assert.equal(browser.values.get('vms-theme'), 'ocean');
        assert.equal(browser.values.get('vms.preferences.v1'), browser.preferences);
        assert.equal(browser.values.get('other-setting'), 'keep');
    }
});
