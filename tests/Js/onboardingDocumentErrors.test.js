import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../../', import.meta.url));
let StepDocuments;
before(async () => {
    const result = await build({
        stdin: {
            contents:
                "export { default } from './resources/js/Pages/Vendor/Onboarding/Steps/StepDocuments.jsx';",
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
                name: 'document-fixture',
                setup(builder) {
                    builder.onLoad(
                        { filter: /\/Onboarding\/Steps\/StepDocuments.jsx$/ },
                        async ({ path }) => ({
                            contents: (await readFile(path, 'utf8')).replace(
                                "import { useMemo, useRef, useState } from 'react';",
                                "import { useMemo as realMemo, useRef as realRef, useState as realState } from 'react'; const useMemo = (...args) => globalThis.documentHooks ? globalThis.documentHooks.useMemo(...args) : realMemo(...args); const useRef = (...args) => globalThis.documentHooks ? globalThis.documentHooks.useRef(...args) : realRef(...args); const useState = (...args) => globalThis.documentHooks ? globalThis.documentHooks.useState(...args) : realState(...args);"
                            ),
                            loader: 'jsx',
                        })
                    );
                    builder.onResolve({ filter: /^@inertiajs\/react$/ }, () => ({
                        path: 'inertia',
                        namespace: 'fixture',
                    }));
                    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
                        contents:
                            "import { createElement } from 'react'; export const usePage = () => ({ props: { errors: globalThis.documentErrors || {} } }); export const router = { post: (...args) => globalThis.documentRequests.push(args) }; export const Head = () => null; export const Link = ({children, ...props}) => createElement('a', props, children); export const useForm = () => ({});",
                    }));
                    builder.onLoad({ filter: /\/Contexts\/LanguageContext.jsx$/ }, () => ({
                        contents: `import { translateMessage } from '${root}resources/js/i18n/translations.js'; export const useLanguage = () => ({ language: globalThis.documentLanguage, t: (message, replacements) => translateMessage(globalThis.documentLanguage, message, replacements) });`,
                        loader: 'jsx',
                    }));
                    builder.onResolve(
                        { filter: /^(react(?:-dom)?(?:\/.*)?|axios|sonner)$/ },
                        (args) => ({ path: import.meta.resolve(args.path), external: true })
                    );
                },
            },
        ],
    });
    StepDocuments = (
        await import(
            `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`
        )
    ).default;
});

const types = [
    {
        id: 7,
        name: 'company_deed',
        display_name: 'Company Deed',
        is_active: true,
        is_mandatory: true,
        allowed_extensions: ['pdf'],
        max_file_size_mb: 10,
    },
];
const fixtures = [];
for (const language of ['id', 'en']) {
    test(`${language}: type errors appear once with Continue and no manual draft action`, () => {
        globalThis.documentLanguage = language;
        globalThis.documentErrors = {
            'documents_by_type.7': 'Required document fixture',
            documents: 'Aggregate must not repeat',
        };
        const html = renderToStaticMarkup(
            createElement(StepDocuments, {
                documentTypes: types.map((type) => ({ ...type, has_expiry: true })),
                sessionData: {},
            })
        );
        assert.equal(html.split('Required document fixture').length - 1, 1);
        assert.ok(!html.includes('Aggregate must not repeat'));
        assert.match(html, /aria-invalid="true"/);
        assert.match(html, /aria-describedby="document-7-error"/);
        assert.match(html, /noValidate=""/);
        assert.match(html, /type="date"[^>]*disabled=""/);
        assert.ok(!html.includes(language === 'id' ? 'Simpan Draft' : 'Save Draft'));
        assert.ok(html.includes(language === 'id' ? 'Lanjutkan' : 'Continue'));
        fixtures.push({ language, html });
    });
}

test('aggregate errors without type association remain visible', () => {
    globalThis.documentLanguage = 'en';
    globalThis.documentErrors = { documents: 'General failure fixture' };
    const html = renderToStaticMarkup(
        createElement(StepDocuments, { documentTypes: types, sessionData: {} })
    );
    assert.ok(html.includes('General failure fixture'));
});

test('file selection autosaves immediately, while Continue sends only validation intent', () => {
    const states = [];
    let slot = 0;
    globalThis.documentHooks = {
        useMemo: (factory) => factory(),
        useState: (initial) => {
            const index = slot++;
            if (!(index in states)) states[index] = initial;
            return [
                states[index],
                (value) => {
                    states[index] = typeof value === 'function' ? value(states[index]) : value;
                },
            ];
        },
        useRef: (initial) => {
            const index = slot++;
            if (!(index in states)) states[index] = { current: initial };
            return states[index];
        },
    };
    globalThis.documentLanguage = 'en';
    globalThis.documentErrors = {};
    globalThis.documentRequests = [];
    const render = (documents = []) => {
        slot = 0;
        return StepDocuments({
            documentTypes: types.map((type) => ({ ...type, has_expiry: true })),
            sessionData: { step3: { documents } },
        });
    };
    const nodes = (tree) => {
        if (!tree || typeof tree !== 'object') return [];
        if (Array.isArray(tree)) return tree.flatMap(nodes);
        return [tree, ...nodes(tree.props?.children), ...nodes(tree.props?.footer)];
    };
    try {
        const file = new File(['%PDF-1.4'], 'test.pdf', { type: 'application/pdf' });
        let tree = render();
        const dateInput = (view) =>
            nodes(view).find((node) => node.type === 'input' && node.props.type === 'date');
        assert.equal(dateInput(tree).props.disabled, true);
        nodes(tree)
            .find((node) => node.type === 'input' && node.props.type === 'file')
            .props.onChange({ target: { files: [file], value: 'test.pdf' } });
        assert.equal(globalThis.documentRequests.length, 1);
        const [url, data, callbacks] = globalThis.documentRequests[0];
        assert.equal(url, '/vendor/onboarding/step3');
        assert.equal(data.get('intent'), 'autosave');
        assert.equal(data.get('documents[0][document_type_id]'), '7');
        assert.equal(data.get('documents[0][file]').name, 'test.pdf');
        assert.equal(data.has('documents[0][expiry_date]'), false);
        assert.equal(callbacks.preserveScroll, true);
        assert.equal(callbacks.preserveState, true);
        assert.equal(callbacks.headers['X-Onboarding-Document-Type'], '7');
        globalThis.documentErrors = { 'documents.0.file': 'File size must not exceed 1 MB.' };
        assert.equal(
            nodes(render()).filter(
                (node) =>
                    node.type === 'p' && node.props.children === 'File size must not exceed 1 MB.'
            ).length,
            1
        );
        globalThis.documentErrors = {};
        tree = render();
        nodes(tree)
            .find((node) => node.type === 'form')
            .props.onSubmit({ preventDefault() {} });
        assert.equal(globalThis.documentRequests.length, 1, 'Continue cannot race an upload');
        callbacks.onSuccess();
        callbacks.onFinish();
        const saved = [{ document_type_id: 7, file_name: 'test.pdf' }];
        tree = render(saved);
        assert.equal(dateInput(tree).props.disabled, false);
        nodes(tree)
            .find((node) => node.type === 'form')
            .props.onSubmit({ preventDefault() {} });
        assert.equal(globalThis.documentRequests[1][1].get('intent'), 'continue');
        assert.equal(globalThis.documentRequests[1][1].has('documents[0][file]'), false);
        globalThis.documentRequests[1][2].onFinish();
        tree = render(saved);
        dateInput(tree).props.onChange({ target: { value: '2030-01-01' } });
        const expiryRequest = globalThis.documentRequests[2];
        assert.equal(expiryRequest[1].get('expiry_dates[7]'), '2030-01-01');
        assert.equal(expiryRequest[1].has('documents[0][file]'), false);
        expiryRequest[2].onSuccess();
        expiryRequest[2].onFinish();
        tree = render(saved);
        nodes(tree)
            .find((node) => node.type === 'button' && node.props.children === 'Remove from draft')
            .props.onClick();
        tree = render(saved);
        nodes(tree)
            .find((node) => node.props?.variant === 'danger')
            .props.onClick();
        const removal = globalThis.documentRequests[3];
        assert.equal(removal[1].get('intent'), 'autosave');
        assert.equal(removal[1].get('removed_document_type_ids[0]'), '7');
        removal[2].onSuccess();
        removal[2].onFinish();
        assert.equal(dateInput(render()).props.disabled, true);
        assert.ok(
            !nodes(render()).some(
                (node) => node.type === 'button' && node.props.children === 'Remove from draft'
            )
        );
    } finally {
        delete globalThis.documentHooks;
        delete globalThis.documentRequests;
    }
});

test('optional isolated HTML fixture export', async () => {
    if (!process.env.VMS_DOCUMENT_FIXTURE) return;
    const manifest = JSON.parse(await readFile(`${root}public/build/manifest.json`, 'utf8'));
    const css = manifest['resources/js/app.jsx'].css[0];
    const sections = fixtures
        .flatMap(({ language, html }) =>
            [375, 768, 1440].map((width) => {
                const doc = `<html lang="${language}"><head><link rel="stylesheet" href="file://${root}public/build/${css}"></head><body>${html}</body></html>`;
                return `<h2 id="${language}-${width}">${language} — ${width}px</h2><iframe width="${width}" height="1000" srcdoc="${doc.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"></iframe>`;
            })
        )
        .join('');
    await writeFile(
        process.env.VMS_DOCUMENT_FIXTURE,
        `<html><head><title>VMS document validation isolated fixtures</title></head><body>${sections}</body></html>`
    );
});
