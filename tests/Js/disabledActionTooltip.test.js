import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from '@babel/parser';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../../', import.meta.url));
let controls;

before(async () => {
    const result = await build({
        stdin: {
            contents: `export * from './resources/js/Components/ActionControls.jsx';
                export { default as Rate } from './resources/js/Pages/Admin/Performance/Rate.jsx';
                export { default as Metrics } from './resources/js/Pages/Admin/PerformanceMetrics/Index.jsx';
                export { setProcessing } from '@inertiajs/react';
                export { DisabledButton } from './resources/js/Components/DisabledActionTooltip.jsx';
                export { default as PaginationLinks } from './resources/js/Components/PaginationLinks.jsx';
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
                    builder.onResolve({ filter: /^@inertiajs\/react$/ }, () => ({
                        path: 'inertia',
                        namespace: 'disabled-test',
                    }));
                    builder.onLoad({ filter: /.*/, namespace: 'disabled-test' }, () => ({
                        contents: `import {createElement} from 'react';
                        let processing=false;
                        export const setProcessing=(value)=>{processing=value;};
                        export const usePage=()=>({props:{auth:{user:{name:'Fixture'},roles:['super_admin'],can:{}},features:{payments:{enabled:false}}}});
                        export const useForm=(data)=>({data,errors:{},processing,setData(){}});
                        export const router={}; export const Head=()=>null;
                        export const Link=({children,preserveScroll,preserveState,...props})=>createElement('a',props,children);`,
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

for (const language of ['id', 'en']) {
    test(`disabled explanation preserves native control and accessible label (${language})`, () => {
        const html = render(
            controls.ActionButton,
            {
                type: 'submit',
                disabled: true,
                disabledReason: 'Enter a rejection reason before continuing.',
                'aria-label': 'Reject document',
                title: 'Old duplicate title',
                children: 'Reject',
            },
            language
        );
        assert.match(html, /<button[^>]*disabled=""/);
        assert.match(html, /type="submit"/);
        assert.match(html, /aria-label="Reject document"/);
        assert.match(html, /data-disabled-trigger=""[^>]*tabindex="0"/);
        assert.match(html, /role="tooltip"/);
        assert.doesNotMatch(html, /title="Old duplicate title"/);
        assert.ok(
            html.includes(
                language === 'id'
                    ? 'Masukkan alasan penolakan sebelum melanjutkan.'
                    : 'Enter a rejection reason before continuing.'
            )
        );
        const id = html.match(
            /role="group"[^>]*aria-labelledby="([^"]+)"[^>]*aria-describedby="([^"]+)"/
        );
        assert.ok(id);
        assert.ok(html.includes(`id="${id[1]}"`));
        assert.ok(html.includes(`id="${id[2]}" role="tooltip"`));
    });
    test(`enabled control retains markup and tab order (${language})`, () => {
        const props = {
            disabled: false,
            disabledReason: 'A request is in progress. Please wait.',
            children: 'Save',
            className: 'min-h-9',
        };
        assert.equal(
            render(controls.ActionButton, props, language),
            render(controls.ActionButton, { ...props, disabledReason: undefined }, language)
        );
        assert.doesNotMatch(
            render(controls.ActionButton, props, language),
            /tooltip|tabindex|disabledReason/
        );
    });
    test(`pending form controls and pagination explain actual boundary (${language})`, () => {
        const loading = render(controls.FormButton, { loading: true, children: 'Save' }, language);
        assert.match(loading, /disabled=""/);
        assert.ok(
            loading.includes(
                language === 'id' ? 'Permintaan sedang diproses.' : 'A request is in progress.'
            )
        );
        const html = render(
            controls.PaginationLinks,
            {
                links: [
                    { url: null, label: 'Previous' },
                    { url: '/page/1', label: '1', active: true },
                    { url: '/page/2', label: '2' },
                    { url: null, label: 'Next' },
                ],
            },
            language
        );
        assert.equal((html.match(/data-disabled-trigger=/g) || []).length, 2);
        assert.ok(html.includes(language === 'id' ? 'halaman pertama' : 'first page'));
        assert.ok(html.includes(language === 'id' ? 'halaman terakhir' : 'last page'));
        const ids = [...html.matchAll(/id="([^"]+)"/g)].map((x) => x[1]);
        assert.equal(ids.length, new Set(ids).size);
        assert.match(html, /href="\/page\/2"/);
    });
}

test('an unspecified reason retains existing callers without inventing a business rule', () => {
    const html = render(controls.ActionButton, { disabled: true, children: 'Save' });
    assert.match(html, /^<button /);
    assert.doesNotMatch(html, /tooltip/);
});

for (const language of ['id', 'en']) {
    test(`rating and metric deletion choose their actual blocking condition (${language})`, () => {
        controls.setProcessing(false);
        const unavailable = render(
            controls.Rate,
            { vendor: { id: 1, company_name: 'Manual' }, metrics: [] },
            language
        );
        assert.ok(
            unavailable.includes(
                language === 'id'
                    ? 'Tidak ada metrik kinerja aktif yang tersedia untuk penilaian.'
                    : 'No active performance metrics are available for rating.'
            )
        );
        controls.setProcessing(true);
        const pending = render(
            controls.Rate,
            { vendor: { id: 1, company_name: 'Manual' }, metrics: [] },
            language
        );
        assert.ok(
            pending.includes(
                language === 'id' ? 'Permintaan sedang diproses.' : 'A request is in progress.'
            )
        );
        assert.ok(
            !pending.includes(
                language === 'id'
                    ? 'Tidak ada metrik kinerja aktif yang tersedia untuk penilaian.'
                    : 'No active performance metrics are available for rating.'
            )
        );
        controls.setProcessing(false);
        const metrics = [
            {
                id: 1,
                name: 'builtin',
                display_name: 'Manual',
                protected: true,
                scores_count: 0,
                weight: 1,
                max_score: 100,
                is_active: true,
            },
            {
                id: 2,
                name: 'custom',
                display_name: 'Manual2',
                protected: false,
                scores_count: 1,
                weight: 1,
                max_score: 100,
                is_active: true,
            },
        ];
        const protectedHtml = render(
            controls.Metrics,
            { metrics: { data: metrics, links: [] }, configuration: metrics },
            language
        );
        assert.ok(
            protectedHtml.includes(
                language === 'id'
                    ? 'Metrik bawaan tidak dapat dihapus.'
                    : 'Built-in metrics cannot be deleted.'
            )
        );
        assert.ok(
            protectedHtml.includes(
                language === 'id'
                    ? 'Metrik yang sudah dinilai tidak dapat dihapus.'
                    : 'Rated metrics cannot be deleted.'
            )
        );
        controls.setProcessing(true);
        const busyHtml = render(
            controls.Metrics,
            { metrics: { data: metrics, links: [] }, configuration: metrics },
            language
        );
        assert.ok(
            !busyHtml.includes(
                language === 'id'
                    ? 'Metrik bawaan tidak dapat dihapus.'
                    : 'Built-in metrics cannot be deleted.'
            )
        );
        controls.setProcessing(false);
    });
}

test('all explicit disabled action callers supply reasons without changing native disabled', () => {
    const files = readdirSync(`${root}resources/js/Pages`, { recursive: true }).filter((name) =>
        name.endsWith('.jsx')
    );
    let callers = 0;
    for (const file of files) {
        const source = readFileSync(`${root}resources/js/Pages/${file}`, 'utf8');
        const tree = parse(source, { sourceType: 'module', plugins: ['jsx'] });
        const visit = (node) => {
            if (!node || typeof node !== 'object') return;
            if (
                node.type === 'JSXOpeningElement' &&
                [
                    'button',
                    'DisabledButton',
                    'ActionButton',
                    'Button',
                    'ModalPrimaryButton',
                    'FormButton',
                ].includes(node.name.name)
            ) {
                if (node.attributes.some((attr) => attr.name?.name === 'disabled')) {
                    callers++;
                    assert.ok(
                        node.attributes.some((attr) => attr.name?.name === 'disabledReason'),
                        `${file}:${node.loc.start.line} missing disabled reason`
                    );
                    assert.notEqual(
                        node.name.name,
                        'button',
                        `${file}:${node.loc.start.line} missing accessible wrapper`
                    );
                }
            }
            for (const value of Object.values(node)) {
                if (Array.isArray(value)) value.forEach(visit);
                else if (value && typeof value === 'object') visit(value);
            }
        };
        visit(tree);
    }
    assert.ok(callers > 0);
});
