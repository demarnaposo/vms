import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../../', import.meta.url));
let runtime;
before(async () => {
    const result = await build({
        stdin: {
            contents: `export { StaffRoleForm } from './resources/js/Pages/Admin/Staff/Index.jsx';
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
                    builder.onLoad({ filter: /Pages\/Admin\/Staff\/Index\.jsx$/ }, ({ path }) => ({
                        contents: `${readFileSync(path, 'utf8')}\nexport { StaffRoleForm };`,
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
                        export const Link = ({ children, ...props }) => createElement('a', props, children);
                        export const useForm = (initial) => { data = initial; return { data, errors: page.props.errors, processing: false, setData() {} }; };`,
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

function render(enabled, language, editing = true, errors = {}) {
    // Model the server-filtered catalogue; PHP tests cover its flag-driven generation.
    const permissions = [
        {
            id: 1,
            name: 'staff.vendors.view',
            display_name: 'View Vendors',
            group: 'vendors',
            operational: true,
        },
        ...(enabled
            ? [
                  {
                      id: 2,
                      name: 'staff.payments.view',
                      display_name: 'View Payments',
                      group: 'payments',
                      operational: true,
                  },
              ]
            : []),
    ];
    runtime.setPage({ props: { features: { payments: { enabled } }, errors } });
    const previousWindow = globalThis.window;
    globalThis.window = { localStorage: { getItem: () => JSON.stringify({ language }) } };
    try {
        return renderToStaticMarkup(
            createElement(
                runtime.LanguageProvider,
                null,
                createElement(runtime.StaffRoleForm, {
                    permissions,
                    editing: editing
                        ? {
                              id: 3,
                              name: 'mixed',
                              display_name: 'Mixed',
                              permission_ids: [1, 2],
                              legacy_permissions: enabled
                                  ? ['payments.view', 'documents.view']
                                  : ['documents.view'],
                          }
                        : null,
                    onDone() {},
                })
            )
        );
    } finally {
        if (previousWindow === undefined) delete globalThis.window;
        else globalThis.window = previousWindow;
    }
}

for (const language of ['en', 'id']) {
    test(`create/edit role form renders only editable catalogue and localized payment controls (${language})`, () => {
        for (const editing of [false, true]) {
            const disabled = render(false, language, editing);
            assert.ok(!disabled.includes('staff.payments.view'));
            assert.ok(!disabled.includes('payments.view'));
            assert.ok(disabled.includes('staff.vendors.view'));
            assert.deepEqual(runtime.getFormData().permission_ids, editing ? [1] : []);
            assert.match(disabled, /<form[^>]*noValidate=""/);
            const enabled = render(true, language, editing);
            assert.ok(enabled.includes('staff.payments.view'));
            assert.ok(enabled.includes(language === 'id' ? 'Pembayaran' : 'Payments'));
            assert.deepEqual(runtime.getFormData().permission_ids, editing ? [1, 2] : []);
            if (editing) assert.ok(enabled.includes('payments.view, documents.view'));
        }
    });
    test(`permission errors appear once beside permission selection (${language})`, () => {
        const message =
            language === 'id'
                ? 'Izin pembayaran tidak dapat diubah saat modul pembayaran dinonaktifkan.'
                : 'Payment permissions cannot be changed while the payments module is disabled.';
        const html = render(false, language, true, {
            permission_ids: message,
            display_name: 'Invalid role name',
        });
        assert.equal(html.split(message).length - 1, 1);
        assert.equal(html.split('Invalid role name').length - 1, 1);
        assert.match(html, /aria-invalid="true" aria-describedby="role-permission-errors"/);
        assert.match(html, /id="role-permission-errors"><div role="alert"/);
    });
}
