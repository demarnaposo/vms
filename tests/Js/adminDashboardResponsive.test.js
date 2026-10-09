import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';
const root = fileURLToPath(new URL('../../', import.meta.url));
const paths = { Dashboard: 'Dashboard' };
const pages = Object.keys(paths);
let runtime;
before(async () => {
    const result = await build({
        stdin: {
            contents:
                pages
                    .map(
                        (p) =>
                            `export { default as ${p} } from './resources/js/Pages/Admin/${paths[p]}.jsx';`
                    )
                    .join('\n') +
                `export { LanguageProvider } from './resources/js/Contexts/LanguageContext.jsx'; export { setPage, getFormData } from '@inertiajs/react';`,
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
                name: 'vendor-fixtures',
                setup(builder) {
                    builder.onLoad(
                        { filter: /\/ContactMessages\/Show\.jsx$/ },
                        async ({ path }) => {
                            let contents = await readFile(path, 'utf8');
                            contents = contents.replace(
                                'useState(false)',
                                'useState(globalThis.fixtureModal || false)'
                            );
                            return { contents, loader: 'jsx' };
                        }
                    );
                    builder.onResolve({ filter: /^@inertiajs\/react$/ }, () => ({
                        path: 'inertia',
                        namespace: 'fixture',
                    }));
                    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
                        contents: `import { createElement } from 'react'; let page, data; export const setPage = value => page = value; export const getFormData = () => data; export const usePage = () => page; export const Head = () => null; export const router = {}; export const Link = ({ children, preserveScroll: _scroll, ...props }) => createElement('a', props, children); export const useForm = initial => { data = { ...initial, ...page.props.fixtureFormData }; return { data, errors: page.props.errors, processing: page.props.fixtureProcessing, setData() {} }; };`,
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

const long = 'ManualFixture' + 'x'.repeat(180);
const allCan = {
    'vendors.view': true,
    approve_vendors: true,
    verify_documents: true,
    approve_payments: true,
    run_compliance: true,
};
const stats = {
    total_vendors: 123456789012345,
    active_vendors: 123456789012345,
    pending_review: 123456789012345,
    non_compliant: 123456789012345,
    pending_payments: 123456789012345,
    approved_payments: 123456789012345,
};
const props = {
    stats,
    pendingVendors: [{ id: 9, company_name: long, contact_person: long }],
    pendingDocuments: [
        {
            id: 3,
            vendor_name: long,
            document_type: { name: 'custom', display_name: long },
            uploaded_at: '2026-10-01',
        },
    ],
    pendingPayments: [
        { id: 4, vendor_name: long, amount: 123456789012345, status: 'pending_finance' },
    ],
};
function render(language, options = {}) {
    runtime.setPage({
        url: '/admin/dashboard',
        props: {
            auth: {
                user: { name: long },
                roles: [options.finance ? 'finance_manager' : 'super_admin'],
                can: options.can || allCan,
            },
            features: { payments: { enabled: !!options.payments } },
            errors: {},
        },
    });
    const old = globalThis.window;
    globalThis.window = {
        location: new URL('http://fixture.test'),
        localStorage: { getItem: () => JSON.stringify({ language }) },
    };
    try {
        return renderToStaticMarkup(
            createElement(
                runtime.LanguageProvider,
                null,
                createElement(runtime.Dashboard, { ...props, ...options.props })
            )
        );
    } finally {
        if (old === undefined) delete globalThis.window;
        else globalThis.window = old;
    }
}
for (const language of ['id', 'en']) {
    test('dashboard retains manual content, large statistics and navigation ' + language, () => {
        const html = render(language);
        assert.ok(html.includes(long));
        assert.ok(html.includes('123456789012345'));
        for (const url of [
            '/admin/vendors',
            '/admin/vendors?status=submitted',
            '/admin/vendors/9',
            '/admin/documents',
            '/admin/compliance',
            '/notifications',
        ])
            assert.ok(html.includes('href="' + url + '"'));
        assert.ok(html.includes('min-h-9'));
        assert.ok(!html.includes('href="/admin/payments'));
    });
    test('payment flag and finance queue visibility ' + language, () => {
        const can = { approve_payments: true };
        assert.ok(!render(language, { can, finance: true }).includes('href="/admin/payments'));
        const html = render(language, { can, finance: true, payments: true });
        assert.ok(html.includes('href="/admin/payments/4"'));
        assert.ok(html.includes('href="/admin/payments?status=pending_finance"'));
        assert.ok(html.includes('href="/admin/payments"'));
        assert.ok(html.includes(long));
        assert.ok(!html.includes('href="/admin/vendors/9"'));
    });
    test(
        'permission variations preserve restricted actions and available statistics ' + language,
        () => {
            for (const can of [
                {},
                { verify_documents: true },
                { approve_vendors: true },
                { run_compliance: true },
            ]) {
                const html = render(language, { can, props: { stats: { active_vendors: 10 } } });
                assert.equal(html.includes('href="/admin/vendors/9"'), !!can.approve_vendors);
                assert.equal(html.includes('href="/admin/documents"'), !!can.verify_documents);
                assert.equal(html.includes('href="/admin/compliance"'), !!can.run_compliance);
                assert.ok(html.includes('href="/notifications"'));
                assert.ok(!html.includes('123456789012345'));
            }
        }
    );
    test('empty queues and omitted stats render safely ' + language, () => {
        const html = render(language, {
            props: { stats: {}, pendingVendors: [], pendingDocuments: [], pendingPayments: [] },
        });
        assert.ok(
            html.includes(
                language === 'id' ? 'Tidak ada pengajuan tertunda' : 'No pending applications'
            )
        );
        assert.ok(
            html.includes(
                language === 'id' ? 'Semua dokumen telah diverifikasi' : 'All documents verified'
            )
        );
        assert.ok(html.includes('href="/notifications"'));
    });
}
