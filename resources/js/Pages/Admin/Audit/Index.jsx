import { AdminLayout, PageHeader, DataTable, Badge, Card } from '@/Components';
import { formatDateTime } from '@/utils/dateFormatters';
// Translate known audit codes while preserving user-entered audit content.
import { useLanguage } from '@/Contexts/LanguageContext';
import {
    translateAuditDescription,
    translateAuditEntity,
    translateAuditEvent,
} from '@/i18n/auditLabels';

export default function AuditIndex({ logs = {} }) {
    // Use the selected locale for fixed labels and recorded timestamps.
    const { language, t } = useLanguage();
    const dateLocale = language === 'id' ? 'id-ID' : 'en-IN';
    const columns = [
        {
            header: 'Time',
            render: (row) => (
                <span className="text-(--color-text-secondary) text-sm">
                    {/* Format audit timestamps without changing stored values. */}
                    {formatDateTime(row.created_at, dateLocale)}
                </span>
            ),
        },
        {
            header: 'User',
            render: (row) => (
                <span className="text-(--color-text-primary) font-medium">
                    {/* Keep real user names raw and translate only the system fallback. */}
                    {row.user?.name || t('System')}
                </span>
            ),
        },
        {
            header: 'Event',
            // Translate only whitelisted system events; preserve custom codes.
            render: (row) => (
                <Badge status={row.event_type || 'info'} translateLabel={false}>
                    {row.event ? translateAuditEvent(language, row.event) : t('Action')}
                </Badge>
            ),
        },
        {
            header: 'Entity',
            render: (row) => (
                <span className="text-(--color-text-secondary) capitalize">
                    {/* Localize only recognized model class labels. */}
                    {translateAuditEntity(language, row.auditable_type)}
                </span>
            ),
        },
        {
            header: 'Description',
            render: (row) => (
                <span className="text-(--color-text-secondary) text-sm">
                    {/* Localize VMS descriptions while preserving staff-entered reasons. */}
                    {row.reason || row.description
                        ? translateAuditDescription(language, row.reason || row.description)
                        : t('No details')}
                </span>
            ),
        },
        {
            header: 'IP',
            render: (row) => (
                <span className="text-(--color-text-tertiary) font-mono text-xs">
                    {row.ip_address || '-'}
                </span>
            ),
        },
    ];

    const header = <PageHeader title="Audit Logs" subtitle="System activity and change history" />;

    return (
        <AdminLayout title="Audit Logs" activeNav="Audit Logs" header={header}>
            <Card className="min-w-0">
                <div className="min-w-0 [&_table]:min-w-[760px] [&_table]:table-fixed [&_td]:[overflow-wrap:anywhere] [&_nav]:flex-wrap [&_nav]:gap-1 [&_nav_a]:min-h-9 [&_nav_a]:focus-visible:outline-2">
                    <DataTable
                        columns={columns}
                        data={logs?.data || []}
                        links={logs?.links || []}
                        emptyMessage="No audit logs recorded"
                        stickyHeader={true}
                    />
                </div>
            </Card>
        </AdminLayout>
    );
}
