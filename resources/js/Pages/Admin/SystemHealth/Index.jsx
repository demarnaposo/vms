import { DisabledButton } from '@/Components/DisabledActionTooltip';
import { useState } from 'react';
import { router } from '@inertiajs/react';
import {
    AdminLayout,
    Badge,
    Button,
    Card,
    DataTable,
    FormSelect,
    PageHeader,
    StatCard,
} from '@/Components';
// Translate static system-health labels and pagination controls.
import { useLanguage } from '@/Contexts/LanguageContext';

const formatPaginationLabel = (label) =>
    String(label || '')
        // Decode Laravel pagination entities for exact translation keys.
        .replace(/&laquo;/g, '\u00AB')
        .replace(/&raquo;/g, '\u00BB')
        .replace(/<[^>]*>/g, '')
        .trim();

function formatDuration(durationMs) {
    if (durationMs === null || durationMs === undefined) return '-';
    if (durationMs < 1000) return `${durationMs} ms`;
    if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)} s`;

    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.round((durationMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
}

function mapJobStatus(status) {
    if (status === 'success') return 'success';
    if (status === 'failed') return 'error';
    if (status === 'running') return 'info';

    return 'warning';
}

export default function SystemHealthIndex({ jobs = {}, stats = {}, filters = {} }) {
    // Resolve fixed health-monitoring copy in the selected language.
    const { t } = useLanguage();
    const rows = jobs?.data ?? [];
    const [statusFilter, setStatusFilter] = useState(filters?.status || 'all');

    const onSubmitFilters = (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        router.get(
            '/admin/system-health',
            {
                status: statusFilter || 'all',
                search: formData.get('search') || '',
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            }
        );
    };

    const columns = [
        {
            header: 'Job',
            render: (row) => (
                <span className="font-mono text-xs text-(--color-text-primary)">
                    {row.job_name}
                </span>
            ),
        },
        {
            header: 'Status',
            align: 'center',
            render: (row) => <Badge status={mapJobStatus(row.status)}>{row.status}</Badge>,
        },
        {
            header: 'Started',
            render: (row) => (
                <span className="text-(--color-text-secondary)">{row.started_at || '-'}</span>
            ),
        },
        {
            header: 'Duration',
            align: 'center',
            render: (row) => (
                <span className="text-(--color-text-secondary)">
                    {formatDuration(row.duration_ms)}
                </span>
            ),
        },
        {
            header: 'Finished',
            render: (row) => (
                <span className="text-(--color-text-secondary)">{row.finished_at || '-'}</span>
            ),
        },
        {
            header: 'Error',
            render: (row) => (
                <span className="text-xs text-(--color-danger)">
                    {row.error_message ? String(row.error_message).slice(0, 80) : '-'}
                </span>
            ),
        },
    ];

    const header = (
        <PageHeader
            title="System Health"
            subtitle="Background jobs, failures, and execution visibility"
        />
    );

    return (
        <AdminLayout title="System Health" activeNav="System Health" header={header}>
            <div className="min-w-0 space-y-6">
                <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 [&>div]:min-w-0">
                    <StatCard label="Total Jobs" value={stats.total || 0} icon="jobs" />
                    <StatCard
                        label="Running"
                        value={stats.running || 0}
                        icon="running"
                        color="info"
                    />
                    <StatCard
                        label="Successful"
                        value={stats.success || 0}
                        icon="success"
                        color="success"
                    />
                    <StatCard
                        label="Failed"
                        value={stats.failed || 0}
                        icon="failed"
                        color="danger"
                    />
                </div>

                <Card title="Filters" allowOverflow>
                    <form
                        noValidate
                        onSubmit={onSubmitFilters}
                        className="p-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end"
                    >
                        <div className="min-w-0">
                            <FormSelect
                                size="field"
                                label="Status"
                                name="status"
                                value={statusFilter}
                                onChange={setStatusFilter}
                                className="mt-1 [&>button]:h-11"
                                options={[
                                    { value: 'all', label: 'All' },
                                    { value: 'running', label: 'Running' },
                                    { value: 'success', label: 'Success' },
                                    { value: 'failed', label: 'Failed' },
                                ]}
                            />
                        </div>

                        <label className="block min-w-0">
                            <span className="text-xs uppercase tracking-wide text-(--color-text-tertiary)">
                                {/* Translate the label without altering command values. */}
                                {t('Job Name')}
                            </span>
                            <input
                                type="text"
                                name="search"
                                defaultValue={filters?.search || ''}
                                placeholder="vendors:evaluate-compliance"
                                className="mt-1 h-11 w-full rounded-xl border-2 border-(--color-border-primary) bg-(--color-bg-primary) px-4 py-2 text-sm text-(--color-text-primary) placeholder:text-(--color-text-placeholder) transition-colors hover:border-(--color-border-secondary) focus:outline-none focus:border-(--color-brand-primary) focus:ring-4 focus:ring-(--color-brand-primary)/10"
                            />
                        </label>

                        <Button
                            type="submit"
                            className="h-11 min-w-[160px] justify-center rounded-xl px-6 text-sm font-semibold"
                        >
                            Apply
                        </Button>
                    </form>
                </Card>

                <div className="min-w-0 [&_table]:min-w-[760px] [&_table]:table-fixed [&_td]:[overflow-wrap:anywhere] [&_nav]:flex-wrap [&_nav]:gap-1 [&_nav_a]:min-h-9 [&_nav_a]:focus-visible:outline-2">
                    <DataTable columns={columns} data={rows} emptyMessage="No job logs found" />
                </div>

                {Array.isArray(jobs?.links) && jobs.links.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {jobs.links.map((link, index) => (
                            <DisabledButton
                                key={`${link.label}-${index}`}
                                type="button"
                                disabled={!link.url}
                                disabledReason={
                                    index === 0
                                        ? 'You are already on the first page.'
                                        : index === jobs.links.length - 1
                                          ? 'You are already on the last page.'
                                          : 'This pagination item is not a navigable page.'
                                }
                                onClick={() =>
                                    link.url &&
                                    router.visit(link.url, {
                                        preserveScroll: true,
                                        preserveState: true,
                                    })
                                }
                                className={`min-h-9 focus-visible:outline-2 focus-visible:outline-offset-2 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                                    link.active
                                        ? 'bg-(--color-brand-primary) text-white border-(--color-brand-primary)'
                                        : 'bg-(--color-bg-primary) text-(--color-text-secondary) border-(--color-border-primary) disabled:opacity-40'
                                }`}
                            >
                                {/* Translate pagination text while retaining page numbers. */}
                                {t(formatPaginationLabel(link.label))}
                            </DisabledButton>
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
