import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../../', import.meta.url));
let runtime;

before(async () => {
    const result = await build({
        stdin: {
            contents: `export { default as Rules } from './resources/js/Pages/Admin/Compliance/Rules.jsx';
                export { default as Dashboard } from './resources/js/Pages/Admin/Compliance/Dashboard.jsx';
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
                name: 'compliance-page-runtime',
                setup(builder) {
                    builder.onResolve({ filter: /^@inertiajs\/react$/ }, () => ({
                        path: 'inertia',
                        namespace: 'compliance-test',
                    }));
                    builder.onLoad({ filter: /.*/, namespace: 'compliance-test' }, () => ({
                        contents: `import { createElement } from 'react';
                            let page;
                            export const setPage = (value) => { page = value; };
                            export const usePage = () => page;
                            export const Head = () => null;
                            export const router = { patch() {} };
                            export const Link = ({ children, ...props }) => createElement('a', props, children);`,
                    }));
                    builder.onResolve(
                        { filter: /^(react(?:-dom)?(?:\/.*)?|axios|sonner)$/ },
                        (args) => ({ path: import.meta.resolve(args.path), external: true })
                    );
                },
            },
        ],
    });
    runtime = await import(
        `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`
    );
});

function render(enabled, language, canEdit = true, errors = {}, dashboard = false) {
    runtime.setPage({
        url: dashboard ? '/admin/compliance' : '/admin/compliance/rules',
        props: {
            auth: {
                user: { name: 'Test Admin' },
                roles: ['super_admin'],
                can: { edit_rules: canEdit },
            },
            features: { payments: { enabled } },
            errors,
        },
    });
    const previousWindow = globalThis.window;
    globalThis.window = {
        location: new URL('http://vms.test'),
        localStorage: { getItem: () => JSON.stringify({ language }) },
    };
    try {
        return renderToStaticMarkup(
            createElement(
                runtime.LanguageProvider,
                null,
                createElement(dashboard ? runtime.Dashboard : runtime.Rules, {
                    stats: {},
                    atRiskVendors: [],
                    recentResults: [],
                    rules: [
                        {
                            id: 1,
                            name: 'Custom Rule',
                            blocks_payment: true,
                            penalty_points: 5,
                            is_active: true,
                        },
                        ...(dashboard
                            ? [
                                  {
                                      id: 2,
                                      name: 'Second Rule',
                                      blocks_payment: false,
                                      penalty_points: 10,
                                      is_active: true,
                                  },
                              ]
                            : []),
                    ],
                })
            )
        );
    } finally {
        if (previousWindow === undefined) delete globalThis.window;
        else globalThis.window = previousWindow;
    }
}

for (const language of ['en', 'id']) {
    test(`dashboard payment column follows flag with aligned headers and cells (${language})`, () => {
        const label = language === 'id' ? 'Memblokir Pembayaran' : 'Blocks Payment';
        for (const enabled of [false, true]) {
            const html = render(enabled, language, true, {}, true);
            const table = html.match(/<table\b[^>]*>[\s\S]*?<\/table>/)?.[0];
            assert.ok(table);
            assert.equal(table.includes(label), enabled);
            assert.equal((table.match(/<th\b/g) || []).length, enabled ? 5 : 4);
            const rows = table.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/g).slice(1);
            assert.equal(rows.length, 2);
            for (const row of rows) {
                assert.equal((row.match(/<td\b/g) || []).length, enabled ? 5 : 4);
            }
            assert.ok(table.includes('Custom Rule'));
            assert.ok(table.includes('Second Rule'));
            if (enabled) {
                assert.ok(rows[0].includes(language === 'id' ? 'Ya' : 'Yes'));
                assert.ok(rows[1].includes(language === 'id' ? 'Tidak' : 'No'));
            }
        }
    });

    test(`payment control follows flag while other controls and stored value remain available (${language})`, () => {
        const label = language === 'id' ? 'Memblokir Pembayaran' : 'Blocks Payments';
        const activation = language === 'id' ? 'Memblokir Aktivasi' : 'Blocks Activation';
        const disabled = render(false, language);
        assert.ok(!disabled.includes(label));
        assert.ok(disabled.includes(activation));
        assert.ok(disabled.includes('md:grid-cols-2'));
        const enabled = render(true, language);
        assert.ok(enabled.includes(label));
        assert.ok(enabled.includes('md:grid-cols-3'));
        assert.match(enabled, new RegExp(`aria-label="${label}"[^>]*checked=""`));
        assert.match(
            render(true, language, false),
            new RegExp(`disabled="" aria-label="${label}"`)
        );
    });
}

test('payment validation outcome is displayed once with either flag value', () => {
    for (const enabled of [true, false]) {
        const html = render(enabled, 'en', true, { blocks_payment: 'Payment setting unavailable' });
        assert.equal(html.split('Payment setting unavailable').length - 1, 1);
        assert.match(html, /role="alert"/);
    }
});
