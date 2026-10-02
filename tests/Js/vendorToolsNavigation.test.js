import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../../', import.meta.url));
let components;

before(async () => {
    const result = await build({
        stdin: {
            contents: `export { default as Navbar } from './resources/js/Components/Navbar.jsx';
                export { default as Footer } from './resources/js/Components/Footer.jsx';
                export { LanguageProvider } from './resources/js/Contexts/LanguageContext.jsx';
                export { setPage } from '@inertiajs/react';`,
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
                name: 'navigation-test-runtime',
                setup(builder) {
                    builder.onResolve({ filter: /^@inertiajs\/react$/ }, () => ({
                        path: 'inertia',
                        namespace: 'navigation-test',
                    }));
                    builder.onLoad({ filter: /.*/, namespace: 'navigation-test' }, () => ({
                        contents: `import { createElement } from 'react';
                            let page;
                            export const setPage = (value) => { page = value; };
                            export const usePage = () => page;
                            export const Link = ({ children, ...props }) => createElement('a', props, children);`,
                    }));
                    builder.onResolve({ filter: /^(react(?:\/.*)?|axios|sonner)$/ }, (args) => ({
                        path: import.meta.resolve(args.path),
                        external: true,
                    }));
                },
            },
        ],
    });
    components = await import(
        `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`
    );
});

function render(component, roles, language) {
    components.setPage({
        url: '/',
        props: { auth: { user: roles === null ? null : { id: 1 }, roles: roles ?? [] } },
    });
    const previousWindow = globalThis.window;
    globalThis.window = {
        localStorage: {
            getItem: (key) => (key === 'vms-theme' ? 'aurora' : JSON.stringify({ language })),
        },
    };
    try {
        return renderToStaticMarkup(
            createElement(components.LanguageProvider, null, createElement(component))
        );
    } finally {
        if (previousWindow === undefined) delete globalThis.window;
        else globalThis.window = previousWindow;
    }
}

for (const language of ['en', 'id']) {
    test(`vendor tools are hidden from guests and every non-vendor role (${language})`, () => {
        for (const roles of [
            null,
            [],
            ['super_admin'],
            ['ops_manager'],
            ['finance_manager'],
            ['custom_staff'],
        ]) {
            for (const component of [components.Navbar, components.Footer]) {
                const html = render(component, roles, language);
                assert.doesNotMatch(html, /Create Tools|Peralatan Vendor/);
                assert.doesNotMatch(html, /href="\/vendor\/onboarding"/);
            }
        }
        assert.match(render(components.Navbar, null, language), /href="\/register"/);
    });

    test(`vendor tools remain available to users with the vendor role (${language})`, () => {
        for (const roles of [['vendor'], ['super_admin', 'vendor']]) {
            assert.match(
                render(components.Navbar, roles, language),
                /Create Tools|Peralatan Vendor/
            );
            assert.match(render(components.Footer, roles, language), /href="\/vendor\/onboarding"/);
        }
    });
}
