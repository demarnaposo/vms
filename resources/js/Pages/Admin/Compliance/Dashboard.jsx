import { ActionButton, ActionLink } from '@/Components/ActionControls';
import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    AdminLayout,
    AppIcon,
    Badge,
    Card,
    Modal,
    ModalCancelButton,
    ModalPrimaryButton,
    PageHeader,
    StatCard,
    StatGrid,
} from '@/Components';
import { formatDateTime } from '@/utils/dateFormatters';
import { paymentsEnabled } from '@/utils/paymentModule';
// Translate compliance dashboard UI while preserving database result content.
import { useLanguage } from '@/Contexts/LanguageContext';
// Localize recognized compliance rule master records.
import { translateSystemMasterDataField } from '@/i18n/systemMasterData';
// Reuse automatic compliance-detail translations in recent failures.
import { translateComplianceDetails } from '@/i18n/complianceDetails';

export default function ComplianceDashboard({ stats, atRiskVendors, recentResults, rules }) {
    // Resolve only static dashboard labels through the shared language context.
    const { language, t } = useLanguage();
    const dateLocale = language === 'id' ? 'id-ID' : 'en-IN';
    const { auth, features } = usePage().props;
    const isPaymentsEnabled = paymentsEnabled(features);
    const can = auth?.can || {};
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const runEvaluation = () => {
        router.post(
            '/admin/compliance/evaluate-all',
            {},
            {
                onSuccess: () => setShowConfirmModal(false),
            }
        );
    };

    const header = (
        <PageHeader
            title="Compliance Dashboard"
            subtitle="Monitor vendor compliance status"
            actions={
                can.run_compliance && (
                    <ActionButton className="min-h-9" onClick={() => setShowConfirmModal(true)}>
                        Run Evaluation
                    </ActionButton>
                )
            }
        />
    );

    return (
        <AdminLayout title="Compliance Dashboard" activeNav="Compliance" header={header}>
            {/* Localize only dashboard labels and controls, not compliance data from the database. */}
            <div className="min-w-0 space-y-6">
                {/* Stats */}
                <StatGrid cols={4}>
                    <StatCard
                        label="Compliant"
                        value={stats?.compliant || 0}
                        icon="success"
                        color="success"
                    />
                    <StatCard
                        label="At Risk"
                        value={stats?.at_risk || 0}
                        icon="warning"
                        color="warning"
                    />
                    <StatCard
                        label="Non-Compliant"
                        value={stats?.non_compliant || 0}
                        icon="error"
                        color="danger"
                    />
                    <StatCard
                        label="Blocked"
                        value={stats?.blocked || 0}
                        icon="failed"
                        color="danger"
                    />
                </StatGrid>

                <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2 [&>div]:min-w-0">
                    {/* At Risk Vendors */}
                    <Card title="Vendors Needing Attention">
                        <div className="min-w-0 space-y-3 max-h-[400px] overflow-y-auto overscroll-contain">
                            {atRiskVendors && atRiskVendors.length > 0 ? (
                                atRiskVendors.map((vendor) => (
                                    <Link
                                        key={vendor.id}
                                        href={`/admin/vendors/${vendor.id}`}
                                        className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-(--color-bg-secondary) hover:bg-(--color-bg-tertiary) border border-(--color-border-secondary) transition-colors"
                                    >
                                        <div className="flex min-w-0 flex-1 items-center gap-3">
                                            <div className="shrink-0 w-10 h-10 rounded-xl bg-(--color-brand-primary-light) flex items-center justify-center">
                                                <AppIcon name="vendors" className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="min-w-0 [overflow-wrap:anywhere] text-(--color-text-primary) font-medium">
                                                    {vendor.company_name}
                                                </div>
                                                <div className="text-sm text-(--color-text-tertiary)">
                                                    {t('Score:')} {vendor.compliance_score}%
                                                </div>
                                            </div>
                                        </div>
                                        {/* Translate only the migration-backed compliance enum label. */}
                                        <Badge status={vendor.compliance_status} />
                                    </Link>
                                ))
                            ) : (
                                <div className="text-center text-(--color-text-tertiary) py-8">
                                    {t('All vendors are compliant!')}
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Recent Failures */}
                    <Card title="Recent Compliance Failures">
                        <div className="min-w-0 space-y-3 max-h-[400px] overflow-y-auto overscroll-contain">
                            {recentResults && recentResults.length > 0 ? (
                                recentResults.map((result) => (
                                    <div
                                        key={result.id}
                                        className="p-3 rounded-xl bg-(--color-bg-secondary) border border-(--color-border-secondary) border-l-4 border-l-(--color-danger)"
                                    >
                                        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                                            <div className="min-w-0 [overflow-wrap:anywhere] text-(--color-text-primary) font-medium">
                                                {result.vendor?.company_name}
                                            </div>
                                            <div className="text-xs text-(--color-text-muted)">
                                                {formatDateTime(result.evaluated_at, dateLocale)}
                                            </div>
                                        </div>
                                        <div className="[overflow-wrap:anywhere] text-sm text-(--color-danger) mt-1">
                                            {/* Translate system rules and preserve custom rules. */}
                                            {translateSystemMasterDataField(
                                                language,
                                                'compliance_rules',
                                                result.rule,
                                                'display_name',
                                                result.rule?.name
                                            )}
                                        </div>
                                        <div className="[overflow-wrap:anywhere] text-sm text-(--color-text-tertiary) mt-1">
                                            {/* Translate known system details and retain custom database text. */}
                                            {translateComplianceDetails(
                                                language,
                                                result.rule,
                                                result.details
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-(--color-text-tertiary) py-8">
                                    {t('No recent failures')}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Compliance Rules */}
                <Card
                    title="Compliance Rules"
                    className="min-w-0 [&>div:first-child]:flex-wrap [&>div:first-child]:gap-3"
                    action={
                        <ActionLink
                            href="/admin/compliance/rules"
                            variant="outline"
                            className="min-h-9 justify-center whitespace-normal"
                        >
                            {t('Manage Rules')}
                        </ActionLink>
                    }
                >
                    <div
                        className="min-w-0 overflow-x-auto overscroll-x-contain"
                        role="region"
                        aria-label={t('Compliance Rules')}
                        tabIndex={0}
                    >
                        <table className="w-full min-w-[640px] table-fixed [&_td]:[overflow-wrap:anywhere]">
                            <thead>
                                <tr className="border-b border-(--color-border-primary) bg-(--color-bg-secondary)">
                                    <th className="text-left p-4 text-xs font-semibold text-(--color-text-tertiary) uppercase tracking-wider">
                                        {t('Rule')}
                                    </th>
                                    <th className="text-left p-4 text-xs font-semibold text-(--color-text-tertiary) uppercase tracking-wider">
                                        {t('Severity')}
                                    </th>
                                    <th className="text-center p-4 text-xs font-semibold text-(--color-text-tertiary) uppercase tracking-wider">
                                        {t('Penalty')}
                                    </th>
                                    {isPaymentsEnabled && (
                                        <th className="text-center p-4 text-xs font-semibold text-(--color-text-tertiary) uppercase tracking-wider">
                                            {t('Blocks Payment')}
                                        </th>
                                    )}
                                    <th className="text-center p-4 text-xs font-semibold text-(--color-text-tertiary) uppercase tracking-wider">
                                        {t('Failures')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rules &&
                                    rules.map((rule) => (
                                        <tr
                                            key={rule.id}
                                            className="border-b border-(--color-border-secondary) hover:bg-(--color-bg-hover)"
                                        >
                                            <td className="p-4">
                                                <div className="min-w-0 [overflow-wrap:anywhere] text-(--color-text-primary) font-medium">
                                                    {/* Resolve the fixed rule label from its stable name. */}
                                                    {translateSystemMasterDataField(
                                                        language,
                                                        'compliance_rules',
                                                        rule,
                                                        'display_name',
                                                        rule.name
                                                    )}
                                                </div>
                                                <div className="text-xs text-(--color-text-tertiary)">
                                                    {/* Translate only master rule descriptions. */}
                                                    {translateSystemMasterDataField(
                                                        language,
                                                        'compliance_rules',
                                                        rule,
                                                        'description'
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {/* Translate only the migration-backed severity enum label. */}
                                                <Badge status={rule.severity} />
                                            </td>
                                            <td className="p-4 text-center text-(--color-text-primary) font-medium">
                                                {rule.penalty_points}
                                            </td>
                                            {isPaymentsEnabled && (
                                                <td className="p-4 text-center">
                                                    {rule.blocks_payment ? (
                                                        <span className="text-(--color-danger) font-medium">
                                                            {t('Yes')}
                                                        </span>
                                                    ) : (
                                                        <span className="text-(--color-text-muted)">
                                                            {t('No')}
                                                        </span>
                                                    )}
                                                </td>
                                            )}
                                            <td className="p-4 text-center text-(--color-text-primary) font-medium">
                                                {rule.failures_count || 0}
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Confirm Evaluation Modal */}
            <div className="[&_.glass-modal]:max-h-[calc(100vh-2rem)] [&_.glass-modal]:overflow-y-auto [&_.glass-modal]:overscroll-contain [&_.glass-modal]:p-4 sm:[&_.glass-modal]:p-6 [&_.glass-modal_h3]:break-words">
                <Modal
                    isOpen={showConfirmModal}
                    onClose={() => setShowConfirmModal(false)}
                    title="Run Compliance Evaluation"
                    footer={
                        <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end [&>button]:min-h-9 [&>button]:whitespace-normal [&>button]:focus-visible:outline-2 [&>button]:focus-visible:outline-(--color-brand-primary)">
                            <ModalCancelButton onClick={() => setShowConfirmModal(false)} />
                            <ModalPrimaryButton onClick={runEvaluation}>
                                Run Evaluation
                            </ModalPrimaryButton>
                        </div>
                    }
                >
                    <p className="text-(--color-text-secondary)">
                        {t(
                            'This will run compliance evaluation for all vendors. Are you sure you want to proceed?'
                        )}
                    </p>
                </Modal>
            </div>
        </AdminLayout>
    );
}
