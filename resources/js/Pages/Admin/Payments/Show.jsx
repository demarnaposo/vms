import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    AdminLayout,
    PageHeader,
    Badge,
    Button,
    Card,
    Modal,
    ModalCancelButton,
    ModalPrimaryButton,
} from '@/Components';
// Start Update 11 September 2026, by @WNP: Reuse the centralized Indonesian currency formatter.
import { formatCurrency } from '@/utils/currencyFormatters';
import { formatDateTime } from '@/utils/dateFormatters';
// Start Update 13 September 2026, by @WNP: Localize fixed approval stage/action labels, not user names or comments.
import { useLanguage } from '@/Contexts/LanguageContext';
// Start Update 16 September 2026, by @WNP: Translate known payment-method values without changing stored references.
import { translatePaymentMethod } from '@/i18n/paymentMethods';

export default function PaymentsShow({ payment }) {
    // Start Update 13 September 2026, by @WNP: Reuse the selected UI language for payment approval enums.
    // Start Update 13 September 2026, by @WNP: Use the selected language for fixed labels and payment dates.
    const { language, t } = useLanguage();
    const dateLocale = language === 'id' ? 'id-ID' : 'en-IN';
    // Start Update 11 September 2026, by @WNP: Read the shared IDR settings supplied by Laravel.
    const { auth, currency } = usePage().props;
    const can = auth?.can || {};

    const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [actionRole, setActionRole] = useState(null);
    const [isApproving, setIsApproving] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [isMarkingPaid, setIsMarkingPaid] = useState(false);

    const [paymentRef, setPaymentRef] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');

    const handleApprove = (role) => {
        const route =
            role === 'ops'
                ? `/admin/payments/${payment.id}/validate-ops`
                : `/admin/payments/${payment.id}/approve-finance`;

        setIsApproving(true);
        router.post(
            route,
            { action: 'approve' },
            {
                onFinish: () => setIsApproving(false),
            }
        );
    };

    const handleReject = () => {
        const route =
            actionRole === 'ops'
                ? `/admin/payments/${payment.id}/validate-ops`
                : `/admin/payments/${payment.id}/approve-finance`;

        setIsRejecting(true);
        router.post(
            route,
            {
                action: 'reject',
                comment: rejectReason,
            },
            {
                onSuccess: () => {
                    setShowRejectModal(false);
                    setRejectReason('');
                },
                onFinish: () => setIsRejecting(false),
            }
        );
    };

    const handleMarkPaid = () => {
        setIsMarkingPaid(true);
        router.post(
            `/admin/payments/${payment.id}/mark-paid`,
            {
                payment_reference: paymentRef,
                payment_method: paymentMethod,
            },
            {
                onSuccess: () => setShowMarkPaidModal(false),
                onFinish: () => setIsMarkingPaid(false),
            }
        );
    };

    const openRejectModal = (role) => {
        setActionRole(role);
        setShowRejectModal(true);
    };

    const isOpsStage = ['requested', 'pending_ops'].includes(payment.status);
    const isFinanceStage = payment.status === 'pending_finance';
    const vendorIsCompliant = payment.vendor?.compliance_status === 'compliant';
    const isFinanceApprovalBlocked =
        isFinanceStage && Boolean(payment.is_compliance_blocked) && !vendorIsCompliant;
    const canValidateOps = isOpsStage && can.validate_payments;
    const canApproveFinance = isFinanceStage && can.approve_payments && !isFinanceApprovalBlocked;
    const canRejectFinance = isFinanceStage && can.approve_payments;
    const canMarkAsPaid = payment.status === 'approved' && can.mark_paid;

    const header = (
        <PageHeader
            title={
                <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-2">
                    {/* Start Update 13 September 2026, by @WNP: Translate the heading without touching the payment reference. */}
                    <span>{t('Payment')}</span>
                    <span className="max-w-full break-all rounded-lg bg-(--color-bg-secondary) px-2.5 py-1 text-sm font-semibold text-(--color-text-secondary)">
                        {payment.reference_number}
                    </span>
                </span>
            }
            subtitle="Payment request details"
            backLink="/admin/payments"
        />
    );

    // Start Update 13 September 2026, by @WNP: Keep the payment reference literal in the localized document title.
    return (
        <AdminLayout
            title={`${t('Payment')} ${payment.reference_number}`}
            activeNav="Payments"
            header={header}
        >
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="space-y-6 xl:col-span-2">
                    <Card>
                        <div className="p-6 space-y-6">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <h3 className="text-lg font-bold text-(--color-text-primary)">
                                    {/* Start Update 13 September 2026, by @WNP: Translate fixed request-section heading. */}
                                    {t('Request Details')}
                                </h3>
                                <Badge status={payment.status} />
                            </div>

                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div className="rounded-xl bg-(--color-bg-secondary) px-4 py-3">
                                    <label className="text-xs uppercase tracking-wide text-(--color-text-muted)">
                                        {/* Start Update 13 September 2026, by @WNP: Translate fixed field labels only. */}
                                        {t('Amount')}
                                    </label>
                                    <div className="mt-1 text-3xl font-bold tabular-nums text-(--color-text-primary)">
                                        {/* Start Update 11 September 2026, by @WNP: Format the payment detail value as IDR. */}
                                        {formatCurrency(payment.amount, currency)}
                                    </div>
                                </div>
                                <div className="rounded-xl bg-(--color-bg-secondary) px-4 py-3">
                                    <label className="text-xs uppercase tracking-wide text-(--color-text-muted)">
                                        {t('Invoice Number')}
                                    </label>
                                    <div className="mt-1 break-all text-base font-mono text-(--color-text-primary)">
                                        {payment.invoice_number || 'N/A'}
                                    </div>
                                </div>

                                <div className="md:col-span-2 rounded-xl bg-(--color-bg-secondary) px-4 py-3">
                                    <label className="text-xs uppercase tracking-wide text-(--color-text-muted)">
                                        {t('Description')}
                                    </label>
                                    <div className="mt-1 break-words text-(--color-text-primary)">
                                        {/* Start Update 13 September 2026, by @WNP: Preserve submitted description and translate only the fallback. */}
                                        {payment.description || t('No description provided.')}
                                    </div>
                                </div>

                                {payment.is_duplicate_flagged && (
                                    <div className="md:col-span-2 rounded-xl border border-(--color-warning) bg-(--color-warning-light) p-3 text-sm text-(--color-warning-dark)">
                                        {/* Start Update 13 September 2026, by @WNP: Translate the system duplicate warning only. */}
                                        {t(
                                            'Duplicate request pattern detected. Ops/Finance review is required before approval.'
                                        )}
                                    </div>
                                )}

                                {payment.paid_date && (
                                    <>
                                        <div className="rounded-xl bg-(--color-bg-secondary) px-4 py-3">
                                            <label className="text-xs uppercase tracking-wide text-(--color-text-muted)">
                                                {/* Start Update 13 September 2026, by @WNP: Translate fixed payment-detail labels. */}
                                                {t('Paid Date')}
                                            </label>
                                            <div className="mt-1 text-(--color-text-primary)">
                                                {formatDateTime(payment.paid_date, dateLocale)}
                                            </div>
                                        </div>
                                        <div className="rounded-xl bg-(--color-bg-secondary) px-4 py-3">
                                            <label className="text-xs uppercase tracking-wide text-(--color-text-muted)">
                                                {t('Payment Ref / Method')}
                                            </label>
                                            <div className="mt-1 break-all text-(--color-text-primary)">
                                                {payment.payment_reference || 'N/A'}{' '}
                                                <span className="text-(--color-text-tertiary)">
                                                    {/* Start Update 16 September 2026, by @WNP: Localize fixed methods and preserve custom database values. */}
                                                    (
                                                    {translatePaymentMethod(
                                                        language,
                                                        payment.payment_method,
                                                        'N/A'
                                                    )}
                                                    )
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </Card>

                    <Card title="Approvals & History">
                        <div className="p-6">
                            <div className="relative ml-2 border-l border-(--color-border-primary)">
                                <div className="relative pb-6 pl-7">
                                    <div className="absolute -left-[7px] top-1 h-3.5 w-3.5 rounded-full border-2 border-(--color-brand-primary) bg-(--color-bg-primary)" />
                                    <div className="mb-1 text-sm text-(--color-text-tertiary)">
                                        {/* Start Update 13 September 2026, by @WNP: Format system event dates in the selected locale. */}
                                        {formatDateTime(payment.created_at, dateLocale)}
                                    </div>
                                    <div className="font-medium text-(--color-text-primary)">
                                        {/* Start Update 13 September 2026, by @WNP: Translate the system event frame, not the requester's name. */}
                                        {t('Request Created by :name', {
                                            name: payment.requester?.name || t('Unknown'),
                                        })}
                                    </div>
                                </div>

                                {payment.approvals?.map((approval, index) => {
                                    const isLast = index === payment.approvals.length - 1;

                                    return (
                                        <div
                                            key={approval.id}
                                            className={`relative pl-7 ${isLast ? '' : 'pb-6'}`}
                                        >
                                            <div
                                                className={`absolute -left-[7px] top-1 h-3.5 w-3.5 rounded-full border-2 ${
                                                    approval.action === 'approved'
                                                        ? 'bg-(--color-success-light) border-(--color-success)'
                                                        : approval.action === 'rejected'
                                                          ? 'bg-(--color-danger-light) border-(--color-danger)'
                                                          : 'bg-(--color-bg-tertiary) border-(--color-border-hover)'
                                                }`}
                                            />
                                            <div className="mb-1 text-sm text-(--color-text-tertiary)">
                                                {formatDateTime(approval.updated_at, dateLocale)}
                                            </div>
                                            <div className="font-medium text-(--color-text-primary)">
                                                {/* Start Update 13 September 2026, by @WNP: Keep the stage code and free-text approver name unchanged. */}
                                                {t(
                                                    approval.stage === 'ops_validation'
                                                        ? 'Ops Validation'
                                                        : 'Finance Approval'
                                                )}
                                                {/* Start Update 13 September 2026, by @WNP: Keep the approver name verbatim. */}
                                                {approval.user && (
                                                    <>
                                                        {' '}
                                                        {t('by')} {approval.user.name}
                                                    </>
                                                )}
                                            </div>
                                            <div
                                                className={`mt-1 text-sm ${
                                                    approval.action === 'approved'
                                                        ? 'text-(--color-success)'
                                                        : approval.action === 'rejected'
                                                          ? 'text-(--color-danger)'
                                                          : 'text-(--color-text-tertiary)'
                                                }`}
                                            >
                                                {/* Start Update 13 September 2026, by @WNP: Localize only the approval-action enum label. */}
                                                {t(approval.action)}
                                            </div>
                                            {approval.comment && (
                                                <div className="mt-2 rounded bg-(--color-bg-tertiary) p-2 text-sm text-(--color-text-secondary)">
                                                    "{approval.comment}"
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
                    <Card title="Actions">
                        <div className="space-y-3 p-5">
                            {canValidateOps && (
                                <>
                                    <p className="mb-2 text-xs uppercase tracking-wide text-(--color-text-muted)">
                                        {/* Start Update 13 September 2026, by @WNP: Translate the fixed operations-stage hint. */}
                                        {t('Ops Validation Required')}
                                    </p>
                                    <Button
                                        variant="success"
                                        className="w-full justify-center py-2.5"
                                        disabled={isApproving || isRejecting || isMarkingPaid}
                                        onClick={() => handleApprove('ops')}
                                    >
                                        {isApproving ? 'Validating...' : 'Validate Request'}
                                    </Button>
                                    <Button
                                        variant="danger"
                                        className="w-full justify-center py-2.5"
                                        disabled={isApproving || isRejecting || isMarkingPaid}
                                        onClick={() => openRejectModal('ops')}
                                    >
                                        Reject Request
                                    </Button>
                                </>
                            )}

                            {canRejectFinance && (
                                <>
                                    <p className="mb-2 text-xs uppercase tracking-wide text-(--color-text-muted)">
                                        {/* Start Update 13 September 2026, by @WNP: Translate the fixed finance-stage hint. */}
                                        {t('Finance Approval Required')}
                                    </p>
                                    {isFinanceApprovalBlocked ? (
                                        <div className="rounded-lg border border-(--color-danger) bg-(--color-danger-light) p-2 text-center text-sm text-(--color-danger-dark)">
                                            {/* Start Update 13 September 2026, by @WNP: Translate the system compliance warning. */}
                                            {t('Approval blocked: vendor is non-compliant.')}
                                        </div>
                                    ) : (
                                        <Button
                                            variant="success"
                                            className="w-full justify-center py-2.5"
                                            disabled={isApproving || isRejecting || isMarkingPaid}
                                            onClick={() => handleApprove('finance')}
                                        >
                                            {isApproving ? 'Approving...' : 'Approve Payment'}
                                        </Button>
                                    )}
                                    <Button
                                        variant="danger"
                                        className="w-full justify-center py-2.5"
                                        disabled={isApproving || isRejecting || isMarkingPaid}
                                        onClick={() => openRejectModal('finance')}
                                    >
                                        Reject Payment
                                    </Button>
                                </>
                            )}

                            {canMarkAsPaid && (
                                <Button
                                    variant="primary"
                                    className="w-full justify-center py-2.5"
                                    disabled={isApproving || isRejecting || isMarkingPaid}
                                    onClick={() => setShowMarkPaidModal(true)}
                                >
                                    {isMarkingPaid ? 'Saving...' : 'Mark as Paid'}
                                </Button>
                            )}

                            {isOpsStage && !can.validate_payments && (
                                <div className="rounded-lg bg-(--color-bg-secondary) py-2 text-center text-(--color-text-tertiary)">
                                    {/* Start Update 13 September 2026, by @WNP: Translate the fixed workflow state. */}
                                    {t('Waiting for Ops Validation')}
                                </div>
                            )}
                            {isFinanceStage && !can.approve_payments && (
                                <div className="rounded-lg bg-(--color-bg-secondary) py-2 text-center text-(--color-text-tertiary)">
                                    {/* Start Update 13 September 2026, by @WNP: Translate the fixed workflow state. */}
                                    {t('Waiting for Finance Approval')}
                                </div>
                            )}
                            {payment.status === 'paid' && (
                                <div className="rounded-lg bg-(--color-success-light) py-2 text-center font-medium text-(--color-success-dark)">
                                    {/* Start Update 13 September 2026, by @WNP: Translate the fixed completion state. */}
                                    {t('Payment Completed')}
                                </div>
                            )}

                            {!canValidateOps &&
                                !canApproveFinance &&
                                !canRejectFinance &&
                                !canMarkAsPaid &&
                                payment.status !== 'paid' && (
                                    <>
                                        <div className="rounded-lg bg-(--color-bg-secondary) py-2 text-center text-(--color-text-tertiary)">
                                            {/* Start Update 13 September 2026, by @WNP: Translate the fixed permission hint. */}
                                            {t('No action available for your role.')}
                                        </div>
                                    </>
                                )}
                        </div>
                    </Card>

                    <Card title="Vendor Information">
                        <div className="space-y-4 p-5">
                            <div>
                                <label className="text-sm text-(--color-text-tertiary)">
                                    {/* Start Update 13 September 2026, by @WNP: Translate fixed vendor-field labels only. */}
                                    {t('Company')}
                                </label>
                                <div className="font-medium text-(--color-text-primary)">
                                    <Link
                                        href={`/admin/vendors/${payment.vendor.id}`}
                                        className="hover:text-(--color-brand-primary) underline-offset-2 hover:underline"
                                    >
                                        {payment.vendor.company_name}
                                    </Link>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-(--color-text-tertiary)">
                                    {t('Contact Person')}
                                </label>
                                <div className="text-(--color-text-primary)">
                                    {payment.vendor.contact_person}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-(--color-text-tertiary)">
                                    {t('Email')}
                                </label>
                                <div className="break-all text-(--color-text-primary)">
                                    {payment.vendor.contact_email}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-(--color-text-tertiary)">
                                    {t('Compliance Status')}
                                </label>
                                <div className="mt-1">
                                    <Badge status={payment.vendor.compliance_status} />
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Start Update 16 September 2026, by @WNP: Show the transfer destination only to Finance and Super Admin users. */}
                    {can.mark_paid && (
                        <Card title="Transfer Destination">
                            <div className="space-y-4 p-5">
                                {[
                                    ['Bank Name', payment.vendor.bank_name || 'N/A'],
                                    ['Account Number', payment.vendor.bank_account_number || 'N/A'],
                                    ['Bank Code', payment.vendor.bank_ifsc || 'N/A'],
                                    ['Branch Name', payment.vendor.bank_branch || 'N/A'],
                                ].map(([label, value]) => (
                                    <div key={label}>
                                        <label className="text-sm text-(--color-text-tertiary)">
                                            {t(label)}
                                        </label>
                                        <div className="break-all font-medium text-(--color-text-primary)">
                                            {value}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            <Modal
                isOpen={showMarkPaidModal}
                onClose={() => setShowMarkPaidModal(false)}
                title="Mark Payment as Paid"
                footer={
                    <>
                        <ModalCancelButton onClick={() => setShowMarkPaidModal(false)} />
                        <ModalPrimaryButton
                            onClick={handleMarkPaid}
                            disabled={!paymentRef || isMarkingPaid}
                        >
                            {isMarkingPaid ? 'Saving...' : 'Confirm Payment'}
                        </ModalPrimaryButton>
                    </>
                }
            >
                <div className="space-y-4">
                    <div>
                        <label
                            htmlFor="payment_reference"
                            className="text-sm font-medium text-(--color-text-secondary) mb-2 block"
                        >
                            {/* Start Update 13 September 2026, by @WNP: Translate the field label without modifying the reference value. */}
                            {t('Payment Reference (UTR/Transaction ID) *')}
                        </label>
                        <input
                            id="payment_reference"
                            name="payment_reference"
                            type="text"
                            autoComplete="off"
                            value={paymentRef}
                            onChange={(e) => setPaymentRef(e.target.value)}
                            className="input-field w-full"
                            placeholder={t('e.g. UTR12345678...')}
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="payment_method"
                            className="text-sm font-medium text-(--color-text-secondary) mb-2 block"
                        >
                            {/* Start Update 13 September 2026, by @WNP: Translate the label, not method values. */}
                            {t('Payment Method')}
                        </label>
                        <select
                            id="payment_method"
                            name="payment_method"
                            autoComplete="off"
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="input-field w-full"
                        >
                            {/* Start Update 13 September 2026, by @WNP: Preserve payment-method option values. */}
                            <option value="">{t('Select Method...')}</option>
                            <option value="NEFT">NEFT</option>
                            <option value="RTGS">RTGS</option>
                            <option value="IMPS">IMPS</option>
                            <option value="UPI">UPI</option>
                            {/* Start Update 13 September 2026, by @WNP: Translate fixed method labels without changing submitted codes. */}
                            <option value="Wire Transfer">{t('Wire Transfer')}</option>
                            <option value="Cheque">{t('Cheque')}</option>
                        </select>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={showRejectModal}
                onClose={() => setShowRejectModal(false)}
                title="Reject Payment Request"
                footer={
                    <>
                        <ModalCancelButton onClick={() => setShowRejectModal(false)} />
                        <Button
                            variant="danger"
                            onClick={handleReject}
                            disabled={!rejectReason || isRejecting}
                        >
                            {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
                        </Button>
                    </>
                }
            >
                <div>
                    <label
                        htmlFor="reject_reason"
                        className="text-sm font-medium text-(--color-text-secondary) mb-2 block"
                    >
                        {/* Start Update 13 September 2026, by @WNP: Translate the fixed rejection label. */}
                        {t('Reason for Rejection *')}
                    </label>
                    <textarea
                        id="reject_reason"
                        name="reject_reason"
                        autoComplete="off"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="input-field w-full h-32"
                        placeholder={t(
                            'Please provide a reason for rejecting this payment request...'
                        )}
                    ></textarea>
                </div>
            </Modal>
        </AdminLayout>
    );
}
