import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';
import {
    getInitialLanguage,
    persistLanguage,
} from '../../resources/js/utils/languagePreferences.js';

function browser(value = null, cookie = '') {
    const values = new Map(value === null ? [] : [['vms.preferences.v1', value]]);
    const browserWindow = {
        localStorage: {
            getItem: (key) => values.get(key) ?? null,
            setItem: (key, nextValue) => values.set(key, nextValue),
        },
        navigator: { language: 'en-US' },
    };
    const browserDocument = { cookie };
    return { browserWindow, browserDocument, values };
}

test('first visit and server rendering default to Indonesian regardless of browser language', () => {
    const { browserWindow, browserDocument } = browser();
    assert.equal(getInitialLanguage(browserWindow, browserDocument), 'id');
    assert.equal(getInitialLanguage(null, null), 'id');
});

test('saved languages remain selected after reload with storage priority over the cookie', () => {
    for (const language of ['en', 'id']) {
        const { browserWindow, browserDocument } = browser(
            JSON.stringify({ language }),
            `vms_locale=${language === 'en' ? 'id' : 'en'}`
        );
        assert.equal(getInitialLanguage(browserWindow, browserDocument), language);
        persistLanguage(language, browserWindow, browserDocument);
        assert.equal(getInitialLanguage(browserWindow, browserDocument), language);
        const cookieOnly = browser(null, browserDocument.cookie);
        assert.equal(
            getInitialLanguage(cookieOnly.browserWindow, cookieOnly.browserDocument),
            language
        );
    }
});

test('invalid or malformed preferences fall back to valid cookies or Indonesian', () => {
    for (const value of ['{', 'null', '{}', '{"language":"xx"}', '{"language":123}']) {
        const { browserWindow, browserDocument } = browser(value, 'vms_locale=xx');
        assert.equal(getInitialLanguage(browserWindow, browserDocument), 'id');
        browserDocument.cookie = 'other=1; vms_locale=en';
        assert.equal(getInitialLanguage(browserWindow, browserDocument), 'en');
    }
});

test('unavailable and full localStorage do not prevent cookie persistence and switching', () => {
    for (const readFails of [true, false]) {
        const { browserWindow, browserDocument } = browser();
        if (readFails) {
            Object.defineProperty(browserWindow, 'localStorage', {
                get() {
                    throw new Error('Blocked storage');
                },
            });
        } else {
            browserWindow.localStorage.setItem = () => {
                throw new Error('Quota exceeded');
            };
        }
        assert.equal(getInitialLanguage(browserWindow, browserDocument), 'id');
        for (const language of ['en', 'id', 'en']) {
            assert.doesNotThrow(() => persistLanguage(language, browserWindow, browserDocument));
            assert.equal(getInitialLanguage(browserWindow, browserDocument), language);
        }
    }
});

test('ID/EN switching preserves other stored preferences and rejects unsupported languages', () => {
    const { browserWindow, browserDocument, values } = browser(
        '{"theme":"midnight","language":"en"}'
    );
    for (const language of ['id', 'en', 'id']) {
        persistLanguage(language, browserWindow, browserDocument);
        assert.deepEqual(JSON.parse(values.get('vms.preferences.v1')), {
            theme: 'midnight',
            language,
        });
        assert.equal(getInitialLanguage(browserWindow, browserDocument), language);
    }
    persistLanguage('xx', browserWindow, browserDocument);
    assert.equal(getInitialLanguage(browserWindow, browserDocument), 'id');
});

// Render the actual provider and language buttons without running browser effects.
test('language switcher marks ID on first render and respects saved English', async () => {
    const root = fileURLToPath(new URL('../../', import.meta.url));
    const result = await build({
        stdin: {
            contents: `export { LanguageProvider } from './resources/js/Contexts/LanguageContext.jsx';
                export { default as LanguageSwitcher } from './resources/js/Components/LanguageSwitcher.jsx';`,
            resolveDir: root,
        },
        bundle: true,
        write: false,
        format: 'esm',
        platform: 'node',
        jsx: 'automatic',
        alias: { '@': `${root}resources/js` },
        plugins: [
            {
                name: 'language-test-runtime',
                setup(builder) {
                    builder.onResolve({ filter: /^(react(?:\/.*)?|axios|sonner)$/ }, (args) => ({
                        path: import.meta.resolve(args.path),
                        external: true,
                    }));
                },
            },
        ],
    });
    const components = await import(
        `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`
    );
    const previousWindow = globalThis.window;
    const previousDocument = globalThis.document;
    try {
        for (const [value, expected] of [
            [null, 'ID'],
            ['{"language":"en"}', 'EN'],
            ['{"language":"id"}', 'ID'],
        ]) {
            const environment = browser(value);
            globalThis.window = environment.browserWindow;
            globalThis.document = environment.browserDocument;
            const html = renderToStaticMarkup(
                createElement(
                    components.LanguageProvider,
                    null,
                    createElement(components.LanguageSwitcher)
                )
            );
            assert.match(html, new RegExp(`aria-pressed="true"[^>]*>${expected}</button>`));
            assert.match(html, /type="button"/);
        }
    } finally {
        if (previousWindow === undefined) delete globalThis.window;
        else globalThis.window = previousWindow;
        if (previousDocument === undefined) delete globalThis.document;
        else globalThis.document = previousDocument;
    }
});
