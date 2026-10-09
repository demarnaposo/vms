import { ActionLink } from '@/Components/ActionControls';
import { AdminLayout, PageHeader, Card, StatCard, StatGrid, Badge } from '@/Components';
// Translate static compliance detail labels without altering vendor or rule data.
import { useLanguage } from '@/Contexts/LanguageContext';
// Localize recognized compliance rule master labels.
import { translateSystemMasterDataField } from '@/i18n/systemMasterData';
// Reuse automatic compliance-detail translations in rule results.
import { translateComplianceDetails } from '@/i18n/complianceDetails';

export default function VendorComplianceDetail({ vendor, results, summary }) {
    // Keep the database company name outside translation lookup.
    // Read the selected language for compliance master data.
    const { language, t } = useLanguage();
    // Compose a localized heading around the original company name.
    const header = (
        <PageHeader
            title={
                <>
                    <span className="[overflow-wrap:anywhere]">
                        {t('Compliance Detail:')} {vendor?.company_name || t('Vendor')}
                    </span>
                </>
            }
            subtitle="Latest rule-wise compliance evaluation"
            actions={
                <ActionLink
                    href="/admin/compliance"
                    variant="outline"
                    className="min-h-9 justify-center whitespace-normal"
                >
                    {t('Back to Dashboard')}
                </ActionLink>
            }
        />
    );

    return (
        <AdminLayout title="Vendor Compliance Detail" activeNav="Compliance" header={header}>
            {/* Translate result headings and labels without changing stored result values. */}
            <div className="min-w-0 space-y-6">
                <StatGrid cols={4}>
                    <StatCard
                        label="Passing Rules"
                        value={summary?.passing || 0}
                        icon="success"
                        color="success"
                    />
                    <StatCard
                        label="Failing Rules"
                        value={summary?.failing || 0}
                        icon="error"
                        color="danger"
                    />
                    <StatCard
                        label="Warnings"
                        value={summary?.warnings || 0}
                        icon="warning"
                        color="warning"
                    />
                    <StatCard
                        label="Compliance Score"
                        value={`${vendor?.compliance_score ?? 0}%`}
                        icon="metrics"
                        color="info"
                    />
                </StatGrid>

                <Card title="Vendor Status">
                    <div className="grid min-w-0 grid-cols-1 md:grid-cols-3 gap-4 text-sm [&>div]:min-w-0">
                        <div>
                            <div className="text-(--color-text-tertiary)">{t('Company')}</div>
                            <div className="min-w-0 [overflow-wrap:anywhere] text-(--color-text-primary) font-medium">
                                {vendor?.company_name}
                            </div>
                        </div>
                        <div>
                            <div className="text-(--color-text-tertiary)">
                                {t('Lifecycle Status')}
                            </div>
                            <div className="mt-1">
                                {/* Localize the lifecycle enum label only. */}
                                <Badge status={vendor?.status} />
                            </div>
                        </div>
                        <div>
                            <div className="text-(--color-text-tertiary)">
                                {t('Compliance Status')}
                            </div>
                            <div className="mt-1">
                                {/* Localize the compliance enum label only. */}
                                <Badge status={vendor?.compliance_status} />
                            </div>
                        </div>
                    </div>
                </Card>

                <Card title="Rule Results">
                    <div
                        className="min-w-0 overflow-x-auto overscroll-x-contain"
                        role="region"
                        aria-label={t('Rule Results')}
                        tabIndex={0}
                    >
                        <table className="w-full min-w-[720px] table-fixed [&_td]:[overflow-wrap:anywhere]">
                            <thead>
                                <tr className="border-b border-(--color-border-primary) bg-(--color-bg-secondary)">
                                    <th className="text-left p-4 text-xs font-semibold text-(--color-text-tertiary) uppercase tracking-wider">
                                        {t('Rule')}
                                    </th>
                                    <th className="text-left p-4 text-xs font-semibold text-(--color-text-tertiary) uppercase tracking-wider">
                                        {t('Status')}
                                    </th>
                                    <th className="text-left p-4 text-xs font-semibold text-(--color-text-tertiary) uppercase tracking-wider">
                                        {t('Details')}
                                    </th>
                                    <th className="text-left p-4 text-xs font-semibold text-(--color-text-tertiary) uppercase tracking-wider">
                                        {t('Evaluated At')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {(results || []).map((result) => (
                                    <tr
                                        key={result.id}
                                        className="border-b border-(--color-border-secondary) hover:bg-(--color-bg-hover)"
                                    >
                                        <td className="p-4 text-(--color-text-primary) font-medium">
                                            {/* Translate system rules while preserving custom rule names. */}
                                            {translateSystemMasterDataField(
                                                language,
                                                'compliance_rules',
                                                result.rule,
                                                'display_name',
                                                result.rule?.name || t('Rule')
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {/* Localize the result enum label only. */}
                                            <Badge status={result.status} />
                                        </td>
                                        <td className="p-4 text-(--color-text-secondary)">
                                            {/* Translate known system details and retain custom database text. */}
                                            {translateComplianceDetails(
                                                language,
                                                result.rule,
                                                result.details
                                            ) || '-'}
                                        </td>
                                        <td className="p-4 text-(--color-text-tertiary)">
                                            {result.evaluated_at}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </AdminLayout>
    );
}
