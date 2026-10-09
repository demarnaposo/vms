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
            contents: `export { default as Vendor } from './resources/js/Pages/Admin/Vendors/Show.jsx';
                
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
                    builder.onLoad({ filter: /\/Vendors\/Show\.jsx$/ }, async ({ path }) => ({
                        contents: (await readFile(path, 'utf8'))
                            .replace(
                                "useState('overview')",
                                "useState(usePage().props.testTab || 'overview')"
                            )
                            .replace(
                                'const [showActionModal, setShowActionModal] = useState(null)',
                                'const [showActionModal, setShowActionModal] = useState(usePage().props.testAction || null)'
                            ),
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

const long = 'ManualVendor' + 'x'.repeat(180);
function render(
    language,
    status = 'active',
    can = {},
    tab = 'overview',
    action = null,
    empty = false,
    processing = false,
    readiness = { allowed: true, reasons: [], minimum_compliance_score: 80 }
) {
    runtime.setPage({
        url: '/admin/vendors/9',
        props: {
            auth: { user: { name: 'Fixture' }, roles: ['super_admin'], can },
            errors: {},
            testTab: tab,
            testAction: action,
            testProcessing: processing,
        },
    });
    const old = globalThis.window;
    globalThis.window = {
        location: new URL('http://vms.test'),
        localStorage: { getItem: () => JSON.stringify({ language }) },
    };
    const vendor = {
        id: 9,
        status,
        company_name: long,
        contact_email: 'fixture@example.test',
        contact_person: long,
        address: long,
        bank_name: long,
        documents: empty
            ? []
            : [
                  {
                      id: 3,
                      document_type: { name: 'custom_type', display_name: long },
                      verification_status: 'pending',
                      created_at: '2026-10-01',
                      expiry_date: null,
                  },
              ],
        compliance_results: empty
            ? []
            : [
                  {
                      id: 1,
                      status: 'fail',
                      rule: { name: 'manual_rule', display_name: long },
                      details: long,
                  },
              ],
        state_logs: empty
            ? []
            : [
                  {
                      id: 1,
                      from_status: 'draft',
                      to_status: 'submitted',
                      created_at: '2026-10-01',
                      user: { name: long },
                      comment: long,
                  },
              ],
    };
    try {
        return renderToStaticMarkup(
            createElement(
                runtime.LanguageProvider,
                null,
                createElement(runtime.Vendor, {
                    vendor,
                    activationReadiness: readiness,
                })
            )
        );
    } finally {
        if (old === undefined) delete globalThis.window;
        else globalThis.window = old;
    }
}
for (const language of ['id', 'en']) {
    test('long vendor data and responsive actions (' + language + ')', () => {
        const html = render(language, 'active', {
            suspend_vendors: true,
            terminate_vendors: true,
            rate_vendors: true,
        });
        assert.ok(html.includes(long));
        assert.ok(html.includes('[overflow-wrap:anywhere]'));
        assert.ok(!html.includes('max-w-[200px]'));
        assert.ok(!html.includes('-mx-8'));
        assert.match(html, /grid w-full grid-cols-2/);
        assert.ok(html.includes('href="/admin/vendors"'));
        assert.ok(html.includes('href="/admin/performance/9/rate"'));
    });
    test('tabs, documents and history remain accessible (' + language + ')', () => {
        const docs = render(language, 'active', { verify_documents: true }, 'documents');
        assert.match(docs, /overflow-x-auto overscroll-x-contain/);
        assert.match(docs, /role="region" aria-label="[^"]+" tabindex="0"/);
        assert.ok(docs.includes('min-w-[720px] table-fixed'));
        assert.ok(docs.includes('href="/documents/3/download"'));
        assert.ok(docs.includes(long));
        for (const tab of ['overview', 'documents', 'compliance', 'timeline', 'notes']) {
            const html = render(language, 'active', { edit_vendor_notes: true }, tab);
            assert.ok(html.includes('focus-visible:outline-2'));
            assert.ok(!html.includes('undefined'));
            assert.ok(
                render(language, 'active', { edit_vendor_notes: true }, tab, null, true).length > 0
            );
        }
    });
    test('authorization/status controls and confirmation UI preserved (' + language + ')', () => {
        const suspend = language === 'id' ? 'Tangguhkan' : 'Suspend';
        const terminate = language === 'id' ? 'Hentikan' : 'Terminate';
        const noAccess = render(language);
        assert.ok(!noAccess.includes('>' + suspend + '</button>'));
        assert.ok(!noAccess.includes('>' + terminate + '</button>'));
        const active = render(language, 'active', {
            suspend_vendors: true,
            terminate_vendors: true,
        });
        assert.ok(active.includes('>' + suspend + '</button>'));
        assert.ok(active.includes('>' + terminate + '</button>'));
        const suspended = render(language, 'suspended', {
            activate_vendors: true,
            terminate_vendors: true,
        });
        assert.ok(!suspended.includes('>' + suspend + '</button>'));
        const modal = render(language, 'active', { suspend_vendors: true }, 'overview', 'suspend');
        assert.match(modal, /role="dialog" aria-modal="true"/);
        assert.ok(modal.includes('max-h-[calc(100vh-2rem)]'));
        assert.ok(modal.includes('flex-col-reverse'));
        assert.ok(!modal.includes(' required=""'));
        assert.match(modal, /<span class="text-\(--color-danger\)">\*<\/span>/);
        assert.ok(
            render(
                language,
                'active',
                { suspend_vendors: true },
                'overview',
                'suspend',
                false,
                true
            ).includes('disabled=""')
        );
    });
}

for (const language of ['id', 'en']) {
    test(`activation tooltip follows backend reasons and pending (${language})`, () => {
        const readiness = {
            allowed: false,
            reasons: ['documents', 'flags'],
            minimum_compliance_score: 80,
        };
        const html = render(
            language,
            'approved',
            { activate_vendors: true },
            'overview',
            null,
            false,
            false,
            readiness
        );
        assert.match(html, /data-disabled-trigger=""/);
        assert.ok(
            html.includes(
                language === 'id'
                    ? 'Semua dokumen wajib harus terverifikasi'
                    : 'All mandatory documents must be verified'
            )
        );
        assert.ok(
            html.includes(
                language === 'id'
                    ? 'Selesaikan semua masalah kepatuhan'
                    : 'Resolve all open compliance issues'
            )
        );
        const pending = render(
            language,
            'approved',
            { activate_vendors: true },
            'overview',
            null,
            false,
            true,
            readiness
        );
        assert.ok(
            pending.includes(
                language === 'id' ? 'Permintaan sedang diproses.' : 'A request is in progress.'
            )
        );
        assert.ok(
            !pending.includes(
                language === 'id'
                    ? 'Semua dokumen wajib harus terverifikasi'
                    : 'All mandatory documents must be verified'
            )
        );
        const enabled = render(
            language,
            'approved',
            { activate_vendors: true },
            'overview',
            null,
            false,
            false
        );
        assert.doesNotMatch(enabled, /data-disabled-trigger=/);
        const hidden = render(language, 'approved', {}, 'overview', null, false, false, readiness);
        assert.doesNotMatch(hidden, /data-disabled-trigger=/);
    });
}
