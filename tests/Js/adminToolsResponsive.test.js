import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';
const root = fileURLToPath(new URL('../../', import.meta.url));
const paths = {
    Audit: 'Audit/Index',
    Messages: 'ContactMessages/Index',
    Message: 'ContactMessages/Show',
    Send: 'Notifications/Send',
    Health: 'SystemHealth/Index',
    Reports: 'Reports/Index',
    Summary: 'Reports/VendorSummaryReport',
    Performance: 'Reports/PerformanceReport',
    Compliance: 'Reports/ComplianceReport',
    Expiry: 'Reports/DocumentExpiryReport',
    Payment: 'Reports/PaymentReport',
};
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
const message = {
    id: 9,
    name: long,
    email: 'fixture@example.test',
    subject: long,
    message: long,
    status: 'new',
    admin_notes: long,
    created_at: '2026-10-01',
};
const links = [
    { label: 'Previous', url: null },
    ...Array.from({ length: 9 }, (_, i) => ({
        label: String(i + 1),
        url: '/fixture?page=' + i,
        active: i === 0,
    })),
    { label: 'Next', url: '/fixture?page=2' },
];
const list = {
    data: [
        {
            ...message,
            company_name: long,
            contact_person: long,
            vendor_number: long,
            performance_score: 75,
            compliance_score: 80,
            compliance_status: 'compliant',
            vendor: { company_name: long },
            document_type: { name: 'custom', display_name: long },
            file_name: long,
            expiry_date: '2026-10-09',
            invoice_number: long,
            amount: 100,
            job_name: long,
            error_message: long,
            status: 'active',
            user: { name: long },
            event: 'custom',
            auditable_type: long,
            reason: long,
        },
    ],
    links,
};
const props = {
    message,
    messages: list,
    logs: list,
    jobs: list,
    vendors: list,
    documents: list,
    payments: list,
    filters: {},
    stats: {
        top_scorer: long,
        total_active: 1,
        total_vendors: 1,
        avg_performance: 75,
        avg_score: 80,
        total_amount: 100,
    },
    staffUsers: [{ id: 2, name: long, email: 'fixture@example.test' }],
};
function render(name, language, options = {}) {
    runtime.setPage({
        url: '/admin/fixture',
        props: {
            ...props,
            auth: {
                user: { name: 'Fixture' },
                roles: ['super_admin'],
                can: {
                    'reports.export': true,
                    'vendors.view': true,
                    'compliance.view': true,
                    'documents.view': true,
                    'audit.view': true,
                    'payments.view': true,
                },
            },
            features: { payments: { enabled: !!options.payments } },
            errors: options.errors || {},
            fixtureProcessing: !!options.pending,
            fixtureFormData: options.data || {},
        },
    });
    globalThis.fixtureModal = options.modal;
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
                createElement(runtime[name], { ...props, ...options.props })
            )
        );
    } finally {
        if (old === undefined) delete globalThis.window;
        else globalThis.window = old;
    }
}
for (const language of ['id', 'en']) {
    test('all administrative tools render long content and preserve pagination ' + language, () => {
        for (const name of Object.keys(paths)) {
            const html = render(name, language);
            assert.ok(html.includes('min-w-0'));
            assert.ok(!html.includes(' required=""'));
            if (
                [
                    'Audit',
                    'Messages',
                    'Summary',
                    'Performance',
                    'Compliance',
                    'Expiry',
                    'Payment',
                    'Health',
                ].includes(name)
            ) {
                assert.ok(html.includes(long));
                assert.ok(html.includes('min-w-[760px]'));
            }
        }
    });
    test('message status and notes have associated unique errors and pending ' + language, () => {
        const html = render('Message', language, {
            errors: { status: 'Fixture status error', admin_notes: 'Fixture notes error' },
            pending: true,
            modal: true,
        });
        for (const value of ['Fixture status error', 'Fixture notes error'])
            assert.equal(html.split(value).length - 1, 1);
        assert.ok(html.includes('for="message-status"'));
        assert.ok(html.includes('aria-describedby="message-status-error"'));
        assert.ok(html.includes('for="message-notes"'));
        assert.ok(html.includes('aria-describedby="message-notes-error"'));
        assert.ok(html.includes('noValidate=""'));
        assert.ok(html.includes('disabled=""'));
        assert.ok(html.includes('max-h-[calc(100vh-2rem)]'));
        assert.ok(html.includes('mailto:fixture@example.test'));
    });
    test('notification errors, manual recipients and payment report gating ' + language, () => {
        const html = render('Send', language, {
            data: { target: 'specific_user', target_id: 2 },
            errors: { title: 'Fixture title error', target_id: 'Fixture recipient error' },
            pending: true,
        });
        assert.equal(html.split('Fixture title error').length - 1, 1);
        assert.equal(html.split('Fixture recipient error').length - 1, 1);
        assert.ok(html.includes(long));
        assert.ok(html.includes('aria-invalid="true"'));
        assert.ok(html.includes('disabled=""'));
        assert.ok(!render('Reports', language).includes('href="/admin/reports/payment"'));
        assert.ok(
            render('Reports', language, { payments: true }).includes(
                'href="/admin/reports/payment"'
            )
        );
    });
    test('empty lists remain usable ' + language, () => {
        for (const name of [
            'Audit',
            'Messages',
            'Health',
            'Summary',
            'Performance',
            'Compliance',
            'Expiry',
            'Payment',
        ])
            assert.ok(
                render(name, language, {
                    props: {
                        logs: {},
                        messages: {},
                        jobs: {},
                        vendors: {},
                        documents: {},
                        payments: {},
                    },
                }).includes('min-w-0')
            );
    });
}
