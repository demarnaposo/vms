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
    FormSelect,
    AppIcon,
} from '@/Components';
import { DocumentViewer } from '@/Components/DocumentViewer';
// Use shared language state for document filters and actions.
import { useLanguage } from '@/Contexts/LanguageContext';
// Resolve fixed master document labels through one shared helper.
import { translateDocumentTypeLabel } from '@/i18n/documentTypes';
// Format admin document upload dates in the selected locale.
import { formatDate, formatDateTime } from '@/utils/dateFormatters';

const statusFilters = [
    { value: 'pending', label: 'Pending' },
    { value: 'verified', label: 'Verified' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'expired', label: 'Expired' },
    { value: 'all', label: 'All' },
];

export default function DocumentsIndex({
    documents,
    currentStatus = 'pending',
    filters = {},
    documentTypes = [],
}) {
    // Translate document-specific labels and expiry descriptions.
    const { language, t } = useLanguage();
    const dateLocale = language === 'id' ? 'id-ID' : 'en-IN';
    const { auth, errors } = usePage().props;
    const can = auth?.can || {};

    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [processingDocId, setProcessingDocId] = useState(null);
    const [showViewer, setShowViewer] = useState(false);
    const [viewerDocument, setViewerDocument] = useState(null);

    const closeRejectModal = () => {
        setShowRejectModal(false);
        setSelectedDoc(null);
        setRejectReason('');
    };

    const formatExpiry = (row) => {
        if (!row.expiry_date) {
            return {
                text: t('No expiry'),
                toneClass: 'text-(--color-text-muted)',
            };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiry = new Date(`${row.expiry_date}T00:00:00`);
        const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);

        if (row.verification_status === 'expired' || diffDays < 0) {
            return {
                text: t('Expired (:date)', { date: formatDate(row.expiry_date, dateLocale) }),
                toneClass: 'text-(--color-danger)',
            };
        }

        if (diffDays <= 30) {
            return {
                text: t(diffDays === 1 ? ':count day left' : ':count days left', {
                    count: diffDays,
                }),
                toneClass: 'text-(--color-warning)',
            };
        }

        return {
            text: formatDate(row.expiry_date, dateLocale),
            toneClass: 'text-(--color-success)',
        };
    };

    const verifyDocument = (docId) => {
        setProcessingDocId(docId);

        router.post(
            `/admin/documents/${docId}/verify`,
            {},
            {
                preserveScroll: true,
                preserveState: false,
                onFinish: () => setProcessingDocId(null),
            }
        );
    };

    const rejectDocument = () => {
        if (!selectedDoc || !rejectReason.trim()) {
            return;
        }

        setProcessingDocId(selectedDoc);
        router.post(
            `/admin/documents/${selectedDoc}/reject`,
            { reason: rejectReason },
            {
                preserveScroll: true,
                preserveState: false,
                onSuccess: closeRejectModal,
                onFinish: () => setProcessingDocId(null),
            }
        );
    };

    const columns = [
        {
            header: 'Vendor',
            render: (row) => (
                <span className="min-w-0 [overflow-wrap:anywhere] text-(--color-text-primary) font-medium">
                    {row.vendor?.company_name}
                </span>
            ),
        },
        {
            header: 'Document Type',
            render: (row) => (
                <span className="[overflow-wrap:anywhere] text-(--color-text-secondary)">
                    {/* Translate system master labels without translating custom database values. */}
                    {translateDocumentTypeLabel(language, row.document_type)}
                </span>
            ),
        },
        {
            header: 'File',
            render: (row) => (
                <a
                    href={`/documents/${row.id}/download`}
                    className="[overflow-wrap:anywhere] text-(--color-brand-primary) hover:underline focus-visible:outline-2 focus-visible:outline-(--color-brand-primary)"
                    target="_blank"
                    rel="noreferrer"
                >
                    {row.file_name}
                </a>
            ),
        },
        {
            header: 'Uploaded',
            render: (row) => (
                <span className="text-(--color-text-tertiary) text-sm">
                    {formatDateTime(row.created_at, dateLocale)}
                </span>
            ),
        },
        {
            header: 'Expiry',
            render: (row) => {
                const expiry = formatExpiry(row);

                return <span className={`text-sm ${expiry.toneClass}`}>{expiry.text}</span>;
            },
        },
        {
            header: 'Status',
            render: (row) => <Badge status={row.verification_status} />,
        },
    ];

    // Add actions column with View button (always) and Verify/Reject buttons (if permission)
    columns.push({
        header: 'Actions',
        align: 'right',
        render: (row) => (
            <div className="flex min-w-0 flex-wrap gap-2 justify-end items-center [&>button]:min-h-9 [&>button]:justify-center">
                <ActionButton
                    variant="outline"
                    onClick={() => {
                        setViewerDocument({
                            ...row,
                            preview_url: `/admin/documents/${row.id}/preview`,
                            download_url: `/documents/${row.id}/download`,
                        });
                        setShowViewer(true);
                    }}
                >
                    {t('View')}
                </ActionButton>
                {row.verification_status === 'pending' && row.is_current && (
                    <>
                        {can.verify_documents && (
                            <ActionButton
                                variant="success"
                                onClick={() => verifyDocument(row.id)}
                                disabled={processingDocId === row.id}
                                disabledReason={'A request is in progress. Please wait.'}
                            >
                                Verify
                            </ActionButton>
                        )}
                        {can.reject_documents && (
                            <ActionButton
                                variant="danger"
                                onClick={() => {
                                    setSelectedDoc(row.id);
                                    setShowRejectModal(true);
                                }}
                                disabled={processingDocId === row.id}
                                disabledReason={'A request is in progress. Please wait.'}
                            >
                                Reject
                            </ActionButton>
                        )}
                    </>
                )}
                {row.verification_status !== 'pending' && (
                    <span className="text-xs text-(--color-text-tertiary) italic">
                        {t('Reviewed')}
                    </span>
                )}
            </div>
        ),
    });

    const filterParams = {
        status: currentStatus,
        ...(filters.search ? { search: filters.search } : {}),
        ...(filters.document_type_id ? { document_type_id: filters.document_type_id } : {}),
    };
    const changeDocumentType = (value) => {
        const params = { ...filterParams };
        if (value) params.document_type_id = value;
        else delete params.document_type_id;
        router.get('/admin/documents', params, { preserveScroll: true });
    };

    const header = (
        <PageHeader title="Document Verification" subtitle="Review and verify vendor documents" />
    );

    return (
        <AdminLayout title="Document Verification" activeNav="Documents" header={header}>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                <div className="inline-flex gap-2 flex-wrap p-1 bg-(--color-bg-tertiary) rounded-xl">
                    {statusFilters.map((status) => (
                        <Link
                            key={status.value}
                            href={`/admin/documents?${new URLSearchParams({ ...filterParams, status: status.value })}`}
                            aria-current={currentStatus === status.value ? 'page' : undefined}
                            className={`staff-status-filter px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-(--color-brand-primary) focus-visible:ring-offset-2 ${
                                currentStatus === status.value
                                    ? 'theme-primary-action shadow-token-primary'
                                    : 'text-(--color-text-tertiary) hover:bg-(--color-bg-primary)'
                            }`}
                            preserveScroll
                        >
                            {/* Translate the document status tab, not its URL value. */}
                            {t(status.label)}
                        </Link>
                    ))}
                </div>
                <div className="flex w-full min-w-0 items-start gap-2 sm:ml-auto sm:w-auto sm:pt-1">
                    <FormSelect
                        size="compact"
                        className="min-w-0 flex-1 sm:w-52 sm:flex-none [&_label]:sr-only"
                        name="document_type_id"
                        placeholder="All Documents"
                        label="Document Type"
                        value={filters.document_type_id ?? ''}
                        onChange={changeDocumentType}
                        translateOptions={false}
                        error={errors?.document_type_id}
                        options={documentTypes.map((type) => ({
                            value: type.id,
                            label: translateDocumentTypeLabel(language, type),
                        }))}
                    />
                    {(filters.document_type_id ||
                        filters.search ||
                        currentStatus !== 'pending') && (
                        <ActionButton
                            variant="primary"
                            className="h-9 w-9 shrink-0 justify-center"
                            aria-label={t('Reset')}
                            title={t('Reset')}
                            onClick={() =>
                                router.get('/admin/documents', {}, { preserveScroll: true })
                            }
                        >
                            <AppIcon name="reset" className="h-5 w-5" />
                        </ActionButton>
                    )}
                </div>
            </div>

            {/* Scrollable Document List with sticky header */}
            <div className="min-w-0 [&_table]:min-w-[960px] [&_table]:table-fixed [&_td]:[overflow-wrap:anywhere] [&_nav]:flex [&_nav]:flex-wrap [&_nav]:gap-1 [&_nav]:space-x-0 [&_nav_a]:focus-visible:outline-2">
                <DataTable
                    columns={columns}
                    data={documents?.data || []}
                    links={documents?.links || []}
                    emptyIcon="success"
                    emptyMessage={
                        currentStatus === 'pending' && !filters.document_type_id && !filters.search
                            ? 'All pending documents have been reviewed.'
                            : 'No documents found for this filter.'
                    }
                    stickyHeader={true}
                />
            </div>

            {/* Reject Modal */}
            <div className="[&_.glass-modal]:max-h-[calc(100vh-2rem)] [&_.glass-modal]:overflow-y-auto [&_.glass-modal]:overscroll-contain [&_.glass-modal]:p-4 sm:[&_.glass-modal]:p-6 [&_.glass-modal_h3]:min-w-0 [&_.glass-modal_h3]:break-words">
                <Modal
                    isOpen={showRejectModal && can.reject_documents}
                    onClose={closeRejectModal}
                    title="Reject Document"
                    footer={
                        <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end [&>button]:min-h-9 [&>button]:min-w-0 [&>button]:whitespace-normal [&>button]:focus-visible:outline-2 [&>button]:focus-visible:outline-(--color-brand-primary)">
                            <ModalCancelButton onClick={closeRejectModal} />
                            <ModalPrimaryButton
                                variant="danger"
                                onClick={rejectDocument}
                                disabled={!rejectReason.trim() || processingDocId === selectedDoc}
                                disabledReason={
                                    processingDocId === selectedDoc
                                        ? 'A request is in progress. Please wait.'
                                        : 'Enter a rejection reason before continuing.'
                                }
                            >
                                Reject Document
                            </ModalPrimaryButton>
                        </div>
                    }
                >
                    <FormTextarea
                        label="Reason for Rejection"
                        value={rejectReason}
                        onChange={setRejectReason}
                        placeholder="Please provide a reason for rejection..."
                        showRequiredIndicator
                        error={errors?.reason}
                    />
                </Modal>
            </div>

            {/* Document Viewer Modal */}
            <div className="[&_.glass-modal]:min-w-0 [&_.glass-modal]:max-h-[calc(100vh-2rem)] [&_.glass-modal>div:first-child]:flex-wrap [&_.glass-modal>div:first-child]:gap-3 [&_.glass-modal>div:first-child>div]:max-w-full [&_.glass-modal>div:first-child>div]:min-w-0 [&_.glass-modal>div:first-child>div:first-child]:w-full sm:[&_.glass-modal>div:first-child>div:first-child]:w-auto [&_.glass-modal>div:first-child>div:first-child>span]:shrink-0 [&_.glass-modal>div:first-child>div]:flex-wrap [&_.glass-modal_a]:min-h-9 [&_.glass-modal_a]:justify-center [&_.glass-modal_button]:min-h-9 [&_.glass-modal_button]:min-w-9 [&_.glass-modal_a]:focus-visible:outline-2 [&_.glass-modal_button]:focus-visible:outline-2 [&_.glass-modal>div:nth-child(2)]:min-h-0 [&_.glass-modal>div:nth-child(2)]:overscroll-contain [&_.glass-modal_iframe]:min-h-[240px] sm:[&_.glass-modal_iframe]:min-h-[500px]">
                <DocumentViewer
                    key={viewerDocument?.id ?? 'none'}
                    document={viewerDocument}
                    isOpen={showViewer}
                    onClose={() => {
                        setShowViewer(false);
                        setViewerDocument(null);
                    }}
                />
            </div>
        </AdminLayout>
    );
}
