import { ActionButton, ActionLink } from '@/Components/ActionControls';
import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
    AdminLayout,
    PageHeader,
    Card,
    StatCard,
    Badge,
    DataTable,
    FormSelect,
} from '@/Components';
// Translate static vendor-summary filters and count frames.
import { useLanguage } from '@/Contexts/LanguageContext';

export default function VendorSummaryReport({ vendors, stats, filters }) {
    // Resolve report-only static copy in the selected language.
    const { t } = useLanguage();
    const { auth } = usePage().props;
    const can = auth?.can || {};

    const [localFilters, setLocalFilters] = useState({
        status: filters.status || 'all',
        compliance: filters.compliance || 'all',
    });

    const handleFilter = () => {
        router.get('/admin/reports/vendor-summary', localFilters, { preserveState: true });
    };

    const handleExport = () => {
        const params = new URLSearchParams(localFilters).toString();
        window.location.href = `/admin/reports/export/vendor_summary?${params}`;
    };

    const statusOptions = [
        { value: 'all', label: 'All Statuses' },
        { value: 'draft', label: 'Draft' },
        { value: 'submitted', label: 'Submitted' },
        { value: 'under_review', label: 'Under Review' },
        { value: 'approved', label: 'Approved' },
        { value: 'active', label: 'Active' },
        { value: 'suspended', label: 'Suspended' },
    ];

    const complianceOptions = [
        { value: 'all', label: 'All Compliance' },
        { value: 'compliant', label: 'Compliant' },
        { value: 'non_compliant', label: 'Non-Compliant' },
        { value: 'pending', label: 'Pending' },
    ];

    const getStatusBadge = (status) => {
        const variants = {
            draft: 'default',
            submitted: 'warning',
            under_review: 'info',
            approved: 'success',
            active: 'success',
            suspended: 'danger',
        };
        return <Badge variant={variants[status] || 'default'}>{status.replaceAll('_', ' ')}</Badge>;
    };

    const getComplianceBadge = (status) => {
        const variants = {
            compliant: 'success',
            non_compliant: 'danger',
            pending: 'warning',
        };
        return <Badge variant={variants[status] || 'default'}>{status.replaceAll('_', ' ')}</Badge>;
    };

    const columns = [
        { key: 'vendor_number', label: 'Vendor ID', render: (row) => row.vendor_number || '-' },
        { key: 'company_name', label: 'Company', render: (row) => row.company_name },
        { key: 'contact_person', label: 'Contact', render: (row) => row.contact_person || '-' },
        { key: 'status', label: 'Status', render: (row) => getStatusBadge(row.status) },
        {
            key: 'compliance_status',
            label: 'Compliance',
            render: (row) => getComplianceBadge(row.compliance_status),
        },
        {
            key: 'compliance_score',
            label: 'Comp. Score',
            render: (row) => `${row.compliance_score || 0}%`,
        },
        {
            key: 'performance_score',
            label: 'Perf. Score',
            render: (row) => `${row.performance_score || 0}%`,
        },
    ];

    const header = (
        <PageHeader
            title="Vendor Summary Report"
            subtitle="Overview of all vendors by status and compliance"
            actions={
                <ActionLink
                    variant="outline"
                    href="/admin/reports"
                    className="min-h-9 justify-center whitespace-normal"
                >
                    {t('Back to Reports')}
                </ActionLink>
            }
        />
    );

    return (
        <AdminLayout title="Vendor Summary Report" activeNav="Reports" header={header}>
            <div className="min-w-0 space-y-6">
                {/* Summary Stats */}
                <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 [&>div]:min-w-0 [&>div]:[overflow-wrap:anywhere]">
                    <StatCard
                        label="Total Vendors"
                        value={stats.total}
                        icon="vendors"
                        color="primary"
                    />
                    <StatCard label="Active" value={stats.active} icon="success" color="success" />
                    <StatCard
                        label="Compliant"
                        value={stats.compliant}
                        icon="compliance"
                        color="info"
                    />
                    <StatCard
                        label="Avg Performance"
                        value={`${stats.avg_performance_score}%`}
                        icon="trend"
                        color="warning"
                    />
                </div>

                {/* Filters */}
                <Card title="Filters" allowOverflow>
                    <div className="flex min-w-0 flex-col items-stretch gap-4 xl:flex-row xl:flex-wrap xl:items-end">
                        <div className="min-w-0 flex-1 xl:min-w-[150px]">
                            <FormSelect
                                label="Status"
                                value={localFilters.status}
                                onChange={(val) =>
                                    setLocalFilters({ ...localFilters, status: val })
                                }
                                options={statusOptions}
                            />
                        </div>
                        <div className="min-w-0 flex-1 xl:min-w-[150px]">
                            <FormSelect
                                label="Compliance"
                                value={localFilters.compliance}
                                onChange={(val) =>
                                    setLocalFilters({ ...localFilters, compliance: val })
                                }
                                options={complianceOptions}
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <ActionButton
                                variant="outline"
                                onClick={handleFilter}
                                className="min-h-9 justify-center whitespace-normal"
                            >
                                Apply Filters
                            </ActionButton>
                            {can['reports.export'] && (
                                <ActionButton
                                    variant="primary"
                                    onClick={handleExport}
                                    className="min-h-9 justify-center whitespace-normal"
                                >
                                    Export CSV
                                </ActionButton>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Data Table */}
                {/* Translate the vendor count frame while retaining its numeric value. */}
                <Card
                    title={t('Vendors (:count shown)', {
                        count: vendors?.data?.length || 0,
                    })}
                >
                    <div className="min-w-0 [&_table]:min-w-[760px] [&_table]:table-fixed [&_td]:[overflow-wrap:anywhere] [&_nav]:flex-wrap [&_nav]:gap-1 [&_nav_a]:min-h-9 [&_nav_a]:focus-visible:outline-2">
                        <DataTable
                            columns={columns}
                            data={vendors?.data || []}
                            links={vendors?.links || []}
                            emptyMessage="No vendors found for the selected filters."
                        />
                    </div>
                </Card>
            </div>
        </AdminLayout>
    );
}
