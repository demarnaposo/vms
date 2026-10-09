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
            contents: `export { default as Categories } from './resources/js/Pages/Admin/VendorCategories/Index.jsx';
                export { default as BusinessTypes } from './resources/js/Pages/Admin/BusinessTypes/Index.jsx';
                export { default as Company } from './resources/js/Pages/Vendor/Onboarding/Steps/StepCompany.jsx';
                export { default as Documents } from './resources/js/Pages/Admin/DocumentTypes/Index.jsx';
                export { default as Notifications } from './resources/js/Pages/Admin/Notifications/Send.jsx';
                export { StaffUserForm, StaffRoleForm } from './resources/js/Pages/Admin/Staff/Index.jsx';
                
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
                    builder.onLoad({ filter: /\/Staff\/Index\.jsx$/ }, async ({ path }) => ({
                        contents:
                            (await readFile(path, 'utf8')) +
                            '\nexport { StaffUserForm, StaffRoleForm };',
                        loader: 'jsx',
                    }));
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

const role = { id: 4, name: 'ops_manager', display_name: 'Operations Manager' };
const permission = {
    id: 3,
    name: 'staff.vendors.list',
    display_name: 'List Vendors',
    operational: true,
    group: 'vendors',
};
const cases = [
    [
        'BusinessTypes',
        { types: { data: [], links: [] } },
        { code: 'Bad code', display_name: 'Bad name', is_active: 'Bad state' },
    ],
    [
        'Categories',
        { categories: [] },
        { code: 'Bad code', display_name: 'Bad name', is_active: 'Bad state' },
    ],
    [
        'Documents',
        { documentTypes: [] },
        {
            name: 'Bad code',
            display_name: 'Bad name',
            description: 'Bad description',
            'allowed_extensions.1': 'Bad extension',
            is_active: 'Bad state',
        },
    ],
    [
        'StaffUserForm',
        { roles: [role], onDone() {} },
        {
            name: 'Bad name',
            email: 'Bad email',
            password_confirmation: 'Bad confirmation',
            'role_ids.0': 'Bad role',
        },
    ],
    [
        'StaffRoleForm',
        { permissions: [permission], onDone() {} },
        { name: 'Bad code', description: 'Bad description', 'permission_ids.0': 'Bad permission' },
    ],
    [
        'Notifications',
        { vendors: [], staffUsers: [] },
        {
            title: 'Bad title',
            message: 'Bad message',
            target: 'Bad target',
            severity: 'Bad severity',
            send: 'Send failed',
        },
    ],
];
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
for (const language of ['id', 'en']) {
    test(
        'onboarding uses supplied business types and retains the legacy selection (' +
            language +
            ')',
        () => {
            const html = render(
                language,
                'Company',
                {
                    sessionData: { step1: { business_type: 'private_limited' } },
                    businessTypes: [
                        { code: 'pvt_ltd', display_name: 'Private Limited', is_active: true },
                        { code: 'custom_entity', display_name: 'Partnership', is_active: true },
                        {
                            code: 'private_limited',
                            display_name: 'private_limited',
                            is_active: false,
                        },
                    ],
                },
                { business_type: 'Choose a valid business type' }
            );
            assert.match(html, /<form[^>]*noValidate=""/);
            assert.match(html, /<button[^>]*role="combobox"[^>]*title="private_limited"/);
            assert.ok(html.includes('>private_limited</span>'));
            const builtIn = render(language, 'Company', {
                sessionData: { step1: { business_type: 'pvt_ltd' } },
                businessTypes: [
                    { code: 'pvt_ltd', display_name: 'Private Limited', is_active: true },
                ],
            });
            assert.ok(
                builtIn.includes(language === 'id' ? 'Perseroan Terbatas (PT)' : 'Private Limited')
            );
            assert.equal(html.split('Choose a valid business type').length - 1, 1);
            assert.match(
                html,
                /<button[^>]*role="combobox"[^>]*aria-required="true"[^>]*aria-invalid="true"[^>]*aria-describedby=/
            );
        }
    );
    test('business-type master labels, custom names and pagination (' + language + ')', () => {
        const longName = 'Manual Entity '.repeat(40);
        const html = render(language, 'BusinessTypes', {
            types: {
                data: [
                    {
                        id: 1,
                        code: 'pvt_ltd',
                        display_name: 'Private Limited',
                        is_active: true,
                        vendors_count: 2,
                    },
                    {
                        id: 2,
                        code: 'custom',
                        display_name: 'Partnership',
                        is_active: false,
                        vendors_count: 0,
                    },
                    {
                        id: 3,
                        code: 'long_name',
                        display_name: longName,
                        is_active: true,
                        vendors_count: 0,
                    },
                ],
                links: [
                    { url: null, label: '&laquo; Previous' },
                    { url: '/admin/business-types?page=1', label: '1', active: true },
                    { url: '/admin/business-types?page=2', label: '2', active: false },
                    { url: '/admin/business-types?page=2', label: 'Next &raquo;', active: false },
                ],
            },
        });
        assert.ok(html.includes(language === 'id' ? 'Perseroan Terbatas (PT)' : 'Private Limited'));
        assert.ok(html.includes('Partnership'));
        assert.ok(html.includes(longName));
        assert.ok(html.includes('overflow-x-auto'));
        assert.ok(html.includes('wrap-anywhere'));
        assert.ok(html.includes('/admin/business-types?page=2'));
        const businessTypesLink = html.indexOf('href="/admin/business-types"');
        const categoriesLink = html.indexOf('href="/admin/vendor-categories"');
        assert.ok(businessTypesLink >= 0 && categoriesLink > businessTypesLink);
    });
    test('business-type master menu is hidden from other roles (' + language + ')', () => {
        for (const role of ['vendor', 'ops_manager', 'finance_manager']) {
            const html = render(
                language,
                'BusinessTypes',
                { types: { data: [], links: [] } },
                {},
                false,
                {},
                [role]
            );
            assert.ok(!html.includes('href="/admin/business-types"'));
        }
    });
    for (const [component, props, errors] of cases) {
        test(component + ' aligned fields and red required indicators (' + language + ')', () => {
            const html = render(language, component, props, errors);
            assert.match(html, /<form[^>]*noValidate=""/);
            assert.ok(!html.includes(' required=""'));
            assert.match(
                html,
                /<span aria-hidden="true" class="text-\(--color-danger\)">\*<\/span>/
            );
            assert.match(html, /class="input-field w-full/);
            for (const message of Object.values(errors))
                assert.equal(html.split(message).length - 1, 1, message);
            for (const id of [...html.matchAll(/aria-describedby="([^"]+)"/g)].flatMap((match) =>
                match[1].split(' ')
            )) {
                assert.ok(html.includes('id="' + id + '"'), 'Missing error/help target ' + id);
            }
            for (const id of [...html.matchAll(/<label for="([^"]+)"/g)].map((match) => match[1]))
                assert.ok(html.includes('id="' + id + '"'));
            const pending = render(language, component, props, {}, true);
            const controls = [...pending.matchAll(/<(?:input|textarea|select)\b[^>]*>/g)]
                .map((match) => match[0])
                .filter((tag) => !tag.includes('type="hidden"'));
            assert.ok(controls.length);
            assert.ok(
                controls.every((tag) => tag.includes('disabled=""')),
                'Inputs must pause during submission'
            );
            assert.match(pending, /<button[^>]*type="submit"[^>]*disabled=""/);
        });
    }
    test('conditional recipient preserves custom labels (' + language + ')', () => {
        const html = render(
            language,
            'Notifications',
            { staffUsers: [{ id: 7, name: 'Manual Recipient', email: 'fixture@example.test' }] },
            { target_id: 'Choose recipient' },
            false,
            { target: 'specific_user', target_id: '7' }
        );
        assert.equal(html.split('Choose recipient').length - 1, 1);
        assert.ok(html.includes('Manual Recipient (fixture@example.test)'));
        assert.match(
            html,
            /<button[^>]*role="combobox"[^>]*aria-invalid="true"[^>]*aria-describedby=/
        );
    });
}
test('staff edit keeps optional passwords, immutable role code and legacy assignments', () => {
    const user = render('en', 'StaffUserForm', {
        roles: [role],
        editing: { id: 1, name: 'Fixture', email: 'fixture@example.test', role_ids: [4] },
        onDone() {},
    });
    assert.ok(user.includes('New Password'));
    assert.ok(user.includes('Show password'));
    assert.equal((user.match(/aria-required="true"/g) || []).length, 2);
    const roleHtml = render('en', 'StaffRoleForm', {
        permissions: [permission],
        editing: {
            id: 2,
            name: 'custom_role',
            display_name: 'Manual Role',
            description: 'Manual prose',
            permission_ids: [3, 99],
            legacy_permissions: ['legacy.view'],
        },
        onDone() {},
    });
    assert.ok(roleHtml.includes('Manual Role'));
    assert.ok(roleHtml.includes('legacy.view'));
    assert.match(roleHtml, /<input[^>]*disabled=""[^>]*value="custom_role"/);
    assert.deepEqual(runtime.getFormData().permission_ids, [3]);
});
