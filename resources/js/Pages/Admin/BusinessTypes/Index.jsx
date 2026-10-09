import { router, useForm } from '@inertiajs/react';
import { useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AdminLayout, Badge, Button, Card, DataTable, Modal, PageHeader } from '@/Components';
import { ActionButton } from '@/Components/ActionControls';
import { useLanguage } from '@/Contexts/LanguageContext';
import { businessTypeLabel } from '@/i18n/businessTypes';

const emptyType = { code: '', display_name: '', is_active: true };
const fields = [
    ['code', 'Business Type Code', 'e.g., cooperative'],
    ['display_name', 'Business Type Name', 'e.g., Cooperative'],
];
const focusClass =
    'focus-visible:ring-2 focus-visible:ring-(--color-brand-primary) focus-visible:ring-offset-2';

export default function BusinessTypeIndex({ types, filters = {} }) {
    const { language, t } = useLanguage();
    const form = useForm(emptyType);
    const search = useForm({ search: filters.search || '' });
    const id = useId();
    const formRef = useRef(null);
    const modalContentRef = useRef(null);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        if (!deleting) return;
        const dialog = modalContentRef.current?.closest('[role="dialog"]');
        if (!dialog) return;
        const previousFocus = document.activeElement;
        dialog.setAttribute('aria-label', t('Delete Business Type'));
        const controls = () => [
            ...dialog.querySelectorAll(
                'button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]'
            ),
        ];
        controls()[0]?.focus();
        const trapFocus = (event) => {
            if (event.key !== 'Tab') return;
            const targets = controls();
            const first = targets[0];
            const last = targets[targets.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
            }
        };
        dialog.addEventListener('keydown', trapFocus);
        return () => {
            dialog.removeEventListener('keydown', trapFocus);
            if (previousFocus?.isConnected) previousFocus.focus();
        };
    }, [deleting, t]);
    const numberFormatter = new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US');
    const clear = () => {
        setEditing(null);
        form.reset();
        form.clearErrors();
    };
    const edit = (type) => {
        if (form.processing || busy) return;
        setEditing(type);
        form.setData({
            code: type.code,
            display_name: type.display_name,
            is_active: type.is_active,
        });
        form.clearErrors();
        formRef.current?.scrollIntoView({ block: 'start' });
        formRef.current?.querySelector('[name="display_name"]')?.focus({ preventScroll: true });
    };
    const submit = (event) => {
        event.preventDefault();
        if (form.processing || busy) return;
        const options = {
            preserveScroll: true,
            onSuccess: clear,
            onError: (errors) => {
                toast.error(t('Please check the highlighted fields.'));
                const field = Object.keys(errors)[0];
                if (['code', 'display_name', 'is_active'].includes(field))
                    formRef.current?.querySelector(`[name="${field}"]`)?.focus();
            },
        };
        if (editing) form.put(`/admin/business-types/${editing.id}`, options);
        else form.post('/admin/business-types', options);
    };
    const remove = () => {
        if (!deleting || busy || form.processing) return;
        setBusy(true);
        router.delete(`/admin/business-types/${deleting.id}`, {
            preserveScroll: true,
            onSuccess: (page) => {
                if (page.props.flash?.success && editing?.id === deleting.id) clear();
                setDeleting(null);
            },
            onFinish: () => setBusy(false),
        });
    };
    const columns = [
        {
            header: 'Business Type Name',
            render: (type) => (
                <span className="block max-w-xs wrap-anywhere font-medium">
                    {businessTypeLabel(language, type)}
                </span>
            ),
        },
        {
            header: 'Business Type Code',
            render: (type) => (
                <span className="font-mono text-xs break-all" translate="no">
                    {type.code}
                </span>
            ),
        },
        {
            header: 'Status',
            render: (type) => (
                <Badge status={type.is_active ? 'active' : 'secondary'}>
                    {t(type.is_active ? 'Active' : 'Inactive')}
                </Badge>
            ),
        },
        {
            header: 'Vendors',
            align: 'center',
            render: (type) => (
                <span className="tabular-nums">{numberFormatter.format(type.vendors_count)}</span>
            ),
        },
        {
            header: 'Actions',
            align: 'right',
            render: (type) => (
                <div className="flex flex-wrap justify-end gap-2">
                    <ActionButton
                        disabledReason="A request is in progress. Please wait."
                        disabled={form.processing || busy}
                        onClick={() => edit(type)}
                        className={focusClass}
                    >
                        Edit
                    </ActionButton>
                    <ActionButton
                        disabledReason="A request is in progress. Please wait."
                        variant="danger"
                        disabled={form.processing || busy}
                        onClick={() => setDeleting(type)}
                        className={focusClass}
                    >
                        Delete
                    </ActionButton>
                </div>
            ),
        },
    ];
    return (
        <AdminLayout
            title="Business Types"
            activeNav="Business Types"
            header={
                <PageHeader
                    title="Business Types"
                    subtitle="Manage business types used during vendor registration."
                />
            }
        >
            <div className="min-w-0 space-y-6">
                <Card title={editing ? 'Edit Business Type' : 'Add Business Type'}>
                    <form
                        ref={formRef}
                        noValidate
                        onSubmit={submit}
                        className="grid scroll-mt-24 gap-4 md:grid-cols-2"
                    >
                        {fields.map(([field, label, placeholder]) => (
                            <div key={field} className="min-w-0">
                                <label
                                    htmlFor={`${id}-${field}`}
                                    className="mb-2 block text-sm font-medium"
                                >
                                    {t(label)}{' '}
                                    <span aria-hidden="true" className="text-(--color-danger)">
                                        *
                                    </span>
                                </label>
                                <input
                                    id={`${id}-${field}`}
                                    name={field}
                                    value={form.data[field]}
                                    onChange={(event) => form.setData(field, event.target.value)}
                                    disabled={
                                        form.processing || busy || (field === 'code' && !!editing)
                                    }
                                    aria-required="true"
                                    aria-invalid={!!form.errors[field]}
                                    aria-describedby={
                                        form.errors[field] ? `${id}-${field}-error` : undefined
                                    }
                                    autoComplete="off"
                                    spellCheck={field !== 'code'}
                                    placeholder={t(placeholder)}
                                    className={`input-field w-full min-w-0 disabled:cursor-not-allowed disabled:bg-(--color-bg-secondary) ${form.errors[field] ? '!border-(--color-danger)' : ''}`}
                                />
                                {form.errors[field] && (
                                    <p
                                        id={`${id}-${field}-error`}
                                        role="alert"
                                        className="mt-1 text-sm text-(--color-danger)"
                                    >
                                        {t(form.errors[field])}
                                    </p>
                                )}
                                {field === 'code' && editing && (
                                    <p className="mt-1 text-xs text-(--color-text-tertiary)">
                                        {t('Business type codes cannot be changed after creation.')}
                                    </p>
                                )}
                            </div>
                        ))}
                        <div className="md:col-span-2">
                            <label className="flex w-fit items-center gap-3">
                                <input
                                    name="is_active"
                                    type="checkbox"
                                    checked={form.data.is_active}
                                    disabled={form.processing || busy}
                                    onChange={(event) =>
                                        form.setData('is_active', event.target.checked)
                                    }
                                    aria-invalid={!!form.errors.is_active}
                                    aria-describedby={
                                        form.errors.is_active ? `${id}-active-error` : undefined
                                    }
                                    className="h-5 w-5 accent-(--color-brand-primary) focus-visible:ring-2"
                                />
                                {t('Active')}
                            </label>
                            {form.errors.is_active && (
                                <p
                                    id={`${id}-active-error`}
                                    role="alert"
                                    className="mt-1 text-sm text-(--color-danger)"
                                >
                                    {t(form.errors.is_active)}
                                </p>
                            )}
                        </div>
                        <div className="md:col-span-2 flex flex-wrap justify-end gap-3 border-t border-(--color-border-secondary) pt-4">
                            <Button
                                disabledReason="A request is in progress. Please wait."
                                type="button"
                                variant="outline"
                                disabled={form.processing || busy}
                                onClick={clear}
                                className={focusClass}
                            >
                                {editing ? 'Cancel' : 'Clear Form'}
                            </Button>
                            <Button
                                disabledReason="A request is in progress. Please wait."
                                type="submit"
                                disabled={form.processing || busy}
                                className={focusClass}
                            >
                                {form.processing
                                    ? 'Saving…'
                                    : editing
                                      ? 'Save Changes'
                                      : 'Add Business Type'}
                            </Button>
                        </div>
                    </form>
                </Card>
                <Card title="Business Types" noPadding>
                    <form
                        noValidate
                        className="flex flex-wrap items-start gap-3 p-5"
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (!search.processing && !form.processing && !busy)
                                search.get('/admin/business-types', {
                                    preserveState: true,
                                    preserveScroll: true,
                                });
                        }}
                    >
                        <div className="min-w-0 flex-1 basis-48">
                            <label className="sr-only" htmlFor={`${id}-search`}>
                                {t('Search Business Types')}
                            </label>
                            <input
                                id={`${id}-search`}
                                name="search"
                                disabled={search.processing || form.processing || busy}
                                value={search.data.search}
                                onChange={(event) => search.setData('search', event.target.value)}
                                placeholder={t('Search by name or code…')}
                                aria-invalid={!!search.errors.search}
                                aria-describedby={
                                    search.errors.search ? `${id}-search-error` : undefined
                                }
                                className="input-field w-full"
                            />
                            {search.errors.search && (
                                <p
                                    id={`${id}-search-error`}
                                    role="alert"
                                    className="mt-1 text-sm text-(--color-danger)"
                                >
                                    {t(search.errors.search)}
                                </p>
                            )}
                        </div>
                        <Button
                            disabledReason="A request is in progress. Please wait."
                            type="submit"
                            disabled={search.processing || form.processing || busy}
                        >
                            Search
                        </Button>
                        <Button
                            disabledReason="A request is in progress. Please wait."
                            type="button"
                            variant="outline"
                            disabled={search.processing || form.processing || busy}
                            onClick={() => {
                                search.setData('search', '');
                                router.get(
                                    '/admin/business-types',
                                    {},
                                    { preserveState: true, preserveScroll: true }
                                );
                            }}
                        >
                            Reset
                        </Button>
                    </form>
                    <DataTable
                        columns={columns}
                        data={types.data}
                        links={types.links}
                        emptyMessage="No business types found."
                    />
                </Card>
            </div>
            <Modal
                isOpen={!!deleting}
                onClose={() => {
                    if (!busy) setDeleting(null);
                }}
                title="Delete Business Type"
                footer={
                    <>
                        <Button
                            disabledReason="A request is in progress. Please wait."
                            variant="outline"
                            disabled={busy}
                            onClick={() => setDeleting(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            disabledReason="A request is in progress. Please wait."
                            variant="danger"
                            disabled={busy}
                            onClick={remove}
                        >
                            {busy ? 'Deleting…' : 'Delete Business Type'}
                        </Button>
                    </>
                }
            >
                <p ref={modalContentRef} className="text-sm wrap-anywhere">
                    {t('Delete this business type?')}{' '}
                    <strong>{deleting && businessTypeLabel(language, deleting)}</strong>
                </p>
                <p className="mt-3 text-sm text-(--color-text-tertiary)">
                    {t(
                        'Business types used by vendors, applications or history cannot be deleted. Deactivate them instead.'
                    )}
                </p>
            </Modal>
        </AdminLayout>
    );
}
