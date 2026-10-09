import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../../', import.meta.url));
let pages;
before(async () => {
    const result = await build({
        stdin: {
            contents: `export { default as Wizard } from './resources/js/Pages/Vendor/Onboarding/Wizard.jsx'; export { default as Register } from './resources/js/Pages/Auth/Register.jsx';`,
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
                name: 'onboarding-render',
                setup(builder) {
                    builder.onResolve({ filter: /^@inertiajs\/react$/ }, () => ({
                        path: 'inertia',
                        namespace: 'fixture',
                    }));
                    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
                        contents: `import { createElement } from 'react'; export const Head = () => null; export const Link = ({ children, ...props }) => createElement('a', props, children); export const router = { post() {}, get() {} }; export const usePage = () => ({ props: { errors: globalThis.onboardingErrors || {}, features: {} } }); export const useForm = (data) => ({ data, setData() {}, post() {}, processing: false, errors: globalThis.onboardingErrors || {} });`,
                    }));
                    builder.onLoad({ filter: /\/Contexts\/LanguageContext.jsx$/ }, () => ({
                        contents: `import { translateMessage } from '${root}resources/js/i18n/translations.js'; export const useLanguage = () => ({ language: globalThis.onboardingLanguage, t: (message, replacements) => translateMessage(globalThis.onboardingLanguage, message, replacements) });`,
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
    pages = await import(
        `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`
    );
});

const companyFields = [
    'company_name',
    'experience',
    'business_identification_number',
    'tax_id',
    'deed_number',
    'contact_person',
    'contact_phone',
    'address',
    'pincode',
];
const bankFields = ['code_bank', 'bank_name', 'bank_account_number', 'bank_branch'];
const renderStep = (step, sessionData = {}, documentTypes = []) =>
    renderToStaticMarkup(
        createElement(pages.Wizard, {
            currentStep: step,
            auth: { user: { name: 'A'.repeat(200) } },
            sessionData,
            documentTypes,
            vendorCategories: [],
            businessTypes: [],
        })
    );

for (const language of ['id', 'en']) {
    for (const width of [375, 768, 1440]) {
        test(`${language}/${width}: isolated markup checks breakpoint contracts for target width on all steps`, () => {
            globalThis.onboardingLanguage = language;
            globalThis.onboardingErrors = {};
            for (const step of [1, 2, 3, 4]) {
                const html = renderStep(step, {
                    step1: { company_name: 'X'.repeat(300), experience: 'Y'.repeat(500) },
                });
                assert.match(html, /grid grid-cols-4 gap-2/);
                assert.match(html, /min-w-0 p-4 sm:p-8 md:p-12/);
                if (step < 4) assert.match(html, /noValidate=""/i);
                assert.doesNotMatch(html, /\srequired=""/);
                if (step === 4) assert.match(html, /wrap-anywhere/);
            }
        });
    }
    test(`${language}: required labels and inline errors associate with each manual field once`, () => {
        globalThis.onboardingLanguage = language;
        for (const [step, fields] of [
            [1, companyFields],
            [2, bankFields],
        ]) {
            globalThis.onboardingErrors = Object.fromEntries(
                fields.map((field) => [field, `Error-${field}`])
            );
            const html = renderStep(step);
            for (const field of fields) {
                assert.match(
                    html,
                    new RegExp(
                        `for="onboarding-${field}"[^>]*>[\\s\\S]*?<span[^>]*aria-hidden="true"[^>]*>\\*`
                    )
                );
                assert.match(
                    html,
                    new RegExp(
                        `id="onboarding-${field}"[^>]*aria-invalid="true"[^>]*aria-describedby="onboarding-${field}-error"`
                    )
                );
                assert.equal(html.split(`Error-${field}`).length - 1, 1);
            }
        }
    });
    test(`${language}: expiry indicator follows persisted upload and optional documents have no file marker`, () => {
        globalThis.onboardingLanguage = language;
        globalThis.onboardingErrors = {};
        const type = {
            id: 9,
            name: 'custom',
            display_name: 'Custom Document',
            has_expiry: true,
            is_active: true,
            is_mandatory: false,
            max_file_size_mb: 10,
        };
        const before = renderStep(3, {}, [type]);
        assert.match(before, /id="document-9-expiry"[^>]*disabled=""/);
        assert.doesNotMatch(before, /aria-hidden="true">\*/);
        const after = renderStep(
            3,
            {
                step3: {
                    documents: [
                        {
                            document_type_id: 9,
                            file_name: 'long'.repeat(200),
                            file_path: 'server.pdf',
                        },
                    ],
                },
            },
            [type]
        );
        assert.match(after, /for="document-9-expiry"[^>]*>[\s\S]*?aria-hidden="true">\*/);
        assert.match(after, /wrap-anywhere/);
        assert.doesNotMatch(after, /id="document-9-expiry"[^>]*disabled=""/);
    });
    test(`${language}: company select indicators and readonly bank name stay consistent`, () => {
        globalThis.onboardingLanguage = language;
        globalThis.onboardingErrors = {};
        const company = renderStep(1);
        assert.equal((company.match(/<span(?=[^>]*aria-hidden="true")[^>]*>\*/g) || []).length, 13);
        for (const id of ['company-category', 'company-province', 'company-city']) {
            assert.match(company, new RegExp(`for="${id}"`));
            assert.match(company, new RegExp(`id="${id}"[^>]*role="combobox"`));
        }
        const bank = renderStep(2, { step2: { code_bank: '008' } });
        assert.match(bank, /id="onboarding-bank_name"[^>]*readOnly=""[^>]*value="[^"]+"/);
        assert.equal((bank.match(/<span(?=[^>]*aria-hidden="true")[^>]*>\*/g) || []).length, 3);
        globalThis.onboardingErrors = { step: 'Step failure fixture' };
        assert.equal(renderStep(1).split('Step failure fixture').length - 1, 1);
    });
    test(`${language}: registration uses four display-only markers and no native validation`, () => {
        globalThis.onboardingLanguage = language;
        globalThis.onboardingErrors = { password_confirmation: 'Mismatch fixture' };
        const html = renderToStaticMarkup(createElement(pages.Register));
        assert.match(html, /noValidate=""/i);
        assert.doesNotMatch(html, /\srequired=""/);
        assert.equal(
            (html.match(/text-\(--color-danger\)" aria-hidden="true">\*/g) || []).length,
            4
        );
        assert.equal(html.split('Mismatch fixture').length - 1, 1);
    });
}
