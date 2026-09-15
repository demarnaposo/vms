import { Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    AdminLayout,
    PageHeader,
    Card,
    Badge,
    Button,
    Modal,
    ModalCancelButton,
    ModalPrimaryButton,
    FormTextarea,
    AppIcon,
} from '@/Components';
import { DocumentViewer } from '@/Components/DocumentViewer';
import { formatDate, formatDateTime } from '@/utils/dateFormatters';
// Start Update 12 September 2026, by @WNP: Translate vendor detail tabs and its document review panel.
import { useLanguage } from '@/Contexts/LanguageContext';
// Start Update 13 September 2026, by @WNP: Translate only known automatic vendor timeline comments.
import { translateTimelineComment } from '@/i18n/timelineComments';
// Start Update 15 September 2026, by @WNP: Translate only fixed document types in vendor details.
import { translateDocumentTypeLabel } from '@/i18n/documentTypes';
// Start Update 15 September 2026, by @WNP: Localize recognized compliance master labels in the vendor tab.
import { translateSystemMasterDataField } from '@/i18n/systemMasterData';

export default function VendorShow({
    vendor,
    docVerificationStatus = [],
    allMandatoryDocsVerified = true,
}) {
    // Start Update 12 September 2026, by @WNP: Use the active language for document-related detail copy.
    const { language, t } = useLanguage();
    const dateLocale = language === 'id' ? 'id-ID' : 'en-IN';
    const { auth } = usePage().props;
    const can = auth?.can || {};

    const [activeTab, setActiveTab] = useState('overview');
    const [showActionModal, setShowActionModal] = useState(null);

    // Document viewer state (Feature 2)
    const [showDocViewer, setShowDocViewer] = useState(false);
    const [viewerDocument, setViewerDocument] = useState(null);

    // Document rejection modal state (Feature 4 - replaces browser prompt())
    const [showDocRejectModal, setShowDocRejectModal] = useState(false);
    const [rejectDocId, setRejectDocId] = useState(null);
    const [docRejectReason, setDocRejectReason] = useState('');

    const actionForm = useForm({ comment: '' });
    const notesForm = useForm({ internal_notes: vendor?.internal_notes || '' });

    // Start Update 14 September 2026, by @WNP: Keep VMS lifecycle errors scoped to the active confirmation modal.
    const closeActionModal = () => {
        actionForm.clearErrors();
        setShowActionModal(null);
    };

    const openActionModal = (action) => {
        actionForm.clearErrors();
        setShowActionModal(action);
    };

    const handleAction = (action) => {
        const routes = {
            approve: `/admin/vendors/${vendor.id}/approve`,
            reject: `/admin/vendors/${vendor.id}/reject`,
            activate: `/admin/vendors/${vendor.id}/activate`,
            suspend: `/admin/vendors/${vendor.id}/suspend`,
            terminate: `/admin/vendors/${vendor.id}/terminate`,
            reactivate: `/admin/vendors/${vendor.id}/reactivate`,
        };

        const route = routes[action];
        if (!route) {
            return;
        }

        actionForm.post(route, {
            onSuccess: () => {
                closeActionModal();
                actionForm.reset();
            },
        });
    };

    // Handle document rejection via modal (Feature 4)
    const handleDocReject = () => {
        if (!rejectDocId || !docRejectReason.trim()) return;
        router.post(
            `/admin/documents/${rejectDocId}/reject`,
            { reason: docRejectReason },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowDocRejectModal(false);
                    setRejectDocId(null);
                    setDocRejectReason('');
                },
            }
        );
    };

    const saveNotes = (e) => {
        e.preventDefault();
        notesForm.post(`/admin/vendors/${vendor.id}/notes`);
    };

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'documents', label: 'Documents' },
        { id: 'compliance', label: 'Compliance' },
        { id: 'timeline', label: 'Timeline' },
        ...(can.edit_vendor_notes ? [{ id: 'notes', label: 'Internal Notes' }] : []),
    ];

    // Feature 3: Gate approval on mandatory document verification
    const canApprove =
        can.approve_vendors &&
        (vendor?.status === 'submitted' || vendor?.status === 'under_review') &&
        allMandatoryDocsVerified;
    const canReject =
        can.reject_vendors && (vendor?.status === 'submitted' || vendor?.status === 'under_review');

    // We will show the button if approved/suspended, but we'll conditionally disable it inline or show warnings.
    const isReadyForActivation =
        allMandatoryDocsVerified && vendor?.compliance_status === 'compliant';
    const canActivate = can.activate_vendors && ['approved', 'suspended'].includes(vendor?.status);
    const canSuspend = can.suspend_vendors && vendor?.status === 'active';
    const canTerminate = can.terminate_vendors && ['active', 'suspended'].includes(vendor?.status);
    const canReactivate = can.terminate_vendors && vendor?.status === 'terminated';

    const actionLabels = {
        approve: 'Approve',
        reject: 'Reject',
        activate: 'Activate',
        suspend: 'Suspend',
        terminate: 'Terminate',
        reactivate: 'Reactivate',
    };

    const isCommentRequired = ['reject', 'suspend', 'terminate', 'reactivate'].includes(
        showActionModal
    );

    const headerActions = (
        <div className="flex gap-2">
            {canApprove && (
                <Button variant="success" onClick={() => openActionModal('approve')}>
                    Approve
                </Button>
            )}
            {canReject && (
                <Button variant="danger" onClick={() => openActionModal('reject')}>
                    Reject
                </Button>
            )}
            {canActivate && (
                <div className="relative group">
                    <Button
                        onClick={() => openActionModal('activate')}
                        disabled={!isReadyForActivation}
                        className={!isReadyForActivation ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                        Activate
                    </Button>
                    {!isReadyForActivation && (
                        <div className="absolute hidden group-hover:block bottom-full mb-2 right-0 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50">
                            {t(
                                'Vendor must have all mandatory documents verified and a passing compliance score to be activated.'
                            )}
                        </div>
                    )}
                </div>
            )}
            {canSuspend && (
                <Button variant="warning" onClick={() => openActionModal('suspend')}>
                    Suspend
                </Button>
            )}
            {canTerminate && (
                <Button variant="danger" onClick={() => openActionModal('terminate')}>
                    Terminate
                </Button>
            )}
            {canReactivate && (
                <Button variant="warning" onClick={() => openActionModal('reactivate')}>
                    Reactivate
                </Button>
            )}
        </div>
    );

    const header = (
        <PageHeader
            title={
                <div className="flex items-center gap-3">
                    {vendor?.company_name}
                    <Badge status={vendor?.status} />
                </div>
            }
            subtitle={vendor?.contact_email}
            backLink="/admin/vendors"
            actions={headerActions}
        />
    );

    return (
        <AdminLayout
            title={vendor?.company_name || 'Vendor Details'}
            activeNav="Vendors"
            header={header}
        >
            {/* Tabs */}
            <div className="border-b border-(--color-border-secondary) -mx-8 px-8 mb-8">
                <div className="flex gap-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-4 text-sm font-medium border-b-2 -mb-px transition-colors ${
                                activeTab === tab.id
                                    ? 'border-(--color-brand-primary) text-(--color-text-primary)'
                                    : 'border-transparent text-(--color-text-secondary) hover:text-(--color-text-primary)'
                            }`}
                        >
                            {t(tab.label)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="grid lg:grid-cols-2 gap-8">
                    <Card title="Company Information">
                        <div className="p-6 space-y-3 text-sm">
                            {[
                                ['Company Name', vendor?.company_name],
                                ['Registration No.', vendor?.registration_number || '-'],
                                ['PAN', vendor?.pan_number],
                                ['GST/Tax ID', vendor?.tax_id || '-'],
                                ['Business Type', vendor?.business_type || '-'],
                            ].map(([label, value]) => (
                                <div key={label} className="flex justify-between">
                                    <span className="text-(--color-text-secondary)">
                                        {t(label)}
                                    </span>
                                    <span className="text-(--color-text-primary)">{value}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                    <Card title="Contact Information">
                        <div className="p-6 space-y-3 text-sm">
                            {[
                                ['Contact Person', vendor?.contact_person],
                                ['Email', vendor?.contact_email],
                                ['Phone', vendor?.contact_phone],
                                // Start Update 11 September 2026, by @WNP: Tampilkan alamat Indonesia lengkap pada detail vendor admin.
                                [
                                    'Address',
                                    [
                                        vendor?.address,
                                        vendor?.city,
                                        vendor?.state,
                                        vendor?.pincode,
                                        vendor?.country,
                                    ]
                                        .filter(Boolean)
                                        .join(', '),
                                ],
                            ].map(([label, value]) => (
                                <div key={label} className="flex justify-between">
                                    <span className="text-(--color-text-secondary)">
                                        {t(label)}
                                    </span>
                                    <span className="text-(--color-text-primary) text-right max-w-[200px]">
                                        {value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>
                    <Card title="Bank Details">
                        <div className="p-6 space-y-3 text-sm">
                            {[
                                ['Bank Name', vendor?.bank_name],
                                ['Account No.', vendor?.bank_account_number],
                                // Start Update 11 September 2026, by @WNP: Display Indonesian bank code terminology for admins.
                                ['Bank Code', vendor?.bank_ifsc],
                                ['Branch', vendor?.bank_branch || '-'],
                            ].map(([label, value]) => (
                                <div key={label} className="flex justify-between">
                                    <span className="text-(--color-text-secondary)">
                                        {t(label)}
                                    </span>
                                    <span className="text-(--color-text-primary)">{value}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                    <Card title="Scores & Status">
                        <div className="p-6 space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-(--color-text-secondary)">
                                    {t('Performance Score')}
                                </span>
                                <span className="text-(--color-text-primary) font-bold">
                                    {vendor?.performance_score || 0}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-(--color-text-secondary)">
                                    {t('Compliance Score')}
                                </span>
                                <span className="text-(--color-text-primary) font-bold">
                                    {vendor?.compliance_score || 0}%
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-(--color-text-secondary)">
                                    {t('Compliance Status')}
                                </span>
                                <Badge status={vendor?.compliance_status} />
                            </div>
                            {can.rate_vendors && (
                                <Link
                                    href={`/admin/performance/${vendor?.id}/rate`}
                                    className="text-(--color-brand-primary) hover:text-(--color-brand-primary-light) text-sm block mt-4"
                                >
                                    {t('Rate Performance')}
                                </Link>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
                <div className="space-y-4">
                    {/* Feature 3: Document verification warning banner */}
                    {!allMandatoryDocsVerified &&
                        ['submitted', 'under_review', 'approved', 'suspended'].includes(
                            vendor?.status
                        ) && (
                            <div className="p-4 rounded-xl border border-(--color-warning) bg-(--color-warning-light)/30">
                                <div className="flex items-center gap-3">
                                    <AppIcon
                                        name="warning"
                                        className="h-5 w-5 text-(--color-warning) shrink-0"
                                    />
                                    <div>
                                        <p className="font-medium text-(--color-text-primary)">
                                            {t('Mandatory documents not fully verified')}
                                        </p>
                                        <p className="text-sm text-(--color-text-secondary) mt-1">
                                            {t(
                                                'All mandatory documents must be verified before approving this vendor.'
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3 space-y-1 ml-8">
                                    {docVerificationStatus
                                        .filter((d) => !d.is_verified)
                                        .map((d, i) => (
                                            <div
                                                key={i}
                                                className="text-sm flex items-center gap-2"
                                            >
                                                <span className="w-2 h-2 rounded-full bg-(--color-danger) shrink-0" />
                                                <span className="text-(--color-text-secondary)">
                                                    {/* Start Update 15 September 2026, by @WNP: Localize recognized master labels in verification readiness. */}
                                                    {translateDocumentTypeLabel(
                                                        language,
                                                        d.document_type
                                                    )}
                                                    : <Badge status={d.verification_status} />
                                                </span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}

                    <Card>
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-(--color-border-secondary)">
                                    <th className="text-left p-4 text-sm font-medium text-(--color-text-secondary)">
                                        {t('Document')}
                                    </th>
                                    <th className="text-left p-4 text-sm font-medium text-(--color-text-secondary)">
                                        {t('Status')}
                                    </th>
                                    <th className="text-left p-4 text-sm font-medium text-(--color-text-secondary)">
                                        {t('Expiry')}
                                    </th>
                                    <th className="text-left p-4 text-sm font-medium text-(--color-text-secondary)">
                                        {t('Uploaded')}
                                    </th>
                                    <th className="text-right p-4 text-sm font-medium text-(--color-text-secondary)">
                                        {t('Actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {vendor?.documents?.map((doc) => (
                                    <tr
                                        key={doc.id}
                                        className="border-b border-(--color-border-secondary)"
                                    >
                                        <td className="p-4 text-(--color-text-primary)">
                                            <div>
                                                {/* Start Update 15 September 2026, by @WNP: Translate fixed master labels and preserve custom names. */}
                                                {translateDocumentTypeLabel(
                                                    language,
                                                    doc.document_type
                                                )}
                                                {doc.verification_status === 'rejected' &&
                                                    doc.verification_notes && (
                                                        <div className="text-xs text-(--color-danger) mt-0.5">
                                                            {t('Reason:')} {doc.verification_notes}
                                                        </div>
                                                    )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <Badge status={doc.verification_status} />
                                        </td>
                                        <td className="p-4 text-(--color-text-secondary)">
                                            {formatDate(doc.expiry_date, dateLocale)}
                                        </td>
                                        <td className="p-4 text-(--color-text-secondary)">
                                            {formatDateTime(doc.created_at, dateLocale)}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex gap-2 justify-end">
                                                {/* Feature 2: View/Download buttons */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setViewerDocument({
                                                            ...doc,
                                                            preview_url: `/admin/documents/${doc.id}/preview`,
                                                            download_url: `/documents/${doc.id}/download`,
                                                        });
                                                        setShowDocViewer(true);
                                                    }}
                                                    className="px-3 py-1.5 text-sm font-medium text-(--color-brand-primary) hover:text-(--color-brand-primary-hover) hover:bg-(--color-brand-primary-light) rounded-lg transition-colors"
                                                >
                                                    {t('View')}
                                                </button>
                                                <a
                                                    href={`/documents/${doc.id}/download`}
                                                    className="px-3 py-1.5 text-sm font-medium text-(--color-text-tertiary) hover:text-(--color-text-primary) hover:bg-(--color-bg-hover) rounded-lg transition-colors"
                                                >
                                                    {t('Download')}
                                                </a>
                                                {/* Verify/Reject buttons for pending documents */}
                                                {can.verify_documents &&
                                                    doc.verification_status === 'pending' && (
                                                        <>
                                                            <Button
                                                                variant="success"
                                                                size="sm"
                                                                onClick={() =>
                                                                    router.post(
                                                                        `/admin/documents/${doc.id}/verify`,
                                                                        {},
                                                                        { preserveScroll: true }
                                                                    )
                                                                }
                                                            >
                                                                Verify
                                                            </Button>
                                                            {/* Feature 4: Modal-based rejection */}
                                                            <Button
                                                                variant="danger"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setRejectDocId(doc.id);
                                                                    setDocRejectReason('');
                                                                    setShowDocRejectModal(true);
                                                                }}
                                                            >
                                                                Reject
                                                            </Button>
                                                        </>
                                                    )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                </div>
            )}

            {/* Compliance Tab */}
            {activeTab === 'compliance' && (
                <div className="space-y-4">
                    {can.run_compliance && (
                        <div className="flex justify-end">
                            <Button
                                onClick={() =>
                                    router.post(`/admin/compliance/evaluate/${vendor?.id}`)
                                }
                            >
                                Run Evaluation
                            </Button>
                        </div>
                    )}
                    {vendor?.compliance_results?.map((result) => (
                        <div
                            key={result.id}
                            className={`glass-card p-4 border-l-4 ${result.status === 'pass' ? 'border-l-status-success' : result.status === 'warning' ? 'border-l-status-warning' : 'border-l-status-danger'}`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-(--color-text-primary) font-medium">
                                        {/* Start Update 15 September 2026, by @WNP: Translate system rule labels and preserve custom names. */}
                                        {translateSystemMasterDataField(
                                            language,
                                            'compliance_rules',
                                            result.rule,
                                            'display_name',
                                            result.rule?.name
                                        )}
                                    </div>
                                    <div className="text-sm text-(--color-text-secondary)">
                                        {result.details}
                                    </div>
                                </div>
                                <Badge status={result.status} />
                            </div>
                        </div>
                    ))}
                    {(!vendor?.compliance_results || vendor.compliance_results.length === 0) && (
                        <div className="text-center text-(--color-text-secondary) py-8">
                            {t('No compliance results yet')}
                        </div>
                    )}
                </div>
            )}

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
                <Card>
                    <div className="p-6 space-y-0">
                        {vendor?.state_logs?.map((log, idx) => (
                            <div key={log.id} className="relative pl-8 pb-6 last:pb-0">
                                {idx < vendor.state_logs.length - 1 && (
                                    <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-(--color-bg-muted)" />
                                )}
                                <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-(--color-brand-primary)/20 flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-(--color-brand-primary)" />
                                </div>
                                <div className="bg-(--color-bg-secondary)/80 rounded-lg p-4 border border-(--color-border-secondary)">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-(--color-text-secondary)">
                                            {t(log.from_status?.replaceAll('_', ' '))}
                                        </span>
                                        <span className="text-(--color-text-tertiary)">
                                            {t('to')}
                                        </span>
                                        <span className="text-(--color-text-primary) font-medium">
                                            {t(log.to_status?.replaceAll('_', ' '))}
                                        </span>
                                    </div>
                                    <div className="text-xs text-(--color-text-tertiary)">
                                        {t('by')} {log.user?.name} -{' '}
                                        {formatDateTime(log.created_at, dateLocale)}
                                    </div>
                                    {log.comment && (
                                        <div className="text-sm text-(--color-text-secondary) mt-2">
                                            {/* Start Update 13 September 2026, by @WNP: Keep free-text comments raw and localize verified system comments. */}
                                            {translateTimelineComment(language, log)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Internal Notes Tab */}
            {activeTab === 'notes' && can.edit_vendor_notes && (
                <Card title="Internal Notes">
                    <div className="p-6">
                        <p className="text-sm text-(--color-danger) mb-4">
                            {t('Warning: these notes are not visible to the vendor.')}
                        </p>
                        <form onSubmit={saveNotes}>
                            <textarea
                                value={notesForm.data.internal_notes}
                                onChange={(e) =>
                                    notesForm.setData('internal_notes', e.target.value)
                                }
                                className="input-field w-full h-48"
                                placeholder={t('Add internal notes about this vendor...')}
                            />
                            <div className="flex justify-end mt-4">
                                <Button type="submit" disabled={notesForm.processing}>
                                    {notesForm.processing ? 'Saving...' : 'Save Notes'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </Card>
            )}

            {/* Feature 4: Document Rejection Modal (replaces browser prompt) */}
            <Modal
                isOpen={showDocRejectModal}
                onClose={() => setShowDocRejectModal(false)}
                title="Reject Document"
                footer={
                    <>
                        <ModalCancelButton onClick={() => setShowDocRejectModal(false)} />
                        <ModalPrimaryButton
                            variant="danger"
                            onClick={handleDocReject}
                            disabled={!docRejectReason.trim()}
                        >
                            Reject Document
                        </ModalPrimaryButton>
                    </>
                }
            >
                <FormTextarea
                    label="Reason for Rejection *"
                    value={docRejectReason}
                    onChange={setDocRejectReason}
                    placeholder="Please provide a reason for rejection..."
                    required
                />
            </Modal>

            {/* Vendor Action Modal */}
            <Modal
                isOpen={!!showActionModal}
                onClose={closeActionModal}
                title={`${t(actionLabels[showActionModal] ?? 'Update')} ${t('Vendor')}`}
                footer={
                    <>
                        <ModalCancelButton onClick={closeActionModal} />
                        <ModalPrimaryButton
                            variant={
                                showActionModal === 'approve' || showActionModal === 'activate'
                                    ? 'success'
                                    : 'danger'
                            }
                            onClick={() => handleAction(showActionModal)}
                            disabled={actionForm.processing}
                        >
                            {actionForm.processing
                                ? t('Processing...')
                                : t(actionLabels[showActionModal] ?? 'Submit')}
                        </ModalPrimaryButton>
                    </>
                }
            >
                <FormTextarea
                    label={`${t('Comment')} ${isCommentRequired ? '*' : t('(optional)')}`}
                    value={actionForm.data.comment}
                    onChange={(val) => actionForm.setData('comment', val)}
                    placeholder={t('Add a comment...')}
                    required={isCommentRequired}
                />
                {/* Start Update 14 September 2026, by @WNP: Surface VMS activation, suspension, and termination failures in the modal. */}
                {Object.entries(actionForm.errors).map(([field, message]) => (
                    <p
                        key={field}
                        role="alert"
                        className="mt-3 rounded-lg border border-(--color-danger) bg-(--color-danger-light) px-3 py-2 text-sm text-(--color-danger-dark)"
                    >
                        {t(message)}
                    </p>
                ))}
            </Modal>

            {/* Feature 2: Document Viewer */}
            <DocumentViewer
                key={viewerDocument?.id ?? 'none'}
                document={viewerDocument}
                isOpen={showDocViewer}
                onClose={() => {
                    setShowDocViewer(false);
                    setViewerDocument(null);
                }}
            />
        </AdminLayout>
    );
}
