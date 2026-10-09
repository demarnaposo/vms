import { router, useForm } from '@inertiajs/react';
import { useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AdminLayout, Badge, Button, Card, DataTable, Modal, PageHeader } from '@/Components';
import { ActionButton } from '@/Components/ActionControls';
import { useLanguage } from '@/Contexts/LanguageContext';
import { translateSystemMasterDataField } from '@/i18n/systemMasterData';
import { percentageUnits } from '@/utils/performanceWeights';

const fields = [
    ['name', 'Metric Code', 'text', 'e.g., service_quality'],
    ['display_name', 'Metric Name', 'text', 'e.g., Service Quality'],
    ['weight', 'Weight (%)', 'number', 'e.g., 25.00'],
];
const rowData = (metric) => ({
    id: metric.id ?? null,
    name: metric.name || '',
    display_name: metric.display_name || '',
    description: metric.description || '',
    weight: String(metric.weight ?? '1.00'),
    max_score: metric.max_score ?? 4,
    is_active: metric.is_active ?? true,
    deleted: false,
});
const focusClass = 'focus-visible:ring-2 focus-visible:ring-(--color-brand-primary)';

export default function PerformanceMetricIndex({
    metrics = { data: [], links: [] },
    configuration = [],
    version = '',
    filters = {},
}) {
    const { language, t } = useLanguage();
    const form = useForm({ version, metrics: configuration.map(rowData) });
    const search = useForm({ search: filters.search || '' });
    const id = useId();
    const [open, setOpen] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const formRef = useRef(null);
    const modalRef = useRef(null);
    const number = new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US', {
        maximumFractionDigits: 2,
    });
    const label = (metric, field = 'display_name') =>
        translateSystemMasterDataField(language, 'performance_metrics', metric, field);
    const reset = () => {
        form.setData({ version, metrics: configuration.map(rowData) });
        form.clearErrors();
    };
    const edit = () => {
        if (form.processing) return;
        reset();
        setOpen(true);
    };
    const change = (index, field, value) => {
        form.setData(
            'metrics',
            form.data.metrics.map((row, i) => (i === index ? { ...row, [field]: value } : row))
        );
    };
    const busy = form.processing || search.processing;
    const total = form.data.metrics.reduce(
        (sum, row) => sum + (row.is_active && !row.deleted ? percentageUnits(row.weight) : 0),
        0
    );
    useEffect(() => {
        if (!open) return;
        formRef.current?.querySelector('input:not(:disabled)')?.focus();
    }, [open]);
    useEffect(() => {
        if (!deleting) return;
        const dialog = modalRef.current?.closest('[role="dialog"]');
        if (!dialog) return;
        dialog.setAttribute('aria-label', t('Delete Performance Metric'));
        const previousFocus = document.activeElement;
        const controls = [...dialog.querySelectorAll('button:not(:disabled), [tabindex="0"]')];
        controls[0]?.focus();
        const trap = (event) => {
            if (event.key !== 'Tab') return;
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
            }
        };
        dialog.addEventListener('keydown', trap);
        return () => {
            dialog.removeEventListener('keydown', trap);
            if (previousFocus?.isConnected) previousFocus.focus();
        };
    }, [deleting, t]);
    const error = (key) =>
        form.errors[key] ? (
            <p
                id={`${id}-${key}-error`}
                role="alert"
                className="mt-1 text-sm text-(--color-danger)"
            >
                {form.errors[key]}
            </p>
        ) : null;
    const columns = [
        {
            header: 'Metric Name',
            render: (metric) => (
                <div className="max-w-xs wrap-anywhere">
                    <span className="font-medium">{label(metric)}</span>
                    <p className="text-xs text-(--color-text-tertiary)">
                        {label(metric, 'description')}
                    </p>
                </div>
            ),
        },
        {
            header: 'Metric Code',
            render: (metric) => (
                <span translate="no" className="font-mono text-xs break-all">
                    {metric.name}
                </span>
            ),
        },
        { header: 'Weight (%)', render: (metric) => `${number.format(Number(metric.weight))}%` },
        { header: 'Maximum Score', key: 'max_score' },
        {
            header: 'Status',
            render: (metric) => (
                <Badge status={metric.is_active ? 'active' : 'secondary'}>
                    {t(metric.is_active ? 'Active' : 'Inactive')}
                </Badge>
            ),
        },
        { header: 'History Count', key: 'scores_count' },
        {
            header: 'Actions',
            align: 'right',
            render: (metric) => (
                <div className="flex flex-wrap justify-end gap-2">
                    <ActionButton
                        disabled={busy}
                        disabledReason="A request is in progress. Please wait."
                        onClick={edit}
                    >
                        Edit
                    </ActionButton>
                    <ActionButton
                        variant="danger"
                        disabled={
                            busy || metric.protected || metric.referenced || metric.scores_count > 0
                        }
                        disabledReason={
                            busy
                                ? 'A request is in progress. Please wait.'
                                : metric.protected
                                  ? 'Built-in metrics cannot be deleted. Deactivate this metric instead.'
                                  : 'Rated metrics cannot be deleted. Deactivate this metric instead.'
                        }
                        onClick={() => {
                            reset();
                            setOpen(true);
                            setDeleting(metric.id);
                        }}
                    >
                        Delete
                    </ActionButton>
                </div>
            ),
        },
    ];
    return (
        <AdminLayout
            title="Performance Metrics"
            activeNav="Performance Metrics"
            header={
                <PageHeader
                    title="Performance Metrics"
                    subtitle="Manage metrics used to rate vendor performance."
                />
            }
        >
            <div className="min-w-0 space-y-6">
                <Card title="Performance Configuration">
                    <p className="mb-3 text-sm wrap-anywhere">
                        {t('Adjust all active weights together. The final total must be 100%.')}
                    </p>
                    <p className="mb-4 text-sm">{t('Maximum score is 4. Minimum score is 1.')}</p>
                    {!open ? (
                        <Button
                            onClick={edit}
                            disabled={busy}
                            disabledReason="A request is in progress. Please wait."
                        >
                            Edit Configuration
                        </Button>
                    ) : (
                        <form
                            ref={formRef}
                            noValidate
                            className="space-y-5"
                            onSubmit={(event) => {
                                event.preventDefault();
                                if (busy) return;
                                form.put('/admin/performance-metrics/configuration', {
                                    preserveScroll: true,
                                    onSuccess: () => setOpen(false),
                                    onError: (errors) => {
                                        toast.error(t('Please check the highlighted fields.'));
                                        const key = Object.keys(errors)[0];
                                        const control = document.getElementById(`${id}-${key}`);
                                        if (control && !control.disabled) control.focus();
                                        else
                                            formRef.current
                                                ?.querySelector(
                                                    '[aria-invalid="true"]:not(:disabled)'
                                                )
                                                ?.focus();
                                    },
                                });
                            }}
                        >
                            <div
                                id={`${id}-configuration`}
                                tabIndex={-1}
                                aria-describedby={
                                    form.errors.configuration
                                        ? `${id}-configuration-error`
                                        : undefined
                                }
                                role="status"
                                aria-live="polite"
                                className="rounded-xl bg-(--color-bg-secondary) p-4 text-sm tabular-nums"
                            >
                                <p>
                                    {t('Active total: :total%', {
                                        total: number.format(total / 100),
                                    })}
                                </p>
                                <p>
                                    {t(total > 10000 ? 'Excess: :total%' : 'Remaining: :total%', {
                                        total: number.format(Math.abs(10000 - total) / 100),
                                    })}
                                </p>
                            </div>
                            {error('configuration')}
                            {error('version')}
                            {error('metrics')}
                            {form.data.metrics.map((row, index) => {
                                const original = configuration.find(
                                    (metric) => metric.id === row.id
                                );
                                return (
                                    <fieldset
                                        key={row.id ?? `new-${index}`}
                                        className="min-w-0 rounded-xl border border-(--color-border-secondary) p-4"
                                    >
                                        <legend className="max-w-full px-2 text-sm font-semibold wrap-anywhere">
                                            {index + 1}. {label(row) || t('Add Performance Metric')}
                                        </legend>
                                        {row.deleted ? (
                                            <div className="flex flex-wrap items-center gap-3">
                                                <span>{t('Pending deletion')}</span>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    disabled={busy}
                                                    disabledReason="A request is in progress. Please wait."
                                                    onClick={() => change(index, 'deleted', false)}
                                                >
                                                    Undo Deletion
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    {fields.map(
                                                        ([key, title, type, placeholder]) => {
                                                            const path = `metrics.${index}.${key}`;
                                                            return (
                                                                <div key={key} className="min-w-0">
                                                                    <label
                                                                        htmlFor={`${id}-${path}`}
                                                                        className="mb-2 block text-sm font-medium"
                                                                    >
                                                                        {t(title)}{' '}
                                                                        <span
                                                                            aria-hidden="true"
                                                                            className="text-(--color-danger)"
                                                                        >
                                                                            *
                                                                        </span>
                                                                    </label>
                                                                    <input
                                                                        id={`${id}-${path}`}
                                                                        name={path}
                                                                        spellCheck={key !== 'name'}
                                                                        autoComplete="off"
                                                                        type={type}
                                                                        step={
                                                                            type === 'number'
                                                                                ? '0.01'
                                                                                : undefined
                                                                        }
                                                                        value={
                                                                            key === 'display_name'
                                                                                ? label(row)
                                                                                : row[key]
                                                                        }
                                                                        onChange={(event) =>
                                                                            change(
                                                                                index,
                                                                                key,
                                                                                event.target.value
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            busy ||
                                                                            (key === 'name' &&
                                                                                !!row.id)
                                                                        }
                                                                        placeholder={t(placeholder)}
                                                                        className={`input-field w-full ${focusClass}`}
                                                                        aria-invalid={
                                                                            !!form.errors[path]
                                                                        }
                                                                        aria-describedby={
                                                                            form.errors[path]
                                                                                ? `${id}-${path}-error`
                                                                                : undefined
                                                                        }
                                                                    />
                                                                    {error(path)}
                                                                </div>
                                                            );
                                                        }
                                                    )}
                                                    <div>
                                                        <span className="mb-2 block text-sm font-medium">
                                                            {t('Maximum Score')}
                                                        </span>
                                                        <span className="text-sm">
                                                            {row.max_score}
                                                        </span>
                                                        {error(`metrics.${index}.max_score`)}
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label
                                                            htmlFor={`${id}-metrics.${index}.description`}
                                                            className="mb-2 block text-sm font-medium"
                                                        >
                                                            {t('Description')}
                                                        </label>
                                                        <textarea
                                                            id={`${id}-metrics.${index}.description`}
                                                            name={`metrics.${index}.description`}
                                                            value={label(row, 'description')}
                                                            onChange={(event) =>
                                                                change(
                                                                    index,
                                                                    'description',
                                                                    event.target.value
                                                                )
                                                            }
                                                            disabled={busy}
                                                            className={`input-field w-full ${focusClass}`}
                                                            placeholder={t(
                                                                'e.g., Quality of services delivered'
                                                            )}
                                                            aria-invalid={
                                                                !!form.errors[
                                                                    `metrics.${index}.description`
                                                                ]
                                                            }
                                                            aria-describedby={
                                                                form.errors[
                                                                    `metrics.${index}.description`
                                                                ]
                                                                    ? `${id}-metrics.${index}.description-error`
                                                                    : undefined
                                                            }
                                                        />
                                                        {error(`metrics.${index}.description`)}
                                                    </div>
                                                </div>
                                                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                                    <label className="flex items-center gap-2">
                                                        <input
                                                            id={`${id}-metrics.${index}.is_active`}
                                                            name={`metrics.${index}.is_active`}
                                                            type="checkbox"
                                                            checked={row.is_active}
                                                            onChange={(event) =>
                                                                change(
                                                                    index,
                                                                    'is_active',
                                                                    event.target.checked
                                                                )
                                                            }
                                                            disabled={busy}
                                                            aria-invalid={
                                                                !!form.errors[
                                                                    `metrics.${index}.is_active`
                                                                ]
                                                            }
                                                            aria-describedby={
                                                                form.errors[
                                                                    `metrics.${index}.is_active`
                                                                ]
                                                                    ? `${id}-metrics.${index}.is_active-error`
                                                                    : undefined
                                                            }
                                                            className={`h-5 w-5 accent-(--color-brand-primary) ${focusClass}`}
                                                        />
                                                        {t('Active')}
                                                    </label>
                                                    <ActionButton
                                                        variant="danger"
                                                        disabled={
                                                            busy ||
                                                            original?.protected ||
                                                            original?.referenced ||
                                                            original?.scores_count > 0
                                                        }
                                                        disabledReason={
                                                            busy
                                                                ? 'A request is in progress. Please wait.'
                                                                : original?.protected
                                                                  ? 'Built-in metrics cannot be deleted. Deactivate this metric instead.'
                                                                  : 'Rated metrics cannot be deleted. Deactivate this metric instead.'
                                                        }
                                                        onClick={() =>
                                                            setDeleting(row.id ?? `new-${index}`)
                                                        }
                                                    >
                                                        Stage Deletion
                                                    </ActionButton>
                                                </div>
                                                {error(`metrics.${index}.is_active`)}
                                            </>
                                        )}
                                        {error(`metrics.${index}.deleted`)}
                                        {error(`metrics.${index}.id`)}
                                    </fieldset>
                                );
                            })}
                            <div className="flex flex-wrap justify-between gap-3 border-t border-(--color-border-secondary) pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={busy}
                                    disabledReason="A request is in progress. Please wait."
                                    onClick={() =>
                                        form.setData('metrics', [...form.data.metrics, rowData({})])
                                    }
                                >
                                    Add Performance Metric
                                </Button>
                                <div className="flex flex-wrap gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={busy}
                                        disabledReason="A request is in progress. Please wait."
                                        onClick={() => {
                                            reset();
                                            setOpen(false);
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={busy}
                                        disabledReason="A request is in progress. Please wait."
                                    >
                                        {form.processing ? 'Saving…' : 'Save Configuration'}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    )}
                </Card>
                <Card title="Performance Metrics" noPadding>
                    <form
                        noValidate
                        className="flex flex-wrap items-start gap-3 p-5"
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (!busy)
                                search.get('/admin/performance-metrics', {
                                    preserveState: true,
                                    preserveScroll: true,
                                });
                        }}
                    >
                        <div className="min-w-0 flex-1 basis-48">
                            <label className="sr-only" htmlFor={`${id}-search`}>
                                {t('Search Performance Metrics')}
                            </label>
                            <input
                                id={`${id}-search`}
                                name="search"
                                value={search.data.search}
                                onChange={(event) => search.setData('search', event.target.value)}
                                disabled={busy}
                                placeholder={t('Search by name or description…')}
                                className={`input-field w-full ${focusClass}`}
                                aria-invalid={!!search.errors.search}
                                aria-describedby={
                                    search.errors.search ? `${id}-search-error` : undefined
                                }
                            />
                            {search.errors.search ? (
                                <p
                                    id={`${id}-search-error`}
                                    role="alert"
                                    className="mt-1 text-sm text-(--color-danger)"
                                >
                                    {search.errors.search}
                                </p>
                            ) : null}
                        </div>
                        <Button
                            type="submit"
                            variant="outline"
                            disabled={busy}
                            disabledReason="A request is in progress. Please wait."
                        >
                            {search.processing ? 'Searching…' : 'Search'}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={busy}
                            disabledReason="A request is in progress. Please wait."
                            onClick={() => {
                                search.setData('search', '');
                                search.clearErrors();
                                router.get(
                                    '/admin/performance-metrics',
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
                        data={metrics.data}
                        links={metrics.links}
                        emptyMessage="No performance metrics found."
                    />
                </Card>
            </div>
            <Modal
                isOpen={deleting !== null}
                title="Delete Performance Metric"
                onClose={() => setDeleting(null)}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setDeleting(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => {
                                const index =
                                    typeof deleting === 'string'
                                        ? Number(deleting.slice(4))
                                        : form.data.metrics.findIndex((row) => row.id === deleting);
                                if (index >= 0) {
                                    const row = form.data.metrics[index];
                                    if (!row.id)
                                        form.setData(
                                            'metrics',
                                            form.data.metrics.filter((_, i) => i !== index)
                                        );
                                    else {
                                        const original = configuration.find(
                                            (metric) => metric.id === row.id
                                        );
                                        form.setData(
                                            'metrics',
                                            form.data.metrics.map((item, i) =>
                                                i === index
                                                    ? { ...rowData(original), deleted: true }
                                                    : item
                                            )
                                        );
                                    }
                                }
                                setDeleting(null);
                            }}
                        >
                            Stage Deletion
                        </Button>
                    </>
                }
            >
                <p ref={modalRef}>{t('Delete this metric when the configuration is saved?')}</p>
            </Modal>
        </AdminLayout>
    );
}
