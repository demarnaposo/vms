import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../../', import.meta.url));
let controls;

before(async () => {
    const result = await build({
        stdin: {
            contents: `export * from './resources/js/Components/ActionControls.jsx';
                export { LanguageProvider } from './resources/js/Contexts/LanguageContext.jsx';`,
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
                name: 'existing-runtime-packages',
                setup(builder) {
                    builder.onResolve(
                        { filter: /^(react(?:\/.*)?|@inertiajs\/react|axios|sonner)$/ },
                        (args) => ({
                            path: import.meta.resolve(args.path),
                            external: true,
                        })
                    );
                },
            },
        ],
    });
    controls = await import(
        `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`
    );
});

function render(component, props, language = 'en') {
    const previousWindow = globalThis.window;
    globalThis.window = {
        location: new URL('http://vms.test'),
        localStorage: { getItem: () => JSON.stringify({ language }) },
    };
    try {
        return renderToStaticMarkup(
            createElement(controls.LanguageProvider, null, createElement(component, props))
        );
    } finally {
        if (previousWindow === undefined) delete globalThis.window;
        else globalThis.window = previousWindow;
    }
}

test('action buttons preserve native disabled, explicit type and accessible names', () => {
    const html = render(controls.ActionButton, {
        type: 'submit',
        disabled: true,
        'aria-label': 'Delete role',
        title: 'Role is in use',
        children: 'Delete',
    });
    assert.match(html, /^<button /);
    assert.match(html, /type="submit"/);
    assert.match(html, /disabled=""/);
    assert.match(html, /aria-label="Delete role"/);
    assert.match(html, /title="Role is in use"/);
    assert.doesNotMatch(html, /<a\b/);
    assert.match(render(controls.ActionButton, { children: 'View' }), /type="button"/);
});

test('action navigation renders a single anchor preserving URL, query and target', () => {
    const html = render(controls.ActionLink, {
        href: '/admin/vendors/42?status=active',
        target: '_blank',
        rel: 'noreferrer',
        children: 'View',
    });
    assert.match(html, /^<a /);
    assert.match(html, /href="\/admin\/vendors\/42\?status=active"/);
    assert.match(html, /target="_blank"/);
    assert.match(html, /rel="noreferrer"/);
    assert.doesNotMatch(html, /<button\b/);
});

test('download actions retain native download attributes and custom labels verbatim', () => {
    const html = render(
        controls.ActionAnchor,
        {
            href: '/documents/42/download',
            download: 'original.pdf',
            target: '_blank',
            children: 'View',
        },
        'id'
    );
    assert.match(html, /download="original.pdf"/);
    assert.match(html, /target="_blank"/);
    assert.match(html, />View<\/a>$/);
    assert.doesNotMatch(html, /<button\b/);
});

test('action button source labels follow both locales while icon children remain intact', () => {
    assert.match(render(controls.ActionButton, { children: 'View' }, 'id'), />Lihat<\/button>$/);
    assert.match(render(controls.ActionButton, { children: 'View' }), />View<\/button>$/);
    const icon = createElement('svg', { 'aria-hidden': true });
    assert.match(
        render(controls.ActionButton, { children: icon, 'aria-label': 'View' }),
        /<svg aria-hidden="true"><\/svg>/
    );
});
