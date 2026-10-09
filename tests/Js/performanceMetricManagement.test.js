import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';
import { translateSystemMasterDataField } from '../../resources/js/i18n/systemMasterData.js';
const root = fileURLToPath(new URL('../../', import.meta.url));
let runtime;
before(async () => {
    const result = await build({
        stdin: {
            contents: `export { default as Metrics } from './resources/js/Pages/Admin/PerformanceMetrics/Index.jsx';
                export { default as Rate } from './resources/js/Pages/Admin/Performance/Rate.jsx';
                export { default as Vendor } from './resources/js/Pages/Vendor/Performance.jsx';
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
                        { filter: /Pages\/Admin\/PerformanceMetrics\/Index\.jsx$/ },
                        async (args) => ({
                            contents: (await readFile(args.path, 'utf8')).replace(
                                'useState(false)',
                                'useState(true)'
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
                        export const Link = ({ children, ...props }) => createElement('a', props, children);
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

const metric = {
    id: 1,
    name: 'custom_quality',
    display_name: 'Manual Label',
    description: 'Manual description',
    weight: '3.50',
    max_score: 4,
    is_active: true,
    scores_count: 2,
    protected: false,
};
function render(language, component, props, errors = {}, processing = false) {
    runtime.setPage({
        url: '/admin/performance-metrics',
        props: {
            auth: { user: { name: 'Admin' }, roles: ['super_admin'], can: {} },
            errors,
            testProcessing: processing,
        },
    });
    const previous = globalThis.window;
    globalThis.window = {
        location: new URL('http://vms.test'),
        localStorage: { getItem: () => JSON.stringify({ language }) },
    };
    try {
        return renderToStaticMarkup(
            createElement(runtime.LanguageProvider, null, createElement(runtime[component], props))
        );
    } finally {
        if (previous === undefined) delete globalThis.window;
        else globalThis.window = previous;
    }
}
for (const language of ['id', 'en']) {
    test(`metric catalogue and empty states are bilingual and preserve custom content (${language})`, () => {
        const html = render(language, 'Metrics', {
            metrics: { data: [metric], links: [] },
            configuration: [metric],
        });
        assert.ok(html.includes(language === 'id' ? 'Metrik Kinerja' : 'Performance Metrics'));
        assert.ok(html.includes('Manual Label'));
        assert.ok(html.includes('Manual description'));
        assert.ok(html.includes('custom_quality'));
        assert.match(html, /<form[^>]*noValidate=""/);
        assert.ok(!html.includes('required=""'));
        assert.match(html, /disabled=""[^>]*>.*?(?:Delete|Hapus)/s);
        const empty = render(language, 'Metrics', { metrics: { data: [], links: [] } });
        assert.ok(
            empty.includes(
                language === 'id'
                    ? 'Tidak ada metrik kinerja ditemukan.'
                    : 'No performance metrics found.'
            )
        );
        assert.match(
            render(language, 'Metrics', { metrics: { data: [], links: [] } }, {}, true),
            /disabled=""/
        );
    });
    test(`metric errors appear once and rating fields expose nested errors (${language})`, () => {
        const rate = render(
            language,
            'Rate',
            { vendor: { id: 2, company_name: 'Fixture' }, metrics: [metric] },
            { 'ratings.0.score': 'Invalid score', period_end: 'Invalid period' }
        );
        for (const message of ['Invalid score', 'Invalid period'])
            assert.equal(rate.split(message).length - 1, 1);
        assert.ok(rate.includes('Manual Label'));
        assert.equal(runtime.getFormData().ratings[0].score, 3);
        assert.ok(rate.includes('3/4'));
        assert.match(rate, /type="range"[^>]*min="1"[^>]*max="4"[^>]*step="1"/);
        assert.ok(!rate.includes(language === 'id' ? '>Belum dipilih<' : '>Not selected<'));
        assert.ok(!rate.includes('role="combobox"'));
        assert.ok(!rate.includes('0/4'));
        const zeroScore = render(language, 'Vendor', {
            vendor: { performance_score: 0 },
            metrics: [metric],
            performanceScores: [{ performance_metric_id: metric.id, score: 0 }],
        });
        assert.ok(zeroScore.includes('0/4'));
        assert.ok(!rate.includes('350%'));
        assert.match(rate, /aria-invalid="true"/);
        const empty = render(language, 'Rate', {
            vendor: { id: 2, company_name: 'Fixture' },
            metrics: [],
        });
        assert.ok(
            empty.includes(
                language === 'id'
                    ? 'Tidak ada metrik kinerja aktif.'
                    : 'No active performance metrics.'
            )
        );
    });
}
test('administrator changes to built-in metric text are preserved in both languages', () => {
    for (const language of ['id', 'en'])
        for (const field of ['display_name', 'description']) {
            assert.equal(
                translateSystemMasterDataField(
                    language,
                    'performance_metrics',
                    { name: 'ops_rating', [field]: 'Manual Override' },
                    field
                ),
                'Manual Override'
            );
        }
});

for (const language of ['en', 'id']) {
    test(`configuration errors are inline once, weights show percentages and the complete configuration survives filtering (${language})`, () => {
        const html = render(
            language,
            'Metrics',
            {
                metrics: { data: [], links: [] },
                configuration: [metric],
                version: 'a'.repeat(64),
            },
            { 'metrics.0.weight': 'Invalid precise weight', configuration: 'Total must be 100' }
        );
        for (const message of ['Invalid precise weight', 'Total must be 100'])
            assert.equal(html.split(message).length - 1, 1);
        assert.match(
            html.match(/<input[^>]*name="metrics.0.weight"[^>]*>/)[0],
            /aria-invalid="true"/
        );
        assert.match(html.match(/<input[^>]*name="metrics.0.name"[^>]*>/)[0], /disabled=""/);
        assert.match(html, /noValidate=""/);
        assert.ok(html.includes('Manual description'));
        assert.ok(html.includes(language === 'id' ? 'Bobot (%)' : 'Weight (%)'));
        assert.ok(html.includes(language === 'id' ? 'Total aktif:' : 'Active total:'));
        assert.ok(html.includes(language === 'id' ? 'Simpan Konfigurasi' : 'Save Configuration'));
    });
}
