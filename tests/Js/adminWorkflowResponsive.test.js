import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';
const root = fileURLToPath(new URL('../../', import.meta.url));
let runtime;
before(async () => {
    const result = await build({
        stdin: {
            contents: `export { default as Documents } from './resources/js/Pages/Admin/Documents/Index.jsx';
export { default as Dashboard } from './resources/js/Pages/Admin/Compliance/Dashboard.jsx';
export { default as Rules } from './resources/js/Pages/Admin/Compliance/Rules.jsx';
export { default as Detail } from './resources/js/Pages/Admin/Compliance/VendorDetail.jsx';
export { default as Performance } from './resources/js/Pages/Admin/Performance/Index.jsx';
export { default as Show } from './resources/js/Pages/Admin/Performance/Show.jsx';
export { default as Rate } from './resources/js/Pages/Admin/Performance/Rate.jsx';
                
                export { LanguageProvider } from './resources/js/Contexts/LanguageContext.jsx';
                export { setPage, getFormData } from '@inertiajs/react';`,
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
                name: 'staff-form-runtime',
                setup(builder) {
                    builder.onLoad(
                        { filter: /\/(Documents\/Index|Compliance\/Dashboard)\.jsx$/ },
                        async ({ path }) => ({
                            contents: (await readFile(path, 'utf8')).replace(
                                'useState(false)',
                                'useState(usePage().props.testModal || false)'
                            ),
                            loader: 'jsx',
                        })
                    );
                    builder.onResolve({ filter: /^@inertiajs\/react$/ }, () => ({
                        path: 'inertia',
                        namespace: 'staff-test',
                    }));
                    builder.onLoad({ filter: /.*/, namespace: 'staff-test' }, () => ({
                        contents: `import { createElement } from 'react';
                        let page, data;
                        export const setPage = (value) => { page = value; };
                        export const getFormData = () => data;
                        export const usePage = () => page;
                        export const Head = () => null;
                        export const router = {};
                        export const Link = ({ children, preserveScroll: _preserveScroll, ...props }) => createElement('a', props, children);
                        export const useForm = (initial) => { data = initial; return { data, errors: page.props.errors, processing: page.props.testProcessing || false, setData() {} }; };`,
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

const long = 'FixtureManual' + 'x'.repeat(180);
const vendor = {
    id: 9,
    company_name: long,
    status: 'active',
    performance_score: 75,
    compliance_score: 80,
    compliance_status: 'at_risk',
};
const metric = {
    id: 4,
    name: 'custom_metric',
    display_name: long,
    description: long,
    weight: 25,
    max_score: 100,
};
const rule = {
    id: 5,
    name: 'custom_rule',
    display_name: long,
    description: long,
    type: 'document',
    severity: 'high',
    penalty_points: 10,
    is_active: true,
    blocks_payment: true,
    blocks_activation: true,
};
function render(name, language, props = {}, options = {}) {
    runtime.setPage({
        url: '/admin/' + name.toLowerCase(),
        props: {
            auth: { user: { name: 'Fixture' }, roles: ['super_admin'], can: options.can || {} },
            features: { payments: { enabled: options.payments || false } },
            errors: options.errors || {},
            testModal: options.modal || false,
            testProcessing: options.processing || false,
        },
    });
    const previous = globalThis.window;
    globalThis.window = {
        location: new URL('http://vms.test'),
        localStorage: { getItem: () => JSON.stringify({ language }) },
    };
    try {
        return renderToStaticMarkup(
            createElement(runtime.LanguageProvider, null, createElement(runtime[name], props))
        );
    } finally {
        if (previous === undefined) delete globalThis.window;
        else globalThis.window = previous;
    }
}
for (const language of ['id', 'en']) {
    test('document permissions, query links and rejection dialog (' + language + ')', () => {
        const props = {
            currentStatus: 'all',
            filters: { search: 'fixture', document_type_id: 4 },
            documents: {
                data: [
                    {
                        id: 3,
                        vendor,
                        document_type: { name: 'custom', display_name: long },
                        file_name: long + '.pdf',
                        verification_status: 'pending',
                        is_current: true,
                        created_at: '2026-10-01',
                    },
                ],
            },
        };
        const readOnly = render('Documents', language, props);
        assert.ok(readOnly.includes(long));
        assert.ok(readOnly.includes('status=verified&amp;search=fixture&amp;document_type_id=4'));
        assert.ok(
            !readOnly.includes('>' + (language === 'id' ? 'Verifikasi' : 'Verify') + '</button>')
        );
        const editable = render('Documents', language, props, {
            can: { verify_documents: true, reject_documents: true },
            modal: true,
            errors: { reason: 'Fixture reason error' },
        });
        assert.ok(
            editable.includes('>' + (language === 'id' ? 'Verifikasi' : 'Verify') + '</button>')
        );
        assert.equal(editable.split('Fixture reason error').length - 1, 1);
        assert.match(editable, /aria-invalid="true" aria-describedby="[^"]+-error"/);
        assert.ok(!editable.includes(' required=""'));
        assert.match(editable, /text-\(--color-danger\)">\*<\/span>/);
        assert.ok(editable.includes('role="dialog"'));
        assert.ok(editable.includes('max-h-[calc(100vh-2rem)]'));
    });
    test('payment flag and rule authorization remain intact (' + language + ')', () => {
        const paymentLabel = language === 'id' ? 'Memblokir Pembayaran' : 'Blocks Payments';
        const hidden = render('Rules', language, { rules: [rule] });
        assert.ok(hidden.includes(long));
        assert.ok(!hidden.includes(paymentLabel));
        assert.match(hidden, /aria-pressed="true" disabled=""/);
        const enabled = render(
            'Rules',
            language,
            { rules: [rule] },
            { payments: true, can: { edit_rules: true } }
        );
        assert.ok(enabled.includes(paymentLabel));
        assert.match(enabled, /for="rule-5-penalty"/);
        assert.ok(!enabled.includes('aria-pressed="true" disabled=""'));
        const dashboard = render(
            'Dashboard',
            language,
            {
                atRiskVendors: [vendor],
                recentResults: [{ id: 1, vendor, rule, details: long }],
                rules: [rule],
            },
            { modal: true, can: { run_compliance: true } }
        );
        assert.ok(dashboard.includes('role="dialog"'));
        assert.ok(dashboard.includes('flex-col-reverse'));
        assert.ok(dashboard.includes('href="/admin/compliance/rules"'));
        assert.ok(
            !dashboard.includes(language === 'id' ? 'MEMBLOKIR PEMBAYARAN' : 'BLOCKS PAYMENT')
        );
        const detail = render('Detail', language, {
            vendor,
            results: [{ id: 1, rule, details: long, status: 'fail', evaluated_at: '2026-10-01' }],
        });
        assert.ok(detail.includes('href="/admin/compliance"'));
        assert.ok(!/<a[^>]*>\s*<button/.test(detail));
        assert.ok(detail.includes('role="region"'));
    });
    test(
        'dynamic metrics, history and navigation survive layout changes (' + language + ')',
        () => {
            const index = render('Performance', language, {
                metrics: [metric],
                vendors: [vendor],
                topPerformers: [vendor],
                lowPerformers: [vendor],
            });
            assert.ok(index.includes(long));
            assert.ok(index.includes('sm:grid-cols-2 xl:grid-cols-4'));
            assert.ok(index.includes('href="/admin/performance/9/rate"'));
            assert.ok(!/<a[^>]*>\s*<button/.test(index));
            const show = render('Show', language, {
                vendor,
                breakdown: [
                    {
                        metric,
                        metric_name: long,
                        current_score: 75,
                        max_score: 100,
                        weight: 25,
                        average_score: 70,
                        score_count: 2,
                    },
                ],
                history: [{ month: '2026-10', average: 75, scores: [metric] }],
            });
            assert.ok(show.includes('2026-10'));
            assert.ok(show.includes('75/100'));
            assert.ok(show.includes(long));
            assert.ok(show.includes('href="/admin/performance"'));
        }
    );
    test('rating errors, pending state and empty metrics (' + language + ')', () => {
        const errors = {
            period_end: 'Fixture date error',
            'ratings.0.score': 'Fixture score error',
            'ratings.0.notes': 'Fixture notes error',
        };
        const html = render(
            'Rate',
            language,
            { vendor, metrics: [metric] },
            { errors, processing: true }
        );
        for (const message of Object.values(errors))
            assert.equal(html.split(message).length - 1, 1);
        assert.match(html, /novalidate=""/i);
        assert.ok(!html.includes(' required=""'));
        assert.ok(html.includes('aria-describedby="rating-4-errors"'));
        assert.ok(html.includes('href="/admin/performance"'));
        assert.match(html, /<button(?=[^>]*disabled="")(?=[^>]*type="submit")[^>]*>/);
        assert.deepEqual(
            runtime.getFormData().ratings.map((item) => item.metric_id),
            [4]
        );
        assert.ok(render('Rate', language, { vendor, metrics: [] }).includes('disabled=""'));
    });
    test('all seven pages render empty data safely (' + language + ')', () => {
        for (const name of [
            'Documents',
            'Dashboard',
            'Rules',
            'Detail',
            'Performance',
            'Show',
            'Rate',
        ]) {
            const html = render(name, language, { vendor, documents: { data: [] }, results: [] });
            assert.ok(html.length > 0);
            assert.ok(!html.includes('undefined'));
        }
    });
}
