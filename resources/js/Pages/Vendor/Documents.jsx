import { useForm } from '@inertiajs/react';
import { useMemo, useRef, useState } from 'react';
import {
    VendorLayout,
    PageHeader,
    Card,
    Badge,
    Button,
    FormSelect,
    AppIcon,
    Modal,
    ModalCancelButton,
    ModalPrimaryButton,
} from '@/Components';
import { DocumentViewer } from '@/Components/DocumentViewer';
import { formatDate, formatDateTime } from '@/utils/dateFormatters';
// Start Update 12 September 2026, by @WNP: Translate the vendor document list and upload flow.
import { useLanguage } from '@/Contexts/LanguageContext';
// Start Update 15 September 2026, by @WNP: Reuse selective document master-data localization across the list and form.
import { translateDocumentTypeLabel } from '@/i18n/documentTypes';

export default function Documents({ vendor, documents = [], documentTypes = [] }) {
    // Start Update 12 September 2026, by @WNP: Keep document copy reactive to the global language switch.
    const { language, t } = useLanguage();
    const dateLocale = language === 'id' ? 'id-ID' : 'en-IN';
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [showViewer, setShowViewer] = useState(false);
    const fileInputRef = useRef(null);

    const uploadForm = useForm({
        document_type_id: '',
        file: null,
        expiry_date: '',
    });

    const selectedDocumentType = useMemo(
        () =>
            (documentTypes || []).find(
                (type) => String(type.id) === String(uploadForm.data.document_type_id)
            ) || null,
        [documentTypes, uploadForm.data.document_type_id]
    );

    const requiresExpiryDate = Boolean(selectedDocumentType?.has_expiry);

    const getExpiryMeta = (doc) => {
        if (!doc?.expiry_date) {
            return {
                text: t('No expiry'),
                toneClass: 'text-(--color-text-muted)',
                badgeStatus: 'info',
            };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiry = new Date(`${doc.expiry_date}T00:00:00`);
        const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);

        if (doc.verification_status === 'expired' || diffDays < 0) {
            return {
                text: t('Expired on :date', { date: formatDate(doc.expiry_date, dateLocale) }),
                toneClass: 'text-(--color-danger)',
                badgeStatus: 'error',
            };
        }

        if (diffDays <= 30) {
            return {
                text: t(
                    diffDays === 1
                        ? 'Expires in :count day (:date)'
                        : 'Expires in :count days (:date)',
                    { count: diffDays, date: formatDate(doc.expiry_date, dateLocale) }
                ),
                toneClass: 'text-(--color-warning)',
                badgeStatus: 'warning',
            };
        }

        return {
            text: t('Valid until :date', { date: formatDate(doc.expiry_date, dateLocale) }),
            toneClass: 'text-(--color-success)',
            badgeStatus: 'success',
        };
    };

    const resetUploadForm = () => {
        uploadForm.reset();
        uploadForm.clearErrors();
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const closeUploadModal = () => {
        setShowUploadModal(false);
        resetUploadForm();
    };

    const handleUpload = (e) => {
        e.preventDefault();
        uploadForm.post('/vendor/documents/upload', {
            preserveScroll: true,
            preserveState: 'errors',
            onSuccess: closeUploadModal,
        });
    };

    const displayDocuments = documents;
    const stats = {
        total: displayDocuments.length,
        verified: displayDocuments.filter((doc) => doc.verification_status === 'verified').length,
        pending: displayDocuments.filter((doc) => doc.verification_status === 'pending').length,
        rejected: displayDocuments.filter((doc) => doc.verification_status === 'rejected').length,
        expired: displayDocuments.filter(
            (doc) =>
                doc.verification_status === 'expired' || getExpiryMeta(doc).badgeStatus === 'error'
        ).length,
    };

    const isUploadDisabled =
        uploadForm.processing ||
        !uploadForm.data.document_type_id ||
        !uploadForm.data.file ||
        (requiresExpiryDate && !uploadForm.data.expiry_date);

    const header = (
        <PageHeader
            title="Documents"
            subtitle="Manage your uploaded documents"
            actions={
                <Button onClick={() => setShowUploadModal(true)}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 4v16m8-8H4"
                        />
                    </svg>
                    {t('Upload Document')}
                </Button>
            }
        />
    );

    return (
        <VendorLayout title="Documents" activeNav="Documents" header={header} vendor={vendor}>
            <div className="space-y-8">
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                    <div className="bg-(--color-bg-primary) border border-(--color-border-primary) rounded-xl p-4 text-center shadow-token-sm">
                        <div className="text-3xl mb-2 inline-flex justify-center w-full">
                            <AppIcon name="documents" className="h-8 w-8" />
                        </div>
                        <div className="text-2xl font-bold text-(--color-text-primary)">
                            {stats.total}
                        </div>
                        <div className="text-sm text-(--color-text-tertiary)">
                            {t('Total Documents')}
                        </div>
                    </div>
                    <div className="bg-(--color-bg-primary) border border-(--color-border-primary) rounded-xl p-4 text-center shadow-token-sm">
                        <div className="text-3xl mb-2 inline-flex justify-center w-full">
                            <AppIcon name="success" className="h-8 w-8 text-(--color-success)" />
                        </div>
                        <div className="text-2xl font-bold text-(--color-success)">
                            {stats.verified}
                        </div>
                        <div className="text-sm text-(--color-text-tertiary)">{t('Verified')}</div>
                    </div>
                    <div className="bg-(--color-bg-primary) border border-(--color-border-primary) rounded-xl p-4 text-center shadow-token-sm">
                        <div className="text-3xl mb-2 inline-flex justify-center w-full">
                            <AppIcon name="clock" className="h-8 w-8 text-(--color-warning)" />
                        </div>
                        <div className="text-2xl font-bold text-(--color-warning)">
                            {stats.pending}
                        </div>
                        <div className="text-sm text-(--color-text-tertiary)">{t('Pending')}</div>
                    </div>
                    <div className="bg-(--color-bg-primary) border border-(--color-border-primary) rounded-xl p-4 text-center shadow-token-sm">
                        <div className="text-3xl mb-2 inline-flex justify-center w-full">
                            <AppIcon name="x-mark" className="h-8 w-8 text-(--color-danger)" />
                        </div>
                        <div className="text-2xl font-bold text-(--color-danger)">
                            {stats.rejected}
                        </div>
                        <div className="text-sm text-(--color-text-tertiary)">{t('Rejected')}</div>
                    </div>
                    <div className="bg-(--color-bg-primary) border border-(--color-border-primary) rounded-xl p-4 text-center shadow-token-sm">
                        <div className="text-3xl mb-2 inline-flex justify-center w-full">
                            <AppIcon name="error" className="h-8 w-8 text-(--color-danger)" />
                        </div>
                        <div className="text-2xl font-bold text-(--color-danger)">
                            {stats.expired}
                        </div>
                        <div className="text-sm text-(--color-text-tertiary)">{t('Expired')}</div>
                    </div>
                </div>

                {/* Start Update 12 September 2026, by @WNP: Localize the document count without changing its numeric value. */}
                <Card title={t('All Documents (:count)', { count: displayDocuments.length })}>
                    {displayDocuments.length === 0 ? (
                        <div className="p-8 text-center text-(--color-text-tertiary)">
                            <div className="text-4xl mb-4 inline-flex justify-center w-full">
                                <AppIcon name="documents" className="h-10 w-10" />
                            </div>
                            <p>{t('No documents uploaded yet.')}</p>
                        </div>
                    ) : (
                        <div className="max-h-[500px] overflow-y-auto divide-y divide-(--color-border-secondary)">
                            {displayDocuments.map((doc) => (
                                <div
                                    key={doc.id}
                                    className="p-4 transition-colors hover:bg-(--color-bg-hover)"
                                >
                                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-12 h-12 rounded-xl bg-(--color-bg-secondary) border border-(--color-border-secondary) flex items-center justify-center">
                                                <AppIcon name="documents" className="h-6 w-6" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-(--color-text-primary) font-medium">
                                                    {/* Start Update 15 September 2026, by @WNP: Translate fixed master labels while retaining custom names verbatim. */}
                                                    {translateDocumentTypeLabel(
                                                        language,
                                                        doc.document_type,
                                                        t('Document')
                                                    )}
                                                </div>
                                                <div
                                                    className="text-sm text-(--color-text-tertiary) truncate"
                                                    title={doc.file_name}
                                                >
                                                    {doc.file_name}
                                                </div>
                                                <div className="text-xs text-(--color-text-muted) mt-0.5">
                                                    {t('Uploaded:')}{' '}
                                                    {formatDateTime(doc.created_at, dateLocale)}
                                                </div>
                                                <div
                                                    className={`text-xs mt-0.5 ${getExpiryMeta(doc).toneClass}`}
                                                >
                                                    {getExpiryMeta(doc).text}
                                                </div>
                                                {doc.verification_status === 'rejected' &&
                                                    doc.verification_notes && (
                                                        <div className="text-xs text-(--color-danger) mt-1">
                                                            {t('Rejection reason:')}{' '}
                                                            {doc.verification_notes}
                                                        </div>
                                                    )}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 md:justify-end">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedDocument({
                                                        ...doc,
                                                        preview_url: `/documents/${doc.id}/view`,
                                                        download_url: `/documents/${doc.id}/download`,
                                                    });
                                                    setShowViewer(true);
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
                                            <Badge status={doc.verification_status} />
                                            {doc.verification_status === 'rejected' && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        uploadForm.setData(
                                                            'document_type_id',
                                                            String(doc.document_type_id)
                                                        );
                                                        setShowUploadModal(true);
                                                    }}
                                                    className="px-3 py-1.5 text-sm font-medium text-(--color-warning) hover:text-(--color-warning-dark) hover:bg-(--color-warning-light) rounded-lg transition-colors"
                                                >
                                                    {t('Re-upload')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            <Modal
                isOpen={showUploadModal}
                onClose={closeUploadModal}
                title="Upload Document"
                footer={
                    <>
                        <ModalCancelButton onClick={closeUploadModal} />
                        <ModalPrimaryButton onClick={handleUpload} disabled={isUploadDisabled}>
                            {uploadForm.processing ? t('Uploading...') : t('Upload')}
                        </ModalPrimaryButton>
                    </>
                }
            >
                <div className="space-y-4">
                    {/* Start Update 15 September 2026, by @WNP: Localize only system-defined document options. */}
                    <FormSelect
                        label="Document Type"
                        value={uploadForm.data.document_type_id}
                        onChange={(val) => uploadForm.setData('document_type_id', val)}
                        translateOptions={false}
                        options={documentTypes.map((type) => ({
                            value: type.id,
                            label: translateDocumentTypeLabel(language, type),
                        }))}
                        placeholder="Select document type"
                        required
                    />
                    {uploadForm.errors.document_type_id && (
                        <p className="text-sm text-(--color-danger)">
                            {uploadForm.errors.document_type_id}
                        </p>
                    )}

                    <div>
                        <label className="text-sm font-medium text-(--color-text-secondary) mb-2 block">
                            {t('Expiry Date')} {requiresExpiryDate ? '' : t('(Optional)')}
                        </label>
                        <input
                            type="date"
                            value={uploadForm.data.expiry_date}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={(event) =>
                                uploadForm.setData('expiry_date', event.target.value)
                            }
                            className="w-full bg-(--color-bg-primary) border-2 border-(--color-border-primary) rounded-xl px-4 py-3 text-(--color-text-primary) focus:outline-none focus:border-(--color-brand-primary)"
                            required={requiresExpiryDate}
                        />
                        <p className="text-xs text-(--color-text-muted) mt-1">
                            {t(
                                requiresExpiryDate
                                    ? 'This document type requires a valid expiry date.'
                                    : 'Set expiry date if this document has a validity period.'
                            )}
                        </p>
                        {uploadForm.errors.expiry_date && (
                            <p className="text-sm text-(--color-danger) mt-1">
                                {uploadForm.errors.expiry_date}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="text-sm font-medium text-(--color-text-secondary) mb-2 block">
                            {t('File')}
                        </label>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={(e) => uploadForm.setData('file', e.target.files[0])}
                            className="w-full bg-(--color-bg-primary) border-2 border-(--color-border-primary) rounded-xl px-4 py-3 text-(--color-text-primary) file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-(--color-brand-primary)/10 file:text-(--color-brand-primary) hover:file:bg-(--color-brand-primary)/20 transition-all"
                            accept=".pdf,.jpg,.jpeg,.png"
                            required
                        />
                        <p className="text-xs text-(--color-text-muted) mt-1">
                            {t('PDF, JPG, PNG up to 10MB')}
                        </p>
                        {uploadForm.errors.file && (
                            <p className="text-sm text-(--color-danger) mt-1">
                                {uploadForm.errors.file}
                            </p>
                        )}
                    </div>
                    {/* Start Update 12 September 2026, by @WNP: Localize document upload errors from the application. */}
                    {uploadForm.errors.upload && (
                        <p className="text-sm text-(--color-danger)">
                            {t(uploadForm.errors.upload)}
                        </p>
                    )}
                </div>
            </Modal>

            <DocumentViewer
                key={selectedDocument?.id ?? 'none'}
                document={selectedDocument}
                isOpen={showViewer}
                onClose={() => {
                    setShowViewer(false);
                    setSelectedDocument(null);
                }}
            />
        </VendorLayout>
    );
}
