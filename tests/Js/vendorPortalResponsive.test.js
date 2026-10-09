import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';
const root = fileURLToPath(new URL('../../', import.meta.url));
const pages = ['Dashboard', 'Profile', 'Documents', 'Compliance', 'Performance', 'Notifications'];
let runtime;
before(async () => {
    const result = await build({
        stdin: {
            contents:
                pages
                    .map(
                        (p) =>
                            `export { default as ${p} } from './resources/js/Pages/Vendor/${p}.jsx';`
                    )
                    .join('\n') +
                `export { LanguageProvider } from './resources/js/Contexts/LanguageContext.jsx'; export { setPage, getFormData } from '@inertiajs/react';`,
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
                name: 'vendor-fixtures',
                setup(builder) {
                    builder.onLoad(
                        { filter: /\/Vendor\/(Profile|Documents)\.jsx$/ },
                        async ({ path }) => {
                            let contents = await readFile(path, 'utf8');
                            if (path.endsWith('/Profile.jsx'))
                                contents = contents
                                    .replace(
                                        'useState(false)',
                                        'useState(globalThis.fixtureEditing || false)'
                                    )
                                    .replace(
                                        "useState('company')",
                                        "useState(globalThis.fixtureTab || 'company')"
                                    );
                            else
                                contents = contents
                                    .replace(
                                        'const [showUploadModal, setShowUploadModal] = useState(false)',
                                        'const [showUploadModal, setShowUploadModal] = useState(globalThis.fixtureModal || false)'
                                    )
                                    .replace(
                                        'const [selectedDocument, setSelectedDocument] = useState(null)',
                                        'const [selectedDocument, setSelectedDocument] = useState(globalThis.fixturePreview || null)'
                                    )
                                    .replace(
                                        'const [showViewer, setShowViewer] = useState(false)',
                                        'const [showViewer, setShowViewer] = useState(Boolean(globalThis.fixturePreview))'
                                    );
                            return { contents, loader: 'jsx' };
                        }
                    );
                    builder.onResolve({ filter: /^@inertiajs\/react$/ }, () => ({
                        path: 'inertia',
                        namespace: 'fixture',
                    }));
                    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
                        contents: `import { createElement } from 'react'; let page, data; export const setPage = value => page = value; export const getFormData = () => data; export const usePage = () => page; export const Head = () => null; export const router = {}; export const Link = ({ children, preserveScroll: _scroll, ...props }) => createElement('a', props, children); export const useForm = initial => { data = { ...initial, ...page.props.fixtureFormData }; return { data, errors: page.props.errors, processing: page.props.fixtureProcessing, setData() {} }; };`,
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
const long = 'ManualFixture' + 'x'.repeat(180);
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
    severity: 'high',
};
const vendor = {
    id: 9,
    status: 'active',
    company_name: long,
    vendor_number: 'FIXTURE-9',
    compliance_score: 80,
    performance_score: 75,
    contact_person: long,
    contact_email: 'fixture@example.test',
    address: long,
    experience: long,
};
const document = {
    id: 3,
    document_type_id: 6,
    document_type: { id: 6, name: 'custom_document', display_name: long, has_expiry: true },
    file_name: long + '.txt',
    verification_status: 'rejected',
    verification_notes: long,
    created_at: '2026-10-01',
};
function render(name, language, props = {}, options = {}) {
    runtime.setPage({
        url: '/vendor/' + name.toLowerCase(),
        props: {
            auth: {
                user: { name: 'Fixture', email: 'fixture@example.test' },
                roles: ['vendor'],
                can: {},
            },
            features: { payments: { enabled: options.payments || false } },
            errors: options.errors || {},
            fixtureProcessing: options.processing || false,
            fixtureFormData: options.formData || {},
        },
    });
    globalThis.fixtureTab = options.tab;
    globalThis.fixtureEditing = options.editing;
    globalThis.fixtureModal = options.modal;
    globalThis.fixturePreview = options.preview;
    const previous = globalThis.window;
    globalThis.window = {
        location: new URL('http://vms.test'),
        localStorage: { getItem: () => JSON.stringify({ language }) },
    };
    try {
        return renderToStaticMarkup(
            createElement(
                runtime.LanguageProvider,
                null,
                createElement(runtime[name], { vendor, ...props })
            )
        );
    } finally {
        if (previous === undefined) delete globalThis.window;
        else globalThis.window = previous;
    }
}
for (const language of ['id', 'en']) {
    test('dashboard lifecycle and payments (' + language + ')', () => {
        const draft = render('Dashboard', language, {
            vendor: { ...vendor, status: 'draft' },
            recentDocuments: [document],
        });
        assert.ok(draft.includes('href="/vendor/onboarding"'));
        assert.ok(draft.includes(long));
        const review = render('Dashboard', language, {
            vendor: { ...vendor, status: 'under_review' },
        });
        assert.ok(!review.includes('href="/vendor/payments"'));
        assert.ok(!render('Dashboard', language).includes('href="/vendor/payments"'));
        assert.ok(
            render('Dashboard', language, {}, { payments: true }).includes(
                'href="/vendor/payments"'
            )
        );
    });
    test('profile labels, errors, tabs and pending (' + language + ')', () => {
        const html = render(
            'Profile',
            language,
            {},
            {
                tab: 'contact',
                editing: true,
                processing: true,
                errors: {
                    contact_person: 'Fixture contact error',
                    state: 'Fixture province error',
                },
            }
        );
        for (const msg of ['Fixture contact error', 'Fixture province error'])
            assert.equal(html.split(msg).length - 1, 1);
        assert.ok(html.includes('for="profile-contact_person"'));
        assert.ok(html.includes('aria-describedby="profile-contact_person-error"'));
        assert.match(
            html,
            /<button[^>]*role="combobox"[^>]*aria-invalid="true"[^>]*aria-describedby="[^"]+-error"/
        );
        assert.match(html, /novalidate=""/i);
        assert.ok(!html.includes(' required=""'));
        assert.match(html, /<button(?=[^>]*type="submit")(?=[^>]*disabled="")[^>]*>/);
        assert.ok(html.includes('aria-pressed="true"'));
        for (const tab of ['company', 'bank', 'status'])
            assert.ok(render('Profile', language, {}, { tab }).length > 0);
        assert.ok(
            !render(
                'Profile',
                language,
                { vendor: { ...vendor, status: 'draft' } },
                { tab: 'contact' }
            ).includes(language === 'id' ? '>Ubah Profil</button>' : '>Edit Profile</button>')
        );
    });
    test('document upload errors, expiry and preview (' + language + ')', () => {
        const html = render(
            'Documents',
            language,
            { documents: [document], documentTypes: [document.document_type] },
            {
                modal: true,
                processing: true,
                formData: { document_type_id: 6, file: { name: long + '.pdf' } },
                errors: {
                    document_type_id: 'Fixture type error',
                    expiry_date: 'Fixture expiry error',
                    file: 'Fixture file error',
                },
            }
        );
        for (const msg of ['Fixture type error', 'Fixture expiry error', 'Fixture file error'])
            assert.equal(html.split(msg).length - 1, 1);
        assert.ok(!html.includes(' required=""'));
        assert.ok(html.includes('aria-describedby="document-expiry-hint document-expiry-error"'));
        assert.match(html, /text-\(--color-danger\)">\*<\/span>/);
        assert.ok(html.includes('href="/documents/3/download"'));
        assert.ok(html.includes(long));
        assert.ok(html.includes('max-h-[calc(100vh-2rem)]'));
        assert.ok(html.includes('disabled=""'));
        const preview = render('Documents', language, {}, { preview: document });
        assert.ok(preview.includes(long + '.txt'));
        assert.ok(preview.includes('href="/documents/3/view"'));
    });
    test('custom performance scores and compliance details (' + language + ')', () => {
        const performance = render('Performance', language, {
            metrics: [metric],
            performanceScores: [
                {
                    id: 8,
                    performance_metric_id: 4,
                    metric,
                    score: 75,
                    period_start: '2026-10-01',
                    period_end: '2026-10-07',
                },
            ],
        });
        assert.ok(performance.includes(long));
        assert.ok(performance.includes('75/100'));
        assert.ok(performance.includes('width:75%'));
        const compliance = render('Compliance', language, {
            rules: [rule],
            complianceResults: [{ compliance_rule_id: 5, status: 'fail', details: long }],
        });
        assert.ok(compliance.includes(long));
        assert.ok(compliance.includes(language === 'id' ? 'Gagal' : 'Failed'));
    });
    test(
        'notification content, read actions, payment links and pagination (' + language + ')',
        () => {
            const props = {
                unreadCount: 1,
                totalCount: 2,
                notifications: {
                    data: [
                        {
                            id: 'fixture',
                            data: {
                                type: 'system',
                                title: long,
                                message: long,
                                action_url: '/vendor/documents',
                                action_text: long,
                            },
                            created_at: '2026-10-01',
                        },
                        {
                            id: 'payment',
                            read_at: '2026-10-01',
                            data: {
                                type: 'payment',
                                action_url: '/vendor/payments',
                                title: 'Fixture payment',
                            },
                        },
                    ],
                    links: [
                        { label: 'Previous', url: null },
                        { label: '1', active: true, url: '/vendor/notifications?page=1' },
                        { label: '2', url: '/vendor/notifications?page=2&filter=unread' },
                        { label: 'Next', url: '/vendor/notifications?page=2&filter=unread' },
                    ],
                },
            };
            const html = render('Notifications', language, props);
            assert.ok(html.includes(long));
            assert.ok(html.includes(language === 'id' ? 'Tandai sudah dibaca' : 'Mark read'));
            assert.ok(html.includes('href="/vendor/documents"'));
            assert.ok(!html.includes('href="/vendor/payments"'));
            assert.ok(html.includes('page=2&amp;filter=unread'));
            assert.ok(
                render('Notifications', language, props, { payments: true }).includes(
                    'href="/vendor/payments"'
                )
            );
        }
    );
    test('empty data renders on all six menus (' + language + ')', () => {
        for (const name of pages) assert.ok(render(name, language).length > 0);
    });
}
