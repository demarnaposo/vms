import { Link } from '@inertiajs/react';
import { AdminLayout, PageHeader, Card, StatCard, StatGrid, Badge, Button } from '@/Components';
// Start Update 12 September 2026, by @WNP: Translate static compliance detail labels without altering vendor or rule data.
import { useLanguage } from '@/Contexts/LanguageContext';
// Start Update 15 September 2026, by @WNP: Localize recognized compliance rule master labels.
import { translateSystemMasterDataField } from '@/i18n/systemMasterData';
// Start Update 16 September 2026, by @WNP: Reuse automatic compliance-detail translations in rule results.
import { translateComplianceDetails } from '@/i18n/complianceDetails';

export default function VendorComplianceDetail({ vendor, results, summary }) {
    // Start Update 12 September 2026, by @WNP: Keep the database company name outside translation lookup.
    // Start Update 15 September 2026, by @WNP: Read the selected language for compliance master data.
    const { language, t } = useLanguage();
    // Start Update 12 September 2026, by @WNP: Compose a localized heading around the original company name.
    const header = (
        <PageHeader
            title={
                <>
                    {t('Compliance Detail:')} {vendor?.company_name || t('Vendor')}
                </>
            }
            subtitle="Latest rule-wise compliance evaluation"
            actions={
                <Link href="/admin/compliance">
                    <Button variant="outline">Back to Dashboard</Button>
                </Link>
            }
        />
    );

    return (
        <AdminLayout title="Vendor Compliance Detail" activeNav="Compliance" header={header}>
            {/* Start Update 12 September 2026, by @WNP: Translate result headings and labels without changing stored result values. */}
            <div className="space-y-8">
                <StatGrid>
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
                    <div className="p-4 grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <div className="text-(--color-text-tertiary)">{t('Company')}</div>
                            <div className="text-(--color-text-primary) font-medium">
                                {vendor?.company_name}
                            </div>
                        </div>
                        <div>
                            <div className="text-(--color-text-tertiary)">
                                {t('Lifecycle Status')}
                            </div>
                            <div className="mt-1">
                                {/* Start Update 13 September 2026, by @WNP: Localize the lifecycle enum label only. */}
                                <Badge status={vendor?.status} />
                            </div>
                        </div>
                        <div>
                            <div className="text-(--color-text-tertiary)">
                                {t('Compliance Status')}
                            </div>
                            <div className="mt-1">
                                {/* Start Update 13 September 2026, by @WNP: Localize the compliance enum label only. */}
                                <Badge status={vendor?.compliance_status} />
                            </div>
                        </div>
                    </div>
                </Card>

                <Card title="Rule Results">
                    <div className="overflow-x-auto">
                        <table className="w-full">
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
                                            {/* Start Update 15 September 2026, by @WNP: Translate system rules while preserving custom rule names. */}
                                            {translateSystemMasterDataField(
                                                language,
                                                'compliance_rules',
                                                result.rule,
                                                'display_name',
                                                result.rule?.name || t('Rule')
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {/* Start Update 13 September 2026, by @WNP: Localize the result enum label only. */}
                                            <Badge status={result.status} />
                                        </td>
                                        <td className="p-4 text-(--color-text-secondary)">
                                            {/* Start Update 16 September 2026, by @WNP: Translate known system details and retain custom database text. */}
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
