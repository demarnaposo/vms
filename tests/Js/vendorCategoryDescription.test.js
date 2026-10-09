import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';
import { vendorCategoryLabel } from '../../resources/js/i18n/vendorCategories.js';
import { SYSTEM_MASTER_DATA } from '../../resources/js/i18n/systemMasterData.js';
const root = fileURLToPath(new URL('../../', import.meta.url));
let runtime;
before(async () => {
    const result = await build({
        stdin: {
            contents: `export { default as Categories } from './resources/js/Pages/Admin/VendorCategories/Index.jsx';
                export { default as Company } from './resources/js/Pages/Vendor/Onboarding/Steps/StepCompany.jsx';
                export { default as Review } from './resources/js/Pages/Vendor/Onboarding/Steps/StepReview.jsx';
                export { default as Description } from './resources/js/Components/VendorCategoryDescription.jsx';
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
                        export const Link = ({ children, preserveScroll: _scroll, preserveState: _state, ...props }) => createElement('a', props, children);
                        export const useForm = (initial) => { data = {...initial, ...page.props.formOverrides}; return { data, errors: page.props.errors, processing: page.props.testProcessing || false, setData() {} }; };`,
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

function render(
    language,
    component,
    props,
    errors = {},
    processing = false,
    formOverrides = {},
    roles = ['super_admin']
) {
    runtime.setPage({
        url: '/admin/' + component,
        props: {
            auth: { user: { name: 'Fixture' }, roles, can: {} },
            errors,
            testProcessing: processing,
            formOverrides,
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

const first = {
    id: 1,
    code: 'general_services_facility',
    display_name: 'General Services & Facility',
    description: 'Cleaning Services, Security Services, Pest Control, Landscaping',
    is_active: true,
};
const custom = {
    id: 2,
    code: 'custom',
    display_name: 'Custom Name',
    description: 'Custom description',
    is_active: true,
};
const legacy = {
    id: 3,
    code: 'legacy',
    display_name: 'Legacy Name',
    description: null,
    is_active: false,
};
for (const language of ['id', 'en']) {
    test(
        'category descriptions follow selection and draft without becoming submitted fields (' +
            language +
            ')',
        () => {
            for (const category of [first, custom, legacy]) {
                const html = render(language, 'Company', {
                    vendorCategories: [first, custom, legacy],
                    sessionData: { step1: { category_id: category.id } },
                });
                assert.doesNotMatch(html, /<textarea[^>]*readOnly=""/);
                if (category.description) {
                    assert.match(html, /role="tooltip"/);
                    assert.match(html, /aria-describedby=/);
                    assert.ok(
                        html.includes(
                            language === 'id' ? 'Deskripsi Kategori' : 'Category Description'
                        )
                    );
                } else {
                    assert.doesNotMatch(
                        html,
                        /aria-label="(?:Category Description|Deskripsi Kategori)"/
                    );
                }

                const expected =
                    category === first
                        ? language === 'id'
                            ? 'Cleaning Service, Security, Pest Control, Landscaping'
                            : first.description
                        : category.description || '';
                assert.ok(html.includes(expected));
                assert.equal(runtime.getFormData().category_id, category.id);
                assert.equal('category_description' in runtime.getFormData(), false);
                assert.equal('description' in runtime.getFormData(), false);
                assert.doesNotMatch(html, /<textarea[^>]*readOnly=""[^>]*name=/);
                assert.doesNotMatch(
                    html,
                    /<button[^>]*aria-haspopup="listbox"[^>]*><span[^>]*>[^<]*Cleaning/
                );
            }
            const empty = render(language, 'Company', {
                vendorCategories: [first, custom, legacy],
            });
            assert.doesNotMatch(empty, /aria-label="(?:Category Description|Deskripsi Kategori)"/);
        }
    );
    test(
        'review shows current master description and custom text unchanged (' + language + ')',
        () => {
            const html = render(language, 'Review', {
                vendorCategories: [custom],
                sessionData: { step1: { category_id: 2 } },
                documentTypes: [],
            });
            assert.ok(html.includes('Custom description'));
            assert.ok(html.includes('Custom Name'));
            assert.match(html, /role="tooltip"/);
            assert.doesNotMatch(html, /<textarea[^>]*readOnly=""/);
            const legacyReview = render(language, 'Review', {
                vendorCategories: [legacy],
                sessionData: { step1: { category_id: legacy.id } },
                documentTypes: [],
            });
            assert.doesNotMatch(
                legacyReview,
                /aria-label="(?:Category Description|Deskripsi Kategori)"/
            );
        }
    );
    test(
        'category CRUD associates description errors and disables referenced deletion (' +
            language +
            ')',
        () => {
            const html = render(
                language,
                'Categories',
                { categories: [{ ...custom, vendors_count: 0, in_use: true }] },
                { description: 'Category Description may not exceed 1000 characters.' }
            );
            assert.match(html, /<textarea[^>]*aria-invalid="true"[^>]*aria-describedby=/);
            assert.match(html, /<form[^>]*noValidate=""/);
            assert.ok(html.includes('Custom description'));
            assert.match(html, /<button[^>]*disabled=""[^>]*>[\s\S]*?(Delete|Hapus)/);
        }
    );
}

test('all ten built-in descriptions preserve the requested Indonesian wording; custom and empty values remain unchanged', () => {
    const expected = [
        'Cleaning Service, Security, Pest Control, Landscaping',
        'AC, Listrik, Plumbing, Lift, Genset',
        'Kontraktor Renovasi, Interior, Furniture, Signage',
        'Hardware, Software/LMS, Website, Network, Lisensi Zoom/M365',
        'Event Organizer, Printing, Merchandise, Agency, Fotografer, MC',
        'Catering, Coffee Break, Snack Box, Restoran Rekanan',
        'Narasumber, Fasilitator, Lembaga Sertifikasi, Penerjemah, Konsultan',
        'Travel Agent, Rental Kendaraan, Ekspedisi, Kurir',
        'ATK, Uniform, Consumable, Air Minum, Tissue',
        'Auditor, Notaris, Asuransi, Bank, Pajak',
    ];
    const records = Object.entries(SYSTEM_MASTER_DATA.vendor_categories).map(([code, row]) => ({
        code,
        ...row,
    }));
    assert.equal(records.length, 10);
    assert.deepEqual(
        records.map((record) => vendorCategoryLabel('id', record, 'description')),
        expected
    );
    assert.equal(vendorCategoryLabel('id', { ...first, description: null }, 'description'), '');
    assert.equal(
        vendorCategoryLabel('id', { ...first, description: 'Admin text' }, 'description'),
        'Admin text'
    );
    assert.equal(
        vendorCategoryLabel('id', { ...custom, display_name: 'Food & Beverages' }),
        'Food & Beverages'
    );
    const long = 'x'.repeat(1000);
    const html = render('id', 'Description', { category: { ...custom, description: long } });
    assert.ok(html.includes(long));
    assert.match(html, /min-w-0/);
});
