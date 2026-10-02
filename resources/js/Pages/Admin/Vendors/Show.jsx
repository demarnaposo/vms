import { ActionButton, ActionLink, ActionAnchor } from '@/Components/ActionControls';
import { router, useForm, usePage } from '@inertiajs/react';
// Guard vendor actions immediately before React processing state is rendered.
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
// Translate vendor detail tabs and its document review panel.
import { useLanguage } from '@/Contexts/LanguageContext';
// Translate only known automatic vendor timeline comments.
import { translateTimelineComment } from '@/i18n/timelineComments';
// Translate only fixed document types in vendor details.
import { translateDocumentTypeLabel } from '@/i18n/documentTypes';
// Localize recognized compliance master labels in the vendor tab.
// Reuse automatic compliance-detail translations in the vendor tab.
import { translateComplianceDetails } from '@/i18n/complianceDetails';
// Render fixed business-type codes as localized display labels.
import { translateBusinessType } from '@/i18n/businessTypes';
import { translateSystemMasterDataField } from '@/i18n/systemMasterData';

function DisabledActionTooltip({ disabled, content, children }) {
    const tooltipId = useId();
    const anchorRef = useRef(null);
    const tooltipRef = useRef(null);
    const [visible, setVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0, placement: 'top' });

    useLayoutEffect(() => {
        if (!visible || !disabled || !anchorRef.current || !tooltipRef.current) return;

        const anchor = anchorRef.current.getBoundingClientRect();
        const tooltip = tooltipRef.current.getBoundingClientRect();
        const gap = 8;
        const viewportPadding = 16;
        const placeBelow = anchor.top < tooltip.height + gap + viewportPadding;
        const left = Math.min(
            Math.max(anchor.right - tooltip.width, viewportPadding),
            window.innerWidth - tooltip.width - viewportPadding
        );

        setPosition({
            top: placeBelow ? anchor.bottom + gap : anchor.top - tooltip.height - gap,
            left,
            placement: placeBelow ? 'bottom' : 'top',
        });
    }, [disabled, visible, content]);

    const showTooltip = () => {
        if (disabled) setVisible(true);
    };

    const hideTooltip = () => setVisible(false);

    return (
        <span
            ref={anchorRef}
            className="inline-flex"
            tabIndex={disabled ? 0 : undefined}
            aria-disabled={disabled || undefined}
            aria-describedby={disabled ? tooltipId : undefined}
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
            onFocus={showTooltip}
            onBlur={hideTooltip}
            onKeyDown={(event) => {
                if (event.key === 'Escape') hideTooltip();
            }}
        >
            {children}
            {disabled &&
                visible &&
                createPortal(
                    <div
                        ref={tooltipRef}
                        id={tooltipId}
                        role="tooltip"
                        data-placement={position.placement}
                        className="fixed z-[100] w-72 max-w-[calc(100vw-2rem)] rounded-lg bg-gray-900 p-3 text-left text-xs text-white shadow-xl pointer-events-none"
                        style={{ top: position.top, left: position.left }}
                    >
                        {content}
                    </div>,
                    document.body
                )}
        </span>
    );
}

export default function VendorShow({
    vendor,
    docVerificationStatus = [],
    allMandatoryDocsVerified = true,
    activationReadiness = { allowed: false, reasons: [], minimum_compliance_score: 80 },
}) {
    // Use the active language for document-related detail copy.
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
    // Track evaluation requests so repeated clicks cannot submit concurrently.
    const evaluationForm = useForm({});
    const notesForm = useForm({ internal_notes: vendor?.internal_notes || '' });
    const isVendorActionProcessing = actionForm.processing || evaluationForm.processing;
    // Block rapid duplicate requests within the same render cycle.
    const vendorActionInFlight = useRef(false);

    // Keep VMS lifecycle errors scoped to the active confirmation modal.
    const closeActionModal = () => {
        actionForm.clearErrors();
        setShowActionModal(null);
    };

    const openActionModal = (action) => {
        if (vendorActionInFlight.current || isVendorActionProcessing) return;

        actionForm.clearErrors();
        setShowActionModal(action);
    };

    // Release the immediate request lock after every lifecycle response.
    const handleAction = (action) => {
        if (vendorActionInFlight.current || isVendorActionProcessing) return;

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

        vendorActionInFlight.current = true;
        actionForm.post(route, {
            onSuccess: () => {
                closeActionModal();
                actionForm.reset();
            },
            onFinish: () => {
                vendorActionInFlight.current = false;
            },
        });
    };

    // Submit one compliance evaluation at a time and keep the current tab visible.
    const runComplianceEvaluation = () => {
        if (!vendor?.id || vendorActionInFlight.current || isVendorActionProcessing) return;

        vendorActionInFlight.current = true;
        evaluationForm.post(`/admin/compliance/evaluate/${vendor.id}`, {
            preserveScroll: true,
            onFinish: () => {
                vendorActionInFlight.current = false;
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

    const isReadyForActivation = activationReadiness.allowed === true;
    const activationReasonLabels = {
        documents: 'All mandatory documents must be verified and valid before activation.',
        compliance:
            'The vendor must be compliant with a score of at least :score before activation.',
        flags: 'Resolve all open compliance issues before activation.',
    };
    const activationReasons = activationReadiness.reasons
        .map((reason) => activationReasonLabels[reason])
        .filter(Boolean);
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
        <div className="flex flex-wrap items-center gap-2">
            <ActionLink href="/admin/vendors" variant="outline">
                {t('Back')}
            </ActionLink>
            {canApprove && (
                <ActionButton
                    variant="success"
                    onClick={() => openActionModal('approve')}
                    disabled={isVendorActionProcessing}
                >
                    Approve
                </ActionButton>
            )}
            {canReject && (
                <ActionButton
                    variant="danger"
                    onClick={() => openActionModal('reject')}
                    disabled={isVendorActionProcessing}
                >
                    Reject
                </ActionButton>
            )}
            {canActivate && (
                <DisabledActionTooltip
                    disabled={!isReadyForActivation}
                    content={
                        <ul className="space-y-1" aria-label={t('Activation requirements')}>
                            {activationReasons.map((reason) => (
                                <li key={reason}>
                                    {t(reason, {
                                        score: activationReadiness.minimum_compliance_score,
                                    })}
                                </li>
                            ))}
                        </ul>
                    }
                >
                    <ActionButton
                        onClick={() => openActionModal('activate')}
                        disabled={!isReadyForActivation || isVendorActionProcessing}
                    >
                        Activate
                    </ActionButton>
                </DisabledActionTooltip>
            )}
            {canSuspend && (
                <ActionButton
                    variant="warning"
                    onClick={() => openActionModal('suspend')}
                    disabled={isVendorActionProcessing}
                >
                    Suspend
                </ActionButton>
            )}
            {canTerminate && (
                <ActionButton
                    variant="danger"
                    onClick={() => openActionModal('terminate')}
                    disabled={isVendorActionProcessing}
                >
                    Terminate
                </ActionButton>
            )}
            {canReactivate && (
                <ActionButton
                    variant="warning"
                    onClick={() => openActionModal('reactivate')}
                    disabled={isVendorActionProcessing}
                >
                    Reactivate
                </ActionButton>
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
                                ['Vendor ID', vendor?.vendor_number || '-'],
                                ['Company Name', vendor?.company_name],
                                // Display Indonesian vendor identifiers in the admin summary.
                                // Use complete identifier labels in the company summary.
                                [
                                    'Business Identification Number (NIB)',
                                    vendor?.business_identification_number || '-',
                                ],
                                ['Taxpayer Identification Number (NPWP)', vendor?.tax_id || '-'],
                                // Show the submitted deed number on the staff summary.
                                ['Deed of Establishment Number', vendor?.deed_number || '-'],
                                // Keep the stored code stable while showing its business label.
                                [
                                    'Business Type',
                                    translateBusinessType(language, vendor?.business_type),
                                ],
                                ['Category', vendor?.vendor_category?.display_name || '-'],
                                ['Experience', vendor?.experience || '-'],
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
                                ['WhatsApp Number', vendor?.contact_phone],
                                // Tampilkan alamat Indonesia lengkap pada detail vendor admin.
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
                                // Display Indonesian bank code terminology for admins.
                                ['Bank Code', vendor?.code_bank],
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
                                <ActionLink
                                    variant="primary"
                                    href={`/admin/performance/${vendor?.id}/rate`}
                                    className="mt-4 text-white!"
                                >
                                    {t('Rate Performance')}
                                </ActionLink>
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
                                                    {/* Localize recognized master labels in verification readiness. */}
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
                                                {/* Translate fixed master labels and preserve custom names. */}
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
                                            <div className="flex flex-wrap gap-2 justify-end">
                                                {/* Feature 2: View/Download buttons */}
                                                <ActionButton
                                                    variant="outline"
                                                    type="button"
                                                    onClick={() => {
                                                        setViewerDocument({
                                                            ...doc,
                                                            preview_url: `/admin/documents/${doc.id}/preview`,
                                                            download_url: `/documents/${doc.id}/download`,
                                                        });
                                                        setShowDocViewer(true);
                                                    }}
                                                >
                                                    {t('View')}
                                                </ActionButton>
                                                <ActionAnchor
                                                    variant="outline"
                                                    href={`/documents/${doc.id}/download`}
                                                >
                                                    {t('Download')}
                                                </ActionAnchor>
                                                {/* Verify/Reject buttons for pending documents */}
                                                {can.verify_documents &&
                                                    doc.verification_status === 'pending' && (
                                                        <>
                                                            <ActionButton
                                                                variant="success"
                                                                onClick={() =>
                                                                    router.post(
                                                                        `/admin/documents/${doc.id}/verify`,
                                                                        {},
                                                                        { preserveScroll: true }
                                                                    )
                                                                }
                                                            >
                                                                Verify
                                                            </ActionButton>
                                                            {/* Feature 4: Modal-based rejection */}
                                                            <ActionButton
                                                                variant="danger"
                                                                onClick={() => {
                                                                    setRejectDocId(doc.id);
                                                                    setDocRejectReason('');
                                                                    setShowDocRejectModal(true);
                                                                }}
                                                            >
                                                                Reject
                                                            </ActionButton>
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
                        <div className="flex flex-wrap justify-end">
                            <ActionButton
                                onClick={runComplianceEvaluation}
                                disabled={isVendorActionProcessing}
                            >
                                {evaluationForm.processing ? 'Evaluating...' : 'Run Evaluation'}
                            </ActionButton>
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
                                        {/* Translate system rule labels and preserve custom names. */}
                                        {translateSystemMasterDataField(
                                            language,
                                            'compliance_rules',
                                            result.rule,
                                            'display_name',
                                            result.rule?.name
                                        )}
                                    </div>
                                    <div className="text-sm text-(--color-text-secondary)">
                                        {/* Translate known system details and retain custom database text. */}
                                        {translateComplianceDetails(
                                            language,
                                            result.rule,
                                            result.details
                                        )}
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
                                            {/* Keep free-text comments raw and localize verified system comments. */}
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
                {/* Let the shared field render a single required marker. */}
                <FormTextarea
                    label="Reason for Rejection"
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
                            disabled={isVendorActionProcessing}
                        >
                            {actionForm.processing
                                ? t('Processing...')
                                : t(actionLabels[showActionModal] ?? 'Submit')}
                        </ModalPrimaryButton>
                    </>
                }
            >
                {/* Match lifecycle comment labels to backend required rules without duplicate markers. */}
                <FormTextarea
                    label={isCommentRequired ? 'Comment' : 'Comment (Optional)'}
                    value={actionForm.data.comment}
                    onChange={(val) => actionForm.setData('comment', val)}
                    placeholder={t('Add a comment...')}
                    required={isCommentRequired}
                />
                {/* Surface VMS activation, suspension, and termination failures in the modal. */}
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
