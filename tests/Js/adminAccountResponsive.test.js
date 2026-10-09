import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';
const root = fileURLToPath(new URL('../../', import.meta.url));
const paths = { Profile: 'Profile/Edit', Notifications: 'Notifications/Index' };
const pages = Object.keys(paths);
let runtime;
before(async () => {
    const result = await build({
        stdin: {
            contents:
                pages
                    .map(
                        (p) =>
                            `export { default as ${p} } from './resources/js/Pages/${paths[p]}.jsx';`
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
                    builder.onLoad({ filter: /\/Profile\/Edit\.jsx$/ }, async ({ path }) => ({
                        contents: (await readFile(path, 'utf8'))
                            .replace(
                                "useState('profile')",
                                "useState(usePage().props.fixtureSection || 'profile')"
                            )
                            .replace(
                                'useState(false)',
                                'useState(usePage().props.fixtureModal || false)'
                            ),
                        loader: 'jsx',
                    }));
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

const manual = 'Fixture' + 'x'.repeat(180);
function render(page, language = 'id', options = {}) {
    runtime.setPage({
        url: page === 'Profile' ? '/profile' : '/notifications',
        props: {
            auth: {
                user: { name: manual, email: 'fixture@example.test', phone: '000000' },
                roles: [options.vendor ? 'vendor' : options.role || 'super_admin'],
                can: {},
            },
            features: { payments: { enabled: false } },
            errors: options.errors || {},
            fixtureSection: options.section,
            fixtureModal: options.modal,
            fixtureProcessing: options.pending,
        },
    });
    const previous = globalThis.window;
    globalThis.window = {
        location: new URL('http://fixture.test'),
        localStorage: { getItem: () => JSON.stringify({ language }) },
    };
    try {
        return renderToStaticMarkup(
            createElement(
                runtime.LanguageProvider,
                null,
                createElement(runtime[page], options.props || {})
            )
        );
    } finally {
        if (previous === undefined) delete globalThis.window;
        else globalThis.window = previous;
    }
}
for (const language of ['id', 'en']) {
    test('admin role variations retain admin presentation ' + language, () => {
        for (const role of ['super_admin', 'ops_manager', 'finance_manager']) {
            assert.ok(render('Profile', language, { role }).includes('noValidate=""'));
            assert.ok(
                render('Notifications', language, { role, props: { notifications: [] } }).includes(
                    'md:w-auto'
                )
            );
        }
    });

    test(
        'admin profile fields are linked, errors appear once and required markers stay red ' +
            language,
        () => {
            const html = render('Profile', language, {
                errors: { name: 'Fixture name error', email: 'Fixture email error' },
            });
            assert.ok(html.includes('noValidate=""'));
            assert.ok(!html.includes(' required=""'));
            assert.equal((html.match(/Fixture name error/g) || []).length, 1);
            assert.equal((html.match(/Fixture email error/g) || []).length, 1);
            assert.equal((html.match(/aria-invalid="true"/g) || []).length, 2);
            for (const id of [...html.matchAll(/aria-describedby="([^"]+-error)"/g)].map(
                (m) => m[1]
            ))
                assert.ok(html.includes('id="' + id + '"'));
            assert.equal(
                (html.match(/aria-hidden="true" class="text-\(--color-danger\)">\*/g) || []).length,
                2
            );
            assert.ok(html.includes(manual));
            assert.ok(html.includes('flex flex-wrap gap-2'));
            const tabMarkup = html.split('flex flex-wrap gap-2 min-w-0 mb-6')[1].split('</div>')[0];
            const tabs = [
                ...tabMarkup.matchAll(/<button\b[^>]*aria-pressed="(?:true|false)"[^>]*>/g),
            ].filter(([tag]) => /sidebar-main-item/.test(tag));
            assert.equal(tabs.length, 3);
            assert.match(tabMarkup, /--gradient-primary:var\(--gradient-danger\)/);
            assert.equal(tabs.filter(([tag]) => tag.includes('aria-pressed="true"')).length, 1);
            for (const [tag] of tabs) {
                assert.ok(tag.includes('type="button"'));
                assert.match(tag, /sidebar-main-item/);
            }
            assert.match(tabs.find(([tag]) => tag.includes('aria-pressed="true"'))[0], /ring-2/);
            assert.doesNotMatch(tabMarkup, /underline/);
        }
    );
    test(
        'password confirmation errors, visibility controls and pending native disabled remain available ' +
            language,
        () => {
            const html = render('Profile', language, {
                section: 'password',
                pending: true,
                errors: { password_confirmation: 'Fixture confirmation error' },
            });
            assert.equal((html.match(/Fixture confirmation error/g) || []).length, 1);
            assert.equal((html.match(/type="password"/g) || []).length, 3);
            assert.equal(
                (html.match(/aria-label="(?:Show password|Tampilkan kata sandi)"/g) || []).length,
                3
            );
            assert.ok(/<button\b(?=[^>]*type="submit")(?=[^>]*disabled="")[^>]*>/.test(html));
            assert.ok(html.includes('data-disabled-trigger'));
            assert.ok(
                html.includes(
                    language === 'id' ? 'Permintaan sedang diproses' : 'A request is in progress'
                )
            );
        }
    );
    test(
        'account dialog remains disabled without password and contains responsive footer ' +
            language,
        () => {
            const html = render('Profile', language, { section: 'danger', modal: true });
            assert.ok(html.includes('role="dialog"'));
            assert.ok(html.includes('max-h-[calc(100dvh-2rem)]'));
            assert.ok(html.includes('flex-col'));
            assert.ok(html.includes('data-disabled-trigger'));
            assert.ok(html.includes('aria-describedby='));
        }
    );
    test(
        'notification content, unread actions, count and pagination links remain intact ' +
            language,
        () => {
            const html = render('Notifications', language, {
                props: {
                    unreadCount: 7,
                    notifications: {
                        data: [
                            {
                                id: 'fixture-one',
                                data: { title: manual, message: manual },
                                created_at: '2026-10-07T00:00:00Z',
                                read_at: null,
                            },
                            {
                                id: 'fixture-two',
                                data: { title: 'Read fixture', message: 'Manual note' },
                                created_at: '2026-10-07T00:00:00Z',
                                read_at: '2026-10-07T01:00:00Z',
                            },
                        ],
                        links: [
                            { label: 'Previous', url: null },
                            { label: '1', url: '/notifications?page=1', active: true },
                            { label: '2', url: '/notifications?page=2' },
                            { label: 'Next', url: '/notifications?page=2' },
                        ],
                    },
                },
            });
            assert.equal((html.match(/>Tandai sudah dibaca<|>Mark read</g) || []).length, 1);
            assert.ok(html.includes('href="/notifications?page=2"'));
            assert.ok(html.includes(manual));
            assert.ok(html.includes('[overflow-wrap:anywhere]'));
            assert.ok(html.includes('sm:flex-row'));
            assert.ok(html.includes('whitespace-pre-line'));
        }
    );
    test(
        'empty notification list renders and vendor forms retain previous controls ' + language,
        () => {
            assert.ok(
                render('Notifications', language, { props: { notifications: [] } }).includes(
                    language === 'id' ? 'Tidak ada notifikasi' : 'No notifications'
                )
            );
            const vendor = render('Profile', language, { vendor: true });
            assert.ok(vendor.includes('required=""'));
            assert.ok(!vendor.includes('noValidate=""'));
            assert.ok(!vendor.includes('flex flex-wrap gap-2 mb-6'));
        }
    );
}
