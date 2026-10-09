import { FormSelect } from '@/Components/FormInputs';
import { ActionButton } from '@/Components/ActionControls';
import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    AdminLayout,
    PageHeader,
    DataTable,
    Badge,
    Modal,
    ModalCancelButton,
    ModalPrimaryButton,
    FormTextarea,
    StatCard,
    StatGrid,
} from '@/Components';
// Reuse the centralized Indonesian currency formatter.
import { formatCurrency } from '@/utils/currencyFormatters';
// Translate fixed payment controls without changing stored transaction data.
import { useLanguage } from '@/Contexts/LanguageContext';

export default function PaymentsIndex({ payments, stats, currentStatus }) {
    // Resolve only static payment labels and status enums.
    const { t } = useLanguage();
    // Read the shared IDR settings supplied by Laravel.
    const { auth, currency } = usePage().props;
    const can = auth?.can || {};

    const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [paymentRef, setPaymentRef] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');

    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectPaymentId, setRejectPaymentId] = useState(null);
    const [rejectStage, setRejectStage] = useState(null);
    const [rejectComment, setRejectComment] = useState('');

    const handleAction = (paymentId, stage, action) => {
        const route =
            stage === 'ops'
                ? `/admin/payments/${paymentId}/validate-ops`
                : `/admin/payments/${paymentId}/approve-finance`;

        if (action === 'reject') {
            setRejectPaymentId(paymentId);
            setRejectStage(stage);
            setRejectComment('');
            setShowRejectModal(true);
            return;
        }

        router.post(route, { action });
    };

    const handleReject = () => {
        if (!rejectComment.trim()) return;
        const route =
            rejectStage === 'ops'
                ? `/admin/payments/${rejectPaymentId}/validate-ops`
                : `/admin/payments/${rejectPaymentId}/approve-finance`;

        router.post(
            route,
            { action: 'reject', comment: rejectComment },
            {
                onSuccess: () => {
                    setShowRejectModal(false);
                    setRejectPaymentId(null);
                    setRejectStage(null);
                    setRejectComment('');
                },
            }
        );
    };

    const handleMarkPaid = () => {
        router.post(
            `/admin/payments/${selectedPayment}/mark-paid`,
            {
                payment_reference: paymentRef,
                payment_method: paymentMethod,
            },
            {
                onSuccess: () => {
                    setShowMarkPaidModal(false);
                    setSelectedPayment(null);
                    setPaymentRef('');
                    setPaymentMethod('');
                },
            }
        );
    };

    const statCards = [
        { label: 'Pending Requests', value: stats?.pending || 0, icon: 'clock', color: 'warning' },
        { label: 'Approved', value: stats?.approved || 0, icon: 'success', color: 'success' },
        {
            label: 'Total Paid',
            // Format aggregate paid values as IDR.
            value: formatCurrency(stats?.paid, currency),
            icon: 'payments',
            color: 'primary',
        },
        { label: 'Total Transactions', value: stats?.total || 0, icon: 'reports', color: 'info' },
    ];

    const columns = [
        {
            header: 'Reference',
            render: (row) => (
                <div className="space-y-1">
                    <div className="font-mono text-(--color-text-primary) font-medium">
                        {row.reference_number}
                    </div>
                    {row.is_duplicate_flagged && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-(--color-warning-light) text-(--color-warning-dark)">
                            {/* Translate the fixed duplicate indicator. */}
                            {t('Duplicate Flag')}
                        </span>
                    )}
                </div>
            ),
        },
        {
            header: 'Vendor',
            render: (row) => (
                <span className="text-(--color-text-secondary)">{row.vendor?.company_name}</span>
            ),
        },
        {
            header: 'Amount',
            align: 'right',
            render: (row) => (
                <span className="text-(--color-text-primary) font-bold">
                    {/* Format payment row values as IDR. */}
                    {formatCurrency(row.amount, currency)}
                </span>
            ),
        },
        { header: 'Status', render: (row) => <Badge status={row.status} /> },
        {
            header: 'Actions',
            align: 'right',
            render: (row) => {
                const vendorIsCompliant = row.vendor?.compliance_status === 'compliant';
                const isFinanceApprovalBlocked =
                    row.status === 'pending_finance' &&
                    Boolean(row.is_compliance_blocked) &&
                    !vendorIsCompliant;

                return (
                    <div className="flex flex-wrap gap-2 justify-end items-center">
                        <ActionButton
                            variant="outline"
                            onClick={() => router.get(`/admin/payments/${row.id}`)}
                        >
                            Review
                        </ActionButton>
                        {['requested', 'pending_ops'].includes(row.status) &&
                            can.validate_payments && (
                                <>
                                    <ActionButton
                                        variant="success"
                                        onClick={() => handleAction(row.id, 'ops', 'approve')}
                                    >
                                        Validate
                                    </ActionButton>
                                    <ActionButton
                                        variant="danger"
                                        onClick={() => handleAction(row.id, 'ops', 'reject')}
                                    >
                                        Reject
                                    </ActionButton>
                                </>
                            )}
                        {row.status === 'pending_finance' && can.approve_payments && (
                            <>
                                <ActionButton
                                    variant="success"
                                    disabled={isFinanceApprovalBlocked}
                                    disabledReason={
                                        'Payment approval is blocked by vendor compliance.'
                                    }
                                    onClick={() => handleAction(row.id, 'finance', 'approve')}
                                >
                                    {isFinanceApprovalBlocked ? 'Blocked' : 'Approve'}
                                </ActionButton>
                                <ActionButton
                                    variant="danger"
                                    onClick={() => handleAction(row.id, 'finance', 'reject')}
                                >
                                    Reject
                                </ActionButton>
                            </>
                        )}
                        {row.status === 'approved' && can.mark_paid && (
                            <ActionButton
                                variant="primary"
                                onClick={() => {
                                    setSelectedPayment(row.id);
                                    setShowMarkPaidModal(true);
                                }}
                            >
                                Mark Paid
                            </ActionButton>
                        )}
                        {['requested', 'pending_ops'].includes(row.status) &&
                            !can.validate_payments && (
                                <span className="text-xs text-(--color-text-tertiary) italic">
                                    {/* Translate the fixed workflow hint. */}
                                    {t('Waiting for Ops')}
                                </span>
                            )}
                        {row.status === 'pending_finance' && !can.approve_payments && (
                            <span className="text-xs text-(--color-text-tertiary) italic">
                                {/* Translate the fixed workflow hint. */}
                                {t('Waiting for Finance')}
                            </span>
                        )}
                        {row.status === 'approved' && !can.mark_paid && (
                            <span className="text-xs text-(--color-text-tertiary) italic">
                                {/* Translate the fixed workflow hint. */}
                                {t('Ready for Payment')}
                            </span>
                        )}
                    </div>
                );
            },
        },
    ];

    const statusFilters = [
        'all',
        'requested',
        'pending_ops',
        'pending_finance',
        'approved',
        'paid',
        'rejected',
    ];

    const header = (
        <PageHeader title="Payment Requests" subtitle="Manage vendor payment approvals" />
    );

    return (
        <AdminLayout title="Payment Requests" activeNav="Payments" header={header}>
            <div className="space-y-8">
                <StatGrid cols={4}>
                    {statCards.map((stat, idx) => (
                        <StatCard key={idx} {...stat} className="h-full" />
                    ))}
                </StatGrid>

                <div className="inline-flex gap-2 flex-wrap p-1 bg-(--color-bg-tertiary) rounded-xl">
                    {statusFilters.map((status) => (
                        <Link
                            key={status}
                            href={`/admin/payments?status=${status}`}
                            aria-current={currentStatus === status ? 'page' : undefined}
                            className={`staff-status-filter px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize focus-visible:ring-2 focus-visible:ring-(--color-brand-primary) focus-visible:ring-offset-2 ${
                                currentStatus === status
                                    ? 'theme-primary-action shadow-token-primary'
                                    : 'text-(--color-text-tertiary) hover:bg-(--color-bg-primary)'
                            }`}
                        >
                            {/* Translate filter labels while preserving URL enum codes. */}
                            {t(status.replaceAll('_', ' '))}
                        </Link>
                    ))}
                </div>

                <DataTable
                    columns={columns}
                    data={payments?.data || []}
                    links={payments?.links || []}
                    emptyMessage="No payment requests found"
                />
            </div>

            <Modal
                isOpen={showMarkPaidModal && can.mark_paid}
                onClose={() => setShowMarkPaidModal(false)}
                title="Mark as Paid"
                footer={
                    <>
                        <ModalCancelButton onClick={() => setShowMarkPaidModal(false)} />
                        <ModalPrimaryButton
                            onClick={handleMarkPaid}
                            disabled={!paymentRef}
                            disabledReason={'Enter the payment reference before continuing.'}
                        >
                            Confirm Payment
                        </ModalPrimaryButton>
                    </>
                }
            >
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-(--color-text-secondary) mb-2 block">
                            {/* Translate the fixed field label, not its typed value. */}
                            {t('Payment Reference *')}
                        </label>
                        <input
                            type="text"
                            value={paymentRef}
                            onChange={(e) => setPaymentRef(e.target.value)}
                            className="input-field w-full"
                            placeholder={t('Transaction ID or UTR')}
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="payment_method"
                            className="text-sm font-medium text-(--color-text-secondary) mb-2 block"
                        >
                            {/* Translate only the method field label. */}
                            {t('Payment Method')}
                        </label>
                        <FormSelect
                            id="payment_method"
                            size="field"
                            aria-label="Payment Method"
                            value={paymentMethod}
                            onChange={setPaymentMethod}
                            placeholder="Select method"
                            options={[
                                { value: 'NEFT', label: 'NEFT' },
                                { value: 'RTGS', label: 'RTGS' },
                                { value: 'IMPS', label: 'IMPS' },
                                { value: 'UPI', label: 'UPI' },
                                { value: 'Cheque', label: 'Cheque' },
                            ]}
                        />
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={showRejectModal}
                onClose={() => setShowRejectModal(false)}
                title="Reject Payment"
                footer={
                    <>
                        <ModalCancelButton onClick={() => setShowRejectModal(false)} />
                        <ModalPrimaryButton
                            variant="danger"
                            onClick={handleReject}
                            disabled={!rejectComment.trim()}
                            disabledReason={'Enter a rejection reason before continuing.'}
                        >
                            Reject
                        </ModalPrimaryButton>
                    </>
                }
            >
                <FormTextarea
                    label="Rejection Reason *"
                    value={rejectComment}
                    onChange={setRejectComment}
                    placeholder="Please provide a reason for rejection..."
                    required
                />
            </Modal>
        </AdminLayout>
    );
}
