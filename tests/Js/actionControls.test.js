import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
                export { Button, LinkButton, IconButton } from './resources/js/Components/index.jsx';
                export { FormButton } from './resources/js/Components/FormInputs.jsx';
                export { ModalPrimaryButton } from './resources/js/Components/Modal.jsx';
                export { default as ThemeSwitcher } from './resources/js/Components/ThemeSwitcher.jsx';
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
                    builder.onLoad({ filter: /\/ThemeSwitcher\.jsx$/ }, async ({ path }) => ({
                        contents: (await readFile(path, 'utf8')).replace(
                            'useState(false)',
                            'useState(window.__testOpenThemeMenu || false)'
                        ),
                        loader: 'jsx',
                    }));
                    builder.onResolve(
                        { filter: /^(react(?:-dom)?(?:\/.*)?|@inertiajs\/react|axios|sonner)$/ },
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

function render(component, props, language = 'en', theme = 'invalid', isOpen = false) {
    const previousWindow = globalThis.window;
    globalThis.window = {
        location: new URL('http://vms.test'),
        __testOpenThemeMenu: isOpen,
        localStorage: {
            getItem: (key) => (key === 'vms-theme' ? theme : JSON.stringify({ language })),
        },
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

test('primary buttons and action links share the theme gradient while semantic variants remain distinct', () => {
    for (const component of [controls.ActionButton, controls.ActionLink, controls.ActionAnchor]) {
        assert.match(
            render(component, { variant: 'primary', href: '/test', children: 'View' }),
            /theme-primary-action/
        );
        for (const variant of ['danger', 'success', 'warning', 'outline', 'ghost']) {
            const html = render(component, { variant, href: '/test', children: 'View' });
            assert.doesNotMatch(html, /theme-primary-action/);
            if (['danger', 'success', 'warning'].includes(variant)) {
                assert.ok(html.includes(`--color-${variant}`));
            }
        }
    }
});

test('shared primary controls keep labels, icons, disabled and loading behavior', () => {
    for (const component of [controls.Button, controls.FormButton, controls.ModalPrimaryButton]) {
        const html = render(
            component,
            { disabled: true, children: component === controls.FormButton ? 'Simpan' : 'Save' },
            'id'
        );
        assert.match(html, /theme-primary-action/);
        assert.match(html, /disabled=""/);
        assert.match(html, />Simpan<\/button>$/);
        assert.doesNotMatch(
            render(component, { variant: 'danger', children: 'Delete' }),
            /theme-primary-action/
        );
    }
    assert.match(render(controls.FormButton, { loading: true, children: 'Save' }), /disabled=""/);
    assert.match(
        render(controls.FormButton, { loading: true, children: 'Save' }),
        /stroke="currentColor"/
    );
    assert.match(
        render(controls.IconButton, { variant: 'primary', icon: 'success', title: 'Save' }),
        /theme-primary-action/
    );
    assert.match(
        render(controls.LinkButton, { href: '/dashboard', children: 'View' }),
        /theme-primary-action/
    );
});

test('theme selector displays Ocean for invalid preferences in both locales', () => {
    for (const locale of ['en', 'id']) {
        const html = render(controls.ThemeSwitcher, {}, locale);
        assert.match(html, />Ocean<\/span>/);
        assert.match(html, /aria-expanded="false"/);
    }
});

test('theme menu exposes exactly two accessible choices in both locales and preserves valid selections', () => {
    for (const locale of ['en', 'id']) {
        for (const theme of ['ocean', 'midnight', 'aurora', 'sunset', 'unknown']) {
            const html = render(controls.ThemeSwitcher, {}, locale, theme, true);
            assert.equal((html.match(/role="menuitemradio"/g) || []).length, 2);
            assert.equal((html.match(/aria-checked="true"/g) || []).length, 1);
            assert.doesNotMatch(html, /Aurora|Sunset/);
            assert.ok(html.includes(`>${theme === 'midnight' ? 'Midnight' : 'Ocean'}</span>`));
            assert.ok(html.includes(locale === 'id' ? 'Nuansa biru sejuk' : 'Cool blue tones'));
        }
    }
});
