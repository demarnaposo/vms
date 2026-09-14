// Start Update 11 September 2026, by @WNP: Read shared currency settings alongside the existing payment form.
import { useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    AppIcon,
    Button,
    Card,
    FormInput,
    FormTextarea,
    Modal,
    ModalCancelButton,
    ModalPrimaryButton,
    PageHeader,
    VendorLayout,
} from '@/Components';
// Start Update 11 September 2026, by @WNP: Reuse the centralized Indonesian currency formatter.
import { formatCurrency } from '@/utils/currencyFormatters';
import { formatDate } from '@/utils/dateFormatters';
// Start Update 12 September 2026, by @WNP: Translate payment request feedback through the existing language provider.
import { useLanguage } from '@/Contexts/LanguageContext';

export default function Payments({ vendor, payments = { data: [] } }) {
    // Start Update 13 September 2026, by @WNP: Localize fixed payment labels and dates, not descriptions or references.
    const { language, t } = useLanguage();
    const dateLocale = language === 'id' ? 'id-ID' : 'en-IN';
    const [showRequestModal, setShowRequestModal] = useState(false);
    // Start Update 11 September 2026, by @WNP: Use the default currency shared by Laravel.
    const { currency } = usePage().props;

    const requestForm = useForm({
        amount: '',
        invoice_number: '',
        description: '',
    });

    const handleSubmitRequest = (event) => {
        event.preventDefault();

        requestForm.post('/vendor/payments/request', {
            onSuccess: () => {
                setShowRequestModal(false);
                requestForm.reset();
            },
        });
    };

    const displayPayments = payments.data || [];

    const statusColors = {
        requested: 'bg-(--color-info-light) text-(--color-info-dark)',
        pending_ops: 'bg-(--color-warning-light) text-(--color-warning-dark)',
        pending_finance: 'bg-(--color-warning-light) text-(--color-warning-dark)',
        approved: 'bg-(--color-success-light) text-(--color-success-dark)',
        paid: 'bg-(--color-success) text-white',
        rejected: 'bg-(--color-danger-light) text-(--color-danger-dark)',
        cancelled: 'bg-(--color-bg-tertiary) text-(--color-text-tertiary)',
    };

    const totalPending = displayPayments
        .filter((payment) =>
            ['requested', 'pending_ops', 'pending_finance', 'approved'].includes(payment.status)
        )
        .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);

    const totalPaid = displayPayments
        .filter((payment) => payment.status === 'paid')
        .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);

    const header = (
        <PageHeader
            title="Payments"
            subtitle="Track and request payments"
            actions={
                ['active', 'approved'].includes(vendor?.status) && (
                    <Button onClick={() => setShowRequestModal(true)}>
                        <AppIcon name="payments" className="h-4 w-4" />
                        {/* Start Update 13 September 2026, by @WNP: Translate the fixed icon-button label. */}
                        {t('Request Payment')}
                    </Button>
                )
            }
        />
    );

    return (
        <VendorLayout title="Payments" activeNav="Payments" header={header} vendor={vendor}>
            <div className="space-y-8 animate-fade-in">
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-(--color-bg-primary) rounded-2xl p-6 border border-(--color-warning-light) shadow-token-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-(--color-warning-light)/50 rounded-full blur-3xl -mr-10 -mt-10 transition-all duration-500 group-hover:bg-(--color-warning-light)/70" />
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <span className="text-sm font-medium text-(--color-text-tertiary)">
                                {/* Start Update 13 September 2026, by @WNP: Translate the fixed summary label. */}
                                {t('Pending Amount')}
                            </span>
                            <span className="inline-flex p-2 bg-(--color-warning-light) rounded-lg text-(--color-warning-dark)">
                                <AppIcon name="clock" className="h-5 w-5" />
                            </span>
                        </div>
                        <div className="text-3xl font-bold text-(--color-text-primary) relative z-10">
                            {/* Start Update 11 September 2026, by @WNP: Format pending totals as IDR. */}
                            {formatCurrency(totalPending, currency)}
                        </div>
                    </div>

                    <div className="bg-(--color-bg-primary) rounded-2xl p-6 border border-(--color-success-light) shadow-token-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-(--color-success-light)/50 rounded-full blur-3xl -mr-10 -mt-10 transition-all duration-500 group-hover:bg-(--color-success-light)/70" />
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <span className="text-sm font-medium text-(--color-text-tertiary)">
                                {/* Start Update 13 September 2026, by @WNP: Translate the fixed summary label. */}
                                {t('Total Paid')}
                            </span>
                            <span className="inline-flex p-2 bg-(--color-success-light) rounded-lg text-(--color-success-dark)">
                                <AppIcon name="success" className="h-5 w-5" />
                            </span>
                        </div>
                        <div className="text-3xl font-bold text-(--color-text-primary) relative z-10">
                            {/* Start Update 11 September 2026, by @WNP: Format paid totals as IDR. */}
                            {formatCurrency(totalPaid, currency)}
                        </div>
                    </div>

                    <div className="bg-(--color-bg-primary) rounded-2xl p-6 border border-(--color-brand-primary-light) shadow-token-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-(--color-brand-primary-light)/40 rounded-full blur-3xl -mr-10 -mt-10 transition-all duration-500 group-hover:bg-(--color-brand-primary-light)/60" />
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <span className="text-sm font-medium text-(--color-text-tertiary)">
                                {/* Start Update 13 September 2026, by @WNP: Translate the fixed summary label. */}
                                {t('Total Requests')}
                            </span>
                            <span className="inline-flex p-2 bg-(--color-brand-primary-light) rounded-lg text-(--color-brand-primary-dark)">
                                <AppIcon name="reports" className="h-5 w-5" />
                            </span>
                        </div>
                        <div className="text-3xl font-bold text-(--color-text-primary) relative z-10">
                            {displayPayments.length}
                        </div>
                    </div>
                </div>

                <Card title="Payment History">
                    {displayPayments.length === 0 ? (
                        <div className="p-12 text-center text-(--color-text-tertiary)">
                            <div className="w-16 h-16 bg-(--color-bg-secondary) rounded-full flex items-center justify-center mx-auto mb-4 text-(--color-brand-primary)">
                                <AppIcon name="payments" className="h-8 w-8" />
                            </div>
                            <h3 className="text-lg font-medium text-(--color-text-primary) mb-1">
                                {/* Start Update 13 September 2026, by @WNP: Translate the fixed empty-state heading. */}
                                {t('No payment requests yet')}
                            </h3>
                            <p className="mb-6">
                                {/* Start Update 13 September 2026, by @WNP: Translate the fixed empty-state guidance. */}
                                {t('Create your first payment request to get started.')}
                            </p>
                            {['active', 'approved'].includes(vendor?.status) && (
                                <Button onClick={() => setShowRequestModal(true)}>
                                    Request Payment
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-(--color-border-primary) bg-(--color-bg-secondary)/50">
                                        <th className="text-left p-4 text-xs font-semibold text-(--color-text-tertiary) uppercase tracking-wider">
                                            {/* Start Update 13 September 2026, by @WNP: Translate fixed table headings only. */}
                                            {t('Reference')}
                                        </th>
                                        <th className="text-left p-4 text-xs font-semibold text-(--color-text-tertiary) uppercase tracking-wider">
                                            {t('Description')}
                                        </th>
                                        <th className="text-right p-4 text-xs font-semibold text-(--color-text-tertiary) uppercase tracking-wider">
                                            {t('Amount')}
                                        </th>
                                        <th className="text-left p-4 text-xs font-semibold text-(--color-text-tertiary) uppercase tracking-wider">
                                            {t('Status')}
                                        </th>
                                        <th className="text-left p-4 text-xs font-semibold text-(--color-text-tertiary) uppercase tracking-wider">
                                            {t('Date')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-(--color-border-secondary)">
                                    {displayPayments.map((payment) => (
                                        <tr
                                            key={payment.id}
                                            className="hover:bg-(--color-bg-hover)/80 transition-colors"
                                        >
                                            <td className="p-4">
                                                <span className="font-mono text-sm text-(--color-text-secondary) font-medium bg-(--color-bg-tertiary) px-2 py-1 rounded">
                                                    {payment.reference_number ||
                                                        `PAY-${payment.id}`}
                                                </span>
                                            </td>
                                            <td className="p-4 text-(--color-text-secondary)">
                                                {payment.description}
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className="text-(--color-text-primary) font-bold">
                                                    {/* Start Update 11 September 2026, by @WNP: Format payment history amounts as IDR. */}
                                                    {formatCurrency(payment.amount, currency)}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[payment.status] || 'bg-(--color-bg-tertiary) text-(--color-text-primary)'}`}
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current" />
                                                    {/* Start Update 13 September 2026, by @WNP: Translate the status enum label, not its stored code. */}
                                                    {t(payment.status?.replaceAll('_', ' '))}
                                                </span>
                                            </td>
                                            <td className="p-4 text-(--color-text-tertiary) text-sm">
                                                {/* Start Update 13 September 2026, by @WNP: Display transaction dates in the selected locale. */}
                                                {formatDate(payment.created_at, dateLocale)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>

            <Modal
                isOpen={showRequestModal}
                onClose={() => setShowRequestModal(false)}
                title="Request Payment"
                size="lg"
                footer={
                    <>
                        <ModalCancelButton onClick={() => setShowRequestModal(false)} />
                        <ModalPrimaryButton
                            onClick={handleSubmitRequest}
                            disabled={requestForm.processing}
                        >
                            {requestForm.processing ? 'Submitting...' : 'Submit Request'}
                        </ModalPrimaryButton>
                    </>
                }
            >
                <div className="space-y-5">
                    {requestForm.errors.submit && (
                        <div className="bg-(--color-danger-light) border border-(--color-danger) text-(--color-danger-dark) px-4 py-3 rounded-xl text-sm font-medium">
                            {/* Start Update 12 September 2026, by @WNP: Localize payment request errors while preserving database values. */}
                            {t(requestForm.errors.submit)}
                        </div>
                    )}

                    {/* Start Update 13 September 2026, by @WNP: Translate the amount label while preserving the configured currency code. */}
                    <FormInput
                        label={t('Amount (:code)', { code: currency?.code || 'IDR' })}
                        type="number"
                        value={requestForm.data.amount}
                        onChange={(val) => requestForm.setData('amount', val)}
                        error={requestForm.errors.amount}
                        placeholder="0.00"
                        required
                        autoFocus
                    />

                    <FormInput
                        label="Invoice Number"
                        value={requestForm.data.invoice_number}
                        onChange={(val) => requestForm.setData('invoice_number', val)}
                        error={requestForm.errors.invoice_number}
                        placeholder="INV-2026-001"
                    />

                    <FormTextarea
                        label="Description"
                        value={requestForm.data.description}
                        onChange={(val) => requestForm.setData('description', val)}
                        error={requestForm.errors.description}
                        placeholder="Brief description of services or products..."
                        required
                        rows={3}
                    />
                </div>
            </Modal>
        </VendorLayout>
    );
}
