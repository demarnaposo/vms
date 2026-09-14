import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    AdminLayout,
    PageHeader,
    DataTable,
    Badge,
    Button,
    Modal,
    ModalCancelButton,
    ModalPrimaryButton,
    FormTextarea,
    StatCard,
    StatGrid,
} from '@/Components';
// Start Update 11 September 2026, by @WNP: Reuse the centralized Indonesian currency formatter.
import { formatCurrency } from '@/utils/currencyFormatters';
// Start Update 13 September 2026, by @WNP: Translate fixed payment controls without changing stored transaction data.
import { useLanguage } from '@/Contexts/LanguageContext';

export default function PaymentsIndex({ payments, stats, currentStatus }) {
    // Start Update 13 September 2026, by @WNP: Resolve only static payment labels and status enums.
    const { t } = useLanguage();
    // Start Update 11 September 2026, by @WNP: Read the shared IDR settings supplied by Laravel.
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
            // Start Update 11 September 2026, by @WNP: Format aggregate paid values as IDR.
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
                            {/* Start Update 13 September 2026, by @WNP: Translate the fixed duplicate indicator. */}
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
                    {/* Start Update 11 September 2026, by @WNP: Format payment row values as IDR. */}
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
                    <div className="flex gap-2 justify-end items-center">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => router.get(`/admin/payments/${row.id}`)}
                        >
                            Review
                        </Button>
                        {['requested', 'pending_ops'].includes(row.status) &&
                            can.validate_payments && (
                                <>
                                    <Button
                                        variant="success"
                                        size="sm"
                                        onClick={() => handleAction(row.id, 'ops', 'approve')}
                                    >
                                        Validate
                                    </Button>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => handleAction(row.id, 'ops', 'reject')}
                                    >
                                        Reject
                                    </Button>
                                </>
                            )}
                        {row.status === 'pending_finance' && can.approve_payments && (
                            <>
                                <Button
                                    variant="success"
                                    size="sm"
                                    disabled={isFinanceApprovalBlocked}
                                    onClick={() => handleAction(row.id, 'finance', 'approve')}
                                >
                                    {isFinanceApprovalBlocked ? 'Blocked' : 'Approve'}
                                </Button>
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleAction(row.id, 'finance', 'reject')}
                                >
                                    Reject
                                </Button>
                            </>
                        )}
                        {row.status === 'approved' && can.mark_paid && (
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                    setSelectedPayment(row.id);
                                    setShowMarkPaidModal(true);
                                }}
                            >
                                Mark Paid
                            </Button>
                        )}
                        {['requested', 'pending_ops'].includes(row.status) &&
                            !can.validate_payments && (
                                <span className="text-xs text-(--color-text-tertiary) italic">
                                    {/* Start Update 13 September 2026, by @WNP: Translate the fixed workflow hint. */}
                                    {t('Waiting for Ops')}
                                </span>
                            )}
                        {row.status === 'pending_finance' && !can.approve_payments && (
                            <span className="text-xs text-(--color-text-tertiary) italic">
                                {/* Start Update 13 September 2026, by @WNP: Translate the fixed workflow hint. */}
                                {t('Waiting for Finance')}
                            </span>
                        )}
                        {row.status === 'approved' && !can.mark_paid && (
                            <span className="text-xs text-(--color-text-tertiary) italic">
                                {/* Start Update 13 September 2026, by @WNP: Translate the fixed workflow hint. */}
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
                            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-200 ${
                                currentStatus === status
                                    ? 'bg-(--color-bg-primary) text-(--color-text-primary) shadow-token-sm'
                                    : 'text-(--color-text-tertiary) hover:text-(--color-text-primary) hover:bg-(--color-bg-primary)/50'
                            }`}
                        >
                            {/* Start Update 13 September 2026, by @WNP: Translate filter labels while preserving URL enum codes. */}
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
                        <ModalPrimaryButton onClick={handleMarkPaid} disabled={!paymentRef}>
                            Confirm Payment
                        </ModalPrimaryButton>
                    </>
                }
            >
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-(--color-text-secondary) mb-2 block">
                            {/* Start Update 13 September 2026, by @WNP: Translate the fixed field label, not its typed value. */}
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
                        <label className="text-sm font-medium text-(--color-text-secondary) mb-2 block">
                            {/* Start Update 13 September 2026, by @WNP: Translate only the method field label. */}
                            {t('Payment Method')}
                        </label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="input-field w-full"
                        >
                            {/* Start Update 13 September 2026, by @WNP: Keep payment-method option values unchanged. */}
                            <option value="">{t('Select method')}</option>
                            <option value="NEFT">NEFT</option>
                            <option value="RTGS">RTGS</option>
                            <option value="IMPS">IMPS</option>
                            <option value="UPI">UPI</option>
                            {/* Start Update 13 September 2026, by @WNP: Translate the fixed method label, not its stored value. */}
                            <option value="Cheque">{t('Cheque')}</option>
                        </select>
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
