import { ActionLink } from '@/Components/ActionControls';
import { AdminLayout, Badge, Card, DataTable, PageHeader, StatCard, StatGrid } from '@/Components';
// Translate fixed performance detail copy while retaining vendor and metric data.
import { useLanguage } from '@/Contexts/LanguageContext';
// Localize recognized performance master metric labels.
import { translateSystemMasterDataField } from '@/i18n/systemMasterData';

export default function PerformanceShow({ vendor, breakdown = [], history = [] }) {
    // Keep the company name outside translation lookup.
    const { language, t } = useLanguage();
    const currentScore = Number(vendor?.performance_score || 0);
    const averageMetricScore =
        breakdown.length > 0
            ? Math.round(
                  breakdown.reduce(
                      (total, metric) =>
                          total +
                          ((Number(metric.current_score || 0) /
                              Math.max(1, Number(metric.max_score || 1))) *
                              100 || 0),
                      0
                  ) / breakdown.length
              )
            : 0;

    const columns = [
        {
            header: 'Metric',
            render: (row) => (
                <span className="font-medium text-(--color-text-primary)">
                    {/* Translate fixed metric labels and retain custom names. */}
                    {translateSystemMasterDataField(
                        language,
                        'performance_metrics',
                        row.metric,
                        'display_name',
                        row.metric_name
                    )}
                </span>
            ),
        },
        {
            header: 'Weight',
            align: 'center',
            render: (row) => (
                <span className="text-(--color-text-secondary)">
                    {new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US').format(
                        Number(row.weight)
                    )}
                    %
                </span>
            ),
        },
        {
            header: 'Current',
            align: 'center',
            render: (row) => (
                <span className="font-semibold text-(--color-text-primary)">
                    {row.current_score == null
                        ? t('Not rated')
                        : `${row.current_score}/${row.max_score}`}
                </span>
            ),
        },
        {
            header: 'Average',
            align: 'center',
            render: (row) => (
                <span className="text-(--color-text-secondary)">
                    {row.average_score ?? t('Not rated')}
                </span>
            ),
        },
        {
            header: 'History Count',
            align: 'center',
            render: (row) => (
                <span className="text-(--color-text-secondary)">{row.score_count}</span>
            ),
        },
    ];

    // Localize the heading around the original company name.
    const header = (
        <PageHeader
            title={
                <>
                    <span className="[overflow-wrap:anywhere]">
                        {language === 'id' ? `${t('Performance')} ` : ''}
                        {vendor?.company_name || t('Vendor')}
                        {language === 'id' ? '' : ` ${t('Performance')}`}
                    </span>
                </>
            }
            subtitle="Detailed metric breakdown and monthly trend"
            actions={
                <div className="flex w-full flex-wrap items-center gap-2 [&>a]:flex-1 sm:[&>a]:flex-none">
                    <ActionLink
                        href={`/admin/performance/${vendor?.id}/rate`}
                        variant="primary"
                        className="min-h-9 justify-center whitespace-normal"
                    >
                        {/* Translate the fixed rating action. */}
                        {t('Add Rating')}
                    </ActionLink>
                    <ActionLink
                        href="/admin/performance"
                        variant="outline"
                        className="min-h-9 justify-center whitespace-normal"
                    >
                        {/* Translate the fixed back action. */}
                        {t('Back')}
                    </ActionLink>
                </div>
            }
        />
    );

    return (
        <AdminLayout title="Vendor Performance" activeNav="Performance" header={header}>
            <div className="min-w-0 space-y-6">
                <StatGrid cols={4}>
                    <StatCard
                        label="Current Score"
                        value={currentScore}
                        icon="score"
                        color="primary"
                    />
                    <StatCard
                        label="Metric Average"
                        value={averageMetricScore}
                        icon="average"
                        color="info"
                    />
                    <StatCard
                        label="Active Metrics"
                        value={breakdown.length}
                        icon="metrics"
                        color="success"
                    />
                    <StatCard
                        label="Trend Points"
                        value={history.length}
                        icon="trend"
                        color="warning"
                    />
                </StatGrid>

                <Card title="Compliance Status">
                    <div className="p-4">
                        {/* Translate only the fixed compliance-status enum label. */}
                        <Badge status={vendor?.compliance_status || 'info'}>
                            {vendor?.compliance_status
                                ? t(vendor.compliance_status.replaceAll('_', ' '))
                                : t('Unknown')}
                        </Badge>
                    </div>
                </Card>

                <Card
                    title="Metric Breakdown"
                    className="min-w-0 [&_table]:min-w-[640px] [&_table]:table-fixed [&_td]:[overflow-wrap:anywhere]"
                >
                    <DataTable
                        columns={columns}
                        data={breakdown}
                        emptyMessage="No performance scores yet"
                    />
                </Card>

                <Card title="Monthly Trend">
                    <div className="min-w-0 space-y-3">
                        {history.length === 0 && (
                            <p className="text-(--color-text-tertiary)">
                                {/* Translate the fixed empty history message. */}
                                {t('No monthly history available.')}
                            </p>
                        )}

                        {history.map((entry) => (
                            <div
                                key={entry.month}
                                className="rounded-lg border border-(--color-border-primary) p-3 flex min-w-0 flex-wrap items-center justify-between gap-3 [&>div]:[overflow-wrap:anywhere]"
                            >
                                <div>
                                    <div className="font-medium text-(--color-text-primary)">
                                        {entry.month}
                                    </div>
                                    <div className="text-xs text-(--color-text-tertiary)">
                                        {/* Localize the fixed count label, not the recorded scores. */}
                                        {t('Metrics recorded: :count', {
                                            count: entry.scores?.length || 0,
                                        })}
                                    </div>
                                </div>
                                <div className="text-lg font-bold text-(--color-text-primary)">
                                    {entry.average}/100
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </AdminLayout>
    );
}
