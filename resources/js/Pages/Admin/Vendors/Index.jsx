import { ActionButton, ActionLink } from '@/Components/ActionControls';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { AdminLayout, PageHeader, DataTable, Badge, AppIcon } from '@/Components';
// Translate vendor filters while retaining backend status values.
import { useLanguage } from '@/Contexts/LanguageContext';

export default function VendorsIndex({ vendors = {}, currentStatus = 'all', search = '' }) {
    // Resolve visible vendor filter labels from the shared dictionary.
    const { t } = useLanguage();
    const [searchQuery, setSearchQuery] = useState(search);

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(
            '/admin/vendors',
            { status: currentStatus, search: searchQuery },
            { preserveState: true }
        );
    };

    const columns = [
        {
            header: 'Vendor ID',
            render: (row) => row.vendor_number || '-',
        },
        {
            header: 'Company',
            render: (row) => (
                <div>
                    <div className="text-(--color-text-primary) font-medium">
                        {row.company_name}
                    </div>
                    <div className="text-sm text-(--color-text-tertiary)">{row.contact_email}</div>
                </div>
            ),
        },
        {
            header: 'Contact',
            render: (row) => (
                <span className="text-(--color-text-secondary)">{row.contact_person}</span>
            ),
        },
        { header: 'Status', render: (row) => <Badge status={row.status} /> },
        {
            header: 'Performance',
            align: 'center',
            render: (row) => (
                <span
                    className={`font-bold ${row.performance_score >= 70 ? 'text-(--color-success)' : row.performance_score >= 40 ? 'text-(--color-warning)' : 'text-(--color-danger)'}`}
                >
                    {row.performance_score || 0}
                </span>
            ),
        },
        { header: 'Compliance', render: (row) => <Badge status={row.compliance_status} /> },
        {
            header: 'Actions',
            align: 'right',
            render: (row) => (
                <ActionLink variant="outline" href={`/admin/vendors/${row.id}`}>
                    {t('View')}
                </ActionLink>
            ),
        },
    ];

    const statusFilters = [
        'all',
        'draft',
        'submitted',
        'under_review',
        'approved',
        'active',
        'suspended',
        'terminated',
        'rejected',
    ];

    const header = (
        <PageHeader
            title="Vendor Management"
            subtitle="Manage and review vendor applications"
            actions={
                <form onSubmit={handleSearch} className="flex min-w-0 max-w-full gap-2">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('Search vendors...')}
                        className="input-field h-9! w-52! min-w-0 px-3! py-[7px]! text-sm!"
                    />
                    <ActionButton
                        type="submit"
                        className="h-9 w-9 shrink-0 self-center justify-center px-0"
                        aria-label={t('Search')}
                        title={t('Search')}
                    >
                        <AppIcon name="search" className="h-4 w-4" />
                    </ActionButton>
                </form>
            }
        />
    );

    return (
        <AdminLayout title="Vendor Management" activeNav="Vendors" header={header}>
            <div className="space-y-6">
                <div className="inline-flex gap-2 p-1 bg-(--color-bg-tertiary) rounded-xl flex-wrap">
                    {statusFilters.map((status) => (
                        <Link
                            key={status}
                            href={`/admin/vendors?status=${status}${searchQuery ? `&search=${searchQuery}` : ''}`}
                            aria-current={currentStatus === status ? 'page' : undefined}
                            className={`staff-status-filter px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize focus-visible:ring-2 focus-visible:ring-(--color-brand-primary) focus-visible:ring-offset-2 ${
                                currentStatus === status
                                    ? 'theme-primary-action shadow-token-primary'
                                    : 'text-(--color-text-tertiary) hover:bg-(--color-bg-primary)'
                            }`}
                        >
                            {/* Translate status labels without changing filter query parameters. */}
                            {t(status.replaceAll('_', ' '))}
                        </Link>
                    ))}
                </div>

                <DataTable
                    columns={columns}
                    data={vendors?.data || []}
                    links={vendors?.links || []}
                    emptyMessage="No vendors found"
                    onRowClick={(row) => router.visit(`/admin/vendors/${row.id}`)}
                />
            </div>
        </AdminLayout>
    );
}
