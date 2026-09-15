import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    AdminLayout,
    PageHeader,
    DataTable,
    Button,
    Badge,
    Modal,
    ModalCancelButton,
    ModalPrimaryButton,
    FormTextarea,
} from '@/Components';
import { DocumentViewer } from '@/Components/DocumentViewer';
// Start Update 12 September 2026, by @WNP: Use shared language state for document filters and actions.
import { useLanguage } from '@/Contexts/LanguageContext';
// Start Update 15 September 2026, by @WNP: Resolve fixed master document labels through one shared helper.
import { translateDocumentTypeLabel } from '@/i18n/documentTypes';
// Start Update 12 September 2026, by @WNP: Format admin document upload dates in the selected locale.
import { formatDate, formatDateTime } from '@/utils/dateFormatters';

const statusFilters = [
    { value: 'pending', label: 'Pending' },
    { value: 'verified', label: 'Verified' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'expired', label: 'Expired' },
    { value: 'all', label: 'All' },
];

export default function DocumentsIndex({ documents, currentStatus = 'pending' }) {
    // Start Update 12 September 2026, by @WNP: Translate document-specific labels and expiry descriptions.
    const { language, t } = useLanguage();
    const dateLocale = language === 'id' ? 'id-ID' : 'en-IN';
    const { auth } = usePage().props;
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
                <span className="text-(--color-text-primary) font-medium">
                    {row.vendor?.company_name}
                </span>
            ),
        },
        {
            header: 'Document Type',
            render: (row) => (
                <span className="text-(--color-text-secondary)">
                    {/* Start Update 15 September 2026, by @WNP: Translate system master labels without translating custom database values. */}
                    {translateDocumentTypeLabel(language, row.document_type)}
                </span>
            ),
        },
        {
            header: 'File',
            render: (row) => (
                <a
                    href={`/documents/${row.id}/download`}
                    className="text-(--color-brand-primary) hover:underline"
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
            <div className="flex gap-2 justify-end items-center">
                <button
                    onClick={() => {
                        setViewerDocument({
                            ...row,
                            preview_url: `/admin/documents/${row.id}/preview`,
                            download_url: `/documents/${row.id}/download`,
                        });
                        setShowViewer(true);
                    }}
                    className="px-3 py-1.5 text-sm font-medium text-(--color-brand-primary) hover:text-(--color-brand-primary-hover) hover:bg-(--color-brand-primary-light) rounded-lg transition-colors"
                >
                    {t('View')}
                </button>
                {row.verification_status === 'pending' && (
                    <>
                        {can.verify_documents && (
                            <Button
                                variant="success"
                                size="sm"
                                onClick={() => verifyDocument(row.id)}
                                disabled={processingDocId === row.id}
                            >
                                Verify
                            </Button>
                        )}
                        {can.reject_documents && (
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => {
                                    setSelectedDoc(row.id);
                                    setShowRejectModal(true);
                                }}
                                disabled={processingDocId === row.id}
                            >
                                Reject
                            </Button>
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

    const header = (
        <PageHeader title="Document Verification" subtitle="Review and verify vendor documents" />
    );

    return (
        <AdminLayout title="Document Verification" activeNav="Documents" header={header}>
            <div className="mb-6">
                <div className="inline-flex gap-2 flex-wrap p-1 bg-(--color-bg-tertiary) rounded-xl">
                    {statusFilters.map((status) => (
                        <Link
                            key={status.value}
                            href={`/admin/documents?status=${status.value}`}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                currentStatus === status.value
                                    ? 'bg-(--color-bg-primary) text-(--color-text-primary) shadow-token-sm'
                                    : 'text-(--color-text-tertiary) hover:text-(--color-text-primary) hover:bg-(--color-bg-primary)/50'
                            }`}
                            preserveScroll
                        >
                            {/* Start Update 12 September 2026, by @WNP: Translate the document status tab, not its URL value. */}
                            {t(status.label)}
                        </Link>
                    ))}
                </div>
            </div>

            {/* Scrollable Document List with sticky header */}
            <DataTable
                columns={columns}
                data={documents?.data || []}
                links={documents?.links || []}
                emptyIcon="success"
                emptyMessage={
                    currentStatus === 'pending'
                        ? 'All pending documents have been reviewed.'
                        : 'No documents found for this filter.'
                }
                stickyHeader={true}
            />

            {/* Reject Modal */}
            <Modal
                isOpen={showRejectModal && can.reject_documents}
                onClose={closeRejectModal}
                title="Reject Document"
                footer={
                    <>
                        <ModalCancelButton onClick={closeRejectModal} />
                        <ModalPrimaryButton
                            variant="danger"
                            onClick={rejectDocument}
                            disabled={!rejectReason.trim() || processingDocId === selectedDoc}
                        >
                            Reject Document
                        </ModalPrimaryButton>
                    </>
                }
            >
                <FormTextarea
                    label="Reason for Rejection"
                    value={rejectReason}
                    onChange={setRejectReason}
                    placeholder="Please provide a reason for rejection..."
                    required
                />
            </Modal>

            {/* Document Viewer Modal */}
            <DocumentViewer
                key={viewerDocument?.id ?? 'none'}
                document={viewerDocument}
                isOpen={showViewer}
                onClose={() => {
                    setShowViewer(false);
                    setViewerDocument(null);
                }}
            />
        </AdminLayout>
    );
}
