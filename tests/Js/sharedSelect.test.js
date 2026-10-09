import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import vm from 'node:vm';

let runtime;
before(async () => {
    const root = new URL('../..', import.meta.url).pathname;
    const result = await build({
        stdin: {
            contents: `export { FormSelect } from './resources/js/Components/FormInputs.jsx';
                export { LanguageProvider } from './resources/js/Contexts/LanguageContext.jsx';`,
            resolveDir: root,
        },
        bundle: true,
        write: false,
        format: 'esm',
        platform: 'node',
        jsx: 'automatic',
        alias: { '@': root + '/resources/js' },
        plugins: [
            {
                name: 'select-test',
                setup(builder) {
                    builder.onResolve({ filter: /^@inertiajs\/react$/ }, () => ({
                        path: 'inertia',
                        namespace: 'mock',
                    }));
                    builder.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({
                        contents: `export const usePage = () => ({ props: {} });`,
                    }));
                    builder.onResolve({ filter: /^(react(?:-dom)?(?:\/.*)?|axios)$/ }, (args) => ({
                        path: import.meta.resolve(args.path),
                        external: true,
                    }));
                },
            },
        ],
    });
    runtime = await import(
        'data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64')
    );
});
const render = (language, props) => {
    const previous = globalThis.window;
    globalThis.window = {
        location: { pathname: '/' },
        localStorage: { getItem: () => JSON.stringify({ language }) },
    };
    try {
        return renderToStaticMarkup(
            createElement(
                runtime.LanguageProvider,
                null,
                createElement(runtime.FormSelect, { onChange() {}, ...props })
            )
        );
    } finally {
        if (previous === undefined) delete globalThis.window;
        else globalThis.window = previous;
    }
};

for (const language of ['id', 'en']) {
    test(
        'shared select preserves empty sentinel, selected ID, custom label and unique accessible error ' +
            language,
        () => {
            const html = render(language, {
                id: 'fixture-select',
                name: 'recipient_id',
                label: 'Select Recipient',
                value: '7',
                translateOptions: false,
                options: [{ value: 7, label: 'This Month' }],
                error: 'Fixture error',
                showRequiredIndicator: true,
                size: 'field',
            });
            assert.match(html, /for="fixture-select"/);
            assert.match(html, /name="recipient_id" value="7"/);
            assert.match(html, /role="combobox"/);
            assert.match(
                html,
                /aria-required="true" aria-invalid="true" aria-describedby="fixture-select-error"/
            );
            assert.equal(html.split('Fixture error').length - 1, 1);
            assert.match(html, />This Month<\/span>/);
            assert.doesNotMatch(html, / required=""/);
            const empty = render(language, { value: '', name: 'category_id', options: [] });
            assert.match(empty, /name="category_id" value=""/);
            assert.ok(empty.includes(language === 'id' ? 'Pilih...' : 'Select...'));
        }
    );
    test(
        'shared select keeps unknown legacy values and translates static preset without changing code ' +
            language,
        () => {
            const legacy = render(language, {
                value: 'old_entity',
                options: [{ value: 'new_entity', label: 'New entity' }],
            });
            assert.match(legacy, />old_entity<\/span>/);
            const preset = render(language, {
                name: 'range',
                label: 'Date Range',
                value: 'this_month',
                size: 'compact',
                placeholder: 'Select date range',
                options: [{ value: 'this_month', label: 'This Month' }],
            });
            assert.match(preset, /name="range" value="this_month"/);
            assert.ok(preset.includes(language === 'id' ? 'Bulan Ini' : 'This Month'));
            assert.match(preset, /min-h-9/);
        }
    );
}

test('all report Apply and export handlers preserve current filters and URLs', async () => {
    for (const file of [
        'PaymentReport',
        'VendorSummaryReport',
        'ComplianceReport',
        'PerformanceReport',
        'DocumentExpiryReport',
    ]) {
        const source = await readFile(
            new URL('../../resources/js/Pages/Admin/Reports/' + file + '.jsx', import.meta.url),
            'utf8'
        );
        const localFilters = { start_date: '2026-10-01', end_date: '2026-10-31', status: 'all' };
        const calls = [];
        const location = { href: '' };
        const context = {
            localFilters,
            router: { get: (...args) => calls.push(args) },
            window: { location },
            URLSearchParams,
        };
        for (const handler of ['handleFilter', 'handleExport']) {
            const body = source.match(
                new RegExp('const ' + handler + ' = \\(\\) => \\{([\\s\\S]*?)\\n    \\};')
            )?.[1];
            assert.ok(body, file + ' ' + handler);
            vm.runInNewContext('(function(){' + body + '})()', context);
        }
        assert.equal(calls.length, 1);
        assert.equal(calls[0][1], localFilters);
        const exportUrl = new URL(location.href, 'https://vms.test');
        for (const [key, value] of Object.entries(localFilters))
            assert.equal(exportUrl.searchParams.get(key), value);
        assert.ok(exportUrl.pathname.startsWith('/admin/reports/export/'));
    }
});
