import { AdminLayout, PageHeader, DataTable, Badge, Card } from '@/Components';
import { formatDateTime } from '@/utils/dateFormatters';
// Start Update 13 September 2026, by @WNP: Translate known audit codes while preserving user-entered audit content.
import { useLanguage } from '@/Contexts/LanguageContext';
import { translateAuditEntity, translateAuditEvent } from '@/i18n/auditLabels';

export default function AuditIndex({ logs = {} }) {
    // Start Update 13 September 2026, by @WNP: Use the selected locale for fixed labels and recorded timestamps.
    const { language, t } = useLanguage();
    const dateLocale = language === 'id' ? 'id-ID' : 'en-IN';
    const columns = [
        {
            header: 'Time',
            render: (row) => (
                <span className="text-(--color-text-secondary) text-sm">
                    {/* Start Update 13 September 2026, by @WNP: Format audit timestamps without changing stored values. */}
                    {formatDateTime(row.created_at, dateLocale)}
                </span>
            ),
        },
        {
            header: 'User',
            render: (row) => (
                <span className="text-(--color-text-primary) font-medium">
                    {/* Start Update 13 September 2026, by @WNP: Keep real user names raw and translate only the system fallback. */}
                    {row.user?.name || t('System')}
                </span>
            ),
        },
        {
            header: 'Event',
            // Start Update 13 September 2026, by @WNP: Translate only whitelisted system events; preserve custom codes.
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
                    {/* Start Update 13 September 2026, by @WNP: Localize only recognized model class labels. */}
                    {translateAuditEntity(language, row.auditable_type)}
                </span>
            ),
        },
        {
            header: 'Description',
            render: (row) => (
                <span className="text-(--color-text-secondary) text-sm">
                    {/* Start Update 13 September 2026, by @WNP: Leave reasons and descriptions verbatim; translate only the empty fallback. */}
                    {row.reason || row.description || t('No details')}
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
            <Card className="overflow-hidden">
                <DataTable
                    columns={columns}
                    data={logs?.data || []}
                    links={logs?.links || []}
                    emptyMessage="No audit logs recorded"
                    stickyHeader={true}
                />
            </Card>
        </AdminLayout>
    );
}
