import { VendorLayout, PageHeader, Card, Badge, AppIcon } from '@/Components';
// Translate vendor compliance UI while keeping stored rule data unchanged.
import { useLanguage } from '@/Contexts/LanguageContext';
// Localize fixed compliance master records for vendors.
import { translateSystemMasterDataField } from '@/i18n/systemMasterData';
// Translate only known automatic compliance-result details.
import { translateComplianceDetails } from '@/i18n/complianceDetails';

export default function Compliance({ vendor, complianceResults = [], rules = [] }) {
    // Resolve only static score, status, and guidance copy.
    // Read the selected language for compliance master data.
    const { language, t } = useLanguage();
    const complianceScore = vendor?.compliance_score || 0;
    const passedRules = complianceResults.filter((r) => r.status === 'pass').length;
    const failedRules = complianceResults.filter((r) => r.status === 'fail').length;
    const pendingRules = Math.max(0, rules.length - complianceResults.length);

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-(--color-success)';
        if (score >= 50) return 'text-(--color-warning)';
        return 'text-(--color-danger)';
    };

    // Translate the fixed compliance enum label without altering its stored value.
    const header = (
        <PageHeader
            title="Compliance"
            subtitle="View your compliance status and requirements"
            actions={<Badge status={vendor?.compliance_status || 'pending'} size="lg" />}
        />
    );

    return (
        <VendorLayout title="Compliance" activeNav="Compliance" header={header} vendor={vendor}>
            {/* Translate fixed score guidance and labels while leaving rule records verbatim. */}
            <div className="min-w-0 space-y-6">
                <div className="bg-(--color-bg-primary) border border-(--color-border-primary) rounded-2xl min-w-0 p-4 sm:p-6 lg:p-8 shadow-token-sm">
                    <div className="flex min-w-0 flex-col xl:flex-row items-center gap-6">
                        <div className="relative w-40 h-40 shrink-0">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    fill="none"
                                    stroke="var(--color-border-secondary)"
                                    strokeWidth="8"
                                />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    fill="none"
                                    stroke={
                                        complianceScore >= 80
                                            ? 'var(--color-success)'
                                            : complianceScore >= 50
                                              ? 'var(--color-warning)'
                                              : 'var(--color-danger)'
                                    }
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    strokeDasharray={`${complianceScore * 2.83} 283`}
                                    className="transition-all duration-1000"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span
                                    className={`text-4xl font-bold ${getScoreColor(complianceScore)}`}
                                >
                                    {complianceScore}%
                                </span>
                            </div>
                        </div>

                        <div className="min-w-0 flex-1 text-center xl:text-left">
                            <h2 className="text-2xl font-bold text-(--color-text-primary) mb-2">
                                {t('Compliance Score')}
                            </h2>
                            <p className="text-(--color-text-tertiary) mb-4">
                                {t(
                                    complianceScore >= 80
                                        ? 'Excellent. Your compliance is in good standing.'
                                        : complianceScore >= 50
                                          ? 'Needs attention. Please review failed requirements.'
                                          : 'Critical. Immediate action required.'
                                )}
                            </p>
                            <div className="flex flex-wrap justify-center xl:justify-start gap-3">
                                <div className="text-center px-4 py-2 bg-(--color-success-light) rounded-lg">
                                    <div className="text-2xl font-bold text-(--color-success)">
                                        {passedRules}
                                    </div>
                                    <div className="text-xs text-(--color-success-dark)">
                                        {t('Passed')}
                                    </div>
                                </div>
                                <div className="text-center px-4 py-2 bg-(--color-danger-light) rounded-lg">
                                    <div className="text-2xl font-bold text-(--color-danger)">
                                        {failedRules}
                                    </div>
                                    <div className="text-xs text-(--color-danger-dark)">
                                        {t('Failed')}
                                    </div>
                                </div>
                                <div className="text-center px-4 py-2 bg-(--color-bg-secondary) rounded-lg">
                                    <div className="text-2xl font-bold text-(--color-text-tertiary)">
                                        {pendingRules}
                                    </div>
                                    <div className="text-xs text-(--color-text-secondary)">
                                        {t('Pending')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <Card title="Compliance Requirements">
                    <div className="divide-y divide-(--color-border-secondary)">
                        {rules.length === 0 ? (
                            <div className="p-8 text-center text-(--color-text-tertiary)">
                                <div className="text-4xl mb-4 inline-flex justify-center w-full">
                                    <AppIcon name="compliance" className="h-10 w-10" />
                                </div>
                                <p>{t('No compliance rules defined yet.')}</p>
                            </div>
                        ) : (
                            rules.map((rule) => {
                                const result = complianceResults.find(
                                    (r) => r.compliance_rule_id === rule.id
                                );
                                const status = result?.status || 'pending';

                                return (
                                    <div
                                        key={rule.id}
                                        className="p-4 hover:bg-(--color-bg-hover) transition-colors"
                                    >
                                        <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3 sm:flex sm:items-start">
                                            <div
                                                className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                                                    status === 'pass'
                                                        ? 'bg-(--color-success-light) text-(--color-success)'
                                                        : status === 'fail'
                                                          ? 'bg-(--color-danger-light) text-(--color-danger)'
                                                          : 'bg-(--color-bg-tertiary) text-(--color-text-tertiary)'
                                                }`}
                                            >
                                                <AppIcon
                                                    name={
                                                        status === 'pass'
                                                            ? 'success'
                                                            : status === 'fail'
                                                              ? 'error'
                                                              : 'clock'
                                                    }
                                                    className="h-5 w-5"
                                                />
                                            </div>
                                            <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-(--color-text-primary)">
                                                        {/* Translate recognized system rule labels. */}
                                                        {translateSystemMasterDataField(
                                                            language,
                                                            'compliance_rules',
                                                            rule,
                                                            'display_name',
                                                            rule.name
                                                        )}
                                                    </h3>
                                                </div>
                                                <p className="text-sm text-(--color-text-tertiary) mt-1">
                                                    {/* Keep custom descriptions raw. */}
                                                    {translateSystemMasterDataField(
                                                        language,
                                                        'compliance_rules',
                                                        rule,
                                                        'description'
                                                    )}
                                                </p>
                                                {result?.details && (
                                                    <p
                                                        className={`text-sm mt-2 ${
                                                            status === 'fail'
                                                                ? 'text-(--color-danger)'
                                                                : 'text-(--color-text-muted)'
                                                        }`}
                                                    >
                                                        {/* Preserve custom details and localize verified system patterns. */}
                                                        {translateComplianceDetails(
                                                            language,
                                                            rule,
                                                            result.details
                                                        )}
                                                    </p>
                                                )}
                                            </div>
                                            <div
                                                className={`col-start-2 w-fit shrink-0 px-3 py-1 rounded-full text-xs font-medium ${
                                                    status === 'pass'
                                                        ? 'bg-(--color-success-light) text-(--color-success-dark)'
                                                        : status === 'fail'
                                                          ? 'bg-(--color-danger-light) text-(--color-danger-dark)'
                                                          : 'bg-(--color-bg-tertiary) text-(--color-text-tertiary)'
                                                }`}
                                            >
                                                {t(
                                                    status === 'pass'
                                                        ? 'Passed'
                                                        : status === 'fail'
                                                          ? 'Failed'
                                                          : 'Pending'
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </Card>

                {failedRules > 0 && (
                    <Card title="How to Improve">
                        <div className="min-w-0">
                            <div className="flex items-start gap-4 p-4 bg-(--color-warning-light) border border-(--color-warning) rounded-xl">
                                <span className="shrink-0 text-2xl inline-flex">
                                    <AppIcon name="info" className="h-6 w-6" />
                                </span>
                                <div>
                                    <h4 className="font-semibold text-(--color-warning-dark) mb-2">
                                        {t('Tips to improve your compliance score:')}
                                    </h4>
                                    <ul className="text-sm text-(--color-warning-dark) space-y-1 list-disc list-inside">
                                        <li>
                                            {t(
                                                'Ensure all mandatory documents are uploaded and verified'
                                            )}
                                        </li>
                                        <li>
                                            {t(
                                                // Guide vendors using Indonesian company documents.
                                                'Keep your Business Identification Number (NIB) and Taxpayer Identification Number (NPWP) documents up to date'
                                            )}
                                        </li>
                                        <li>{t('Maintain valid insurance coverage')}</li>
                                        <li>
                                            {t('Complete all required agreements and contracts')}
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}
            </div>
        </VendorLayout>
    );
}
