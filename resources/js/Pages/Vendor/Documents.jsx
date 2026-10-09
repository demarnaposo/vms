import VendorFormSelect from './Components/VendorFormSelect';
import { ActionButton, ActionAnchor } from '@/Components/ActionControls';
import { useForm } from '@inertiajs/react';
import { useId, useMemo, useRef, useState } from 'react';
import {
    VendorLayout,
    PageHeader,
    Card,
    Badge,
    AppIcon,
    Modal,
    ModalCancelButton,
    ModalPrimaryButton,
} from '@/Components';
import { DocumentViewer } from '@/Components/DocumentViewer';
import { formatDate, formatDateTime } from '@/utils/dateFormatters';
// Translate the vendor document list and upload flow.
import { useLanguage } from '@/Contexts/LanguageContext';
// Reuse selective document master-data localization across the list and form.
import { translateDocumentTypeLabel } from '@/i18n/documentTypes';

export default function Documents({ vendor, documents = [], documentTypes = [] }) {
    // Keep document copy reactive to the global language switch.
    const { language, t } = useLanguage();
    const dateLocale = language === 'id' ? 'id-ID' : 'en-IN';
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [showViewer, setShowViewer] = useState(false);
    const fileInputRef = useRef(null);
    const fileInputId = useId();
    const fileStatusId = `${fileInputId}-status`;
    const fileHintId = `${fileInputId}-hint`;
    const fileErrorId = `${fileInputId}-error`;

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

        if (diffDays <= (doc.document_type?.expiry_warning_days ?? 30)) {
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
                <ActionButton className="min-h-9" onClick={() => setShowUploadModal(true)}>
                    {t('Upload Document')}
                </ActionButton>
            }
        />
    );

    return (
        <VendorLayout title="Documents" activeNav="Documents" header={header} vendor={vendor}>
            <div className="min-w-0 space-y-6">
                <div className="grid min-w-0 grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5 [&>div]:min-w-0">
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

                {/* Localize the document count without changing its numeric value. */}
                <Card title={t('All Documents (:count)', { count: displayDocuments.length })}>
                    {displayDocuments.length === 0 ? (
                        <div className="p-8 text-center text-(--color-text-tertiary)">
                            <div className="text-4xl mb-4 inline-flex justify-center w-full">
                                <AppIcon name="documents" className="h-10 w-10" />
                            </div>
                            <p>{t('No documents uploaded yet.')}</p>
                        </div>
                    ) : (
                        <div className="min-w-0 max-h-[500px] overflow-y-auto overscroll-contain divide-y divide-(--color-border-secondary)">
                            {displayDocuments.map((doc) => (
                                <div
                                    key={doc.id}
                                    className="p-4 transition-colors hover:bg-(--color-bg-hover)"
                                >
                                    <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                                        <div className="flex items-start gap-3 min-w-0 xl:flex-1">
                                            <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-(--color-bg-secondary) border border-(--color-border-secondary) flex items-center justify-center">
                                                <AppIcon name="documents" className="h-6 w-6" />
                                            </div>
                                            <div className="min-w-0 [overflow-wrap:anywhere]">
                                                <div className="text-(--color-text-primary) font-medium">
                                                    {/* Translate fixed master labels while retaining custom names verbatim. */}
                                                    {translateDocumentTypeLabel(
                                                        language,
                                                        doc.document_type,
                                                        t('Document')
                                                    )}
                                                </div>
                                                <div
                                                    className="[overflow-wrap:anywhere] text-sm text-(--color-text-tertiary)"
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
                                        <div className="flex flex-wrap items-center gap-2 xl:justify-end [&>button]:min-h-9 [&>a]:min-h-9 [&>button]:justify-center [&>a]:justify-center">
                                            <ActionButton
                                                variant="outline"
                                                type="button"
                                                onClick={() => {
                                                    setSelectedDocument({
                                                        ...doc,
                                                        preview_url: `/documents/${doc.id}/view`,
                                                        download_url: `/documents/${doc.id}/download`,
                                                    });
                                                    setShowViewer(true);
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
                                            <Badge status={doc.verification_status} />
                                            {doc.verification_status === 'rejected' && (
                                                <ActionButton
                                                    variant="warning"
                                                    type="button"
                                                    onClick={() => {
                                                        uploadForm.setData(
                                                            'document_type_id',
                                                            String(doc.document_type_id)
                                                        );
                                                        setShowUploadModal(true);
                                                    }}
                                                >
                                                    {t('Re-upload')}
                                                </ActionButton>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            <div className="[&_.glass-modal]:max-h-[calc(100vh-2rem)] [&_.glass-modal]:overflow-y-auto [&_.glass-modal]:overscroll-contain [&_.glass-modal]:p-4 sm:[&_.glass-modal]:p-6 [&_.glass-modal_h3]:break-words">
                <Modal
                    isOpen={showUploadModal}
                    onClose={closeUploadModal}
                    title="Upload Document"
                    footer={
                        <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end [&>button]:min-h-9 [&>button]:whitespace-normal [&>button]:focus-visible:outline-2 [&>button]:focus-visible:outline-(--color-brand-primary)">
                            <ModalCancelButton onClick={closeUploadModal} />
                            <ModalPrimaryButton
                                onClick={handleUpload}
                                disabled={isUploadDisabled}
                                disabledReason={
                                    uploadForm.processing
                                        ? 'A request is in progress. Please wait.'
                                        : !uploadForm.data.document_type_id
                                          ? 'Select a document type before uploading.'
                                          : !uploadForm.data.file
                                            ? 'Select a file before uploading.'
                                            : 'Enter the document expiry date before uploading.'
                                }
                            >
                                {uploadForm.processing ? t('Uploading...') : t('Upload')}
                            </ModalPrimaryButton>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        {/* Localize only system-defined document options. */}
                        <VendorFormSelect
                            label="Document Type"
                            value={uploadForm.data.document_type_id}
                            onChange={(val) => {
                                uploadForm.setData({
                                    ...uploadForm.data,
                                    document_type_id: val,
                                    expiry_date: '',
                                    file: null,
                                });
                                if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            translateOptions={false}
                            options={documentTypes.map((type) => ({
                                value: type.id,
                                label: translateDocumentTypeLabel(language, type),
                            }))}
                            placeholder="Select document type"
                            showRequiredIndicator
                            error={uploadForm.errors.document_type_id}
                        />

                        <div hidden={!requiresExpiryDate}>
                            <label
                                htmlFor="document-expiry-date"
                                className="text-sm font-medium text-(--color-text-secondary) mb-2 block"
                            >
                                {t('Expiry Date')}{' '}
                                {requiresExpiryDate ? (
                                    <span className="text-(--color-danger)">*</span>
                                ) : (
                                    t('(Optional)')
                                )}
                            </label>
                            <input
                                id="document-expiry-date"
                                aria-required={requiresExpiryDate}
                                aria-invalid={!!uploadForm.errors.expiry_date}
                                aria-describedby={`document-expiry-hint${uploadForm.errors.expiry_date ? ' document-expiry-error' : ''}`}
                                type="date"
                                value={uploadForm.data.expiry_date}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={(event) =>
                                    uploadForm.setData('expiry_date', event.target.value)
                                }
                                className="w-full bg-(--color-bg-primary) border-2 border-(--color-border-primary) rounded-xl px-4 py-3 text-(--color-text-primary) focus:outline-none focus:border-(--color-brand-primary)"
                            />
                            <p
                                id="document-expiry-hint"
                                className="text-xs text-(--color-text-muted) mt-1"
                            >
                                {t(
                                    requiresExpiryDate
                                        ? 'This document type requires a valid expiry date.'
                                        : 'Set expiry date if this document has a validity period.'
                                )}
                            </p>
                            {uploadForm.errors.expiry_date && (
                                <p
                                    id="document-expiry-error"
                                    role="alert"
                                    className="text-sm text-(--color-danger) mt-1"
                                >
                                    {t(uploadForm.errors.expiry_date)}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor={fileInputId}
                                className="text-sm font-medium text-(--color-text-secondary) mb-2 block"
                            >
                                {t('File')} <span className="text-(--color-danger)">*</span>
                            </label>
                            <div className="flex min-w-0 flex-wrap items-center gap-3 bg-(--color-bg-primary) border-2 border-(--color-border-primary) rounded-xl px-4 py-3">
                                <input
                                    id={fileInputId}
                                    aria-invalid={Boolean(uploadForm.errors.file)}
                                    aria-describedby={`${fileStatusId} ${fileHintId}${uploadForm.errors.file ? ` ${fileErrorId}` : ''}`}
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={(e) =>
                                        uploadForm.setData('file', e.target.files[0] ?? null)
                                    }
                                    className="peer sr-only"
                                    accept={(
                                        selectedDocumentType?.allowed_extensions || [
                                            'pdf',
                                            'jpg',
                                            'jpeg',
                                            'png',
                                        ]
                                    )
                                        .map((extension) => `.${extension}`)
                                        .join(',')}
                                    aria-required="true"
                                />
                                <label
                                    htmlFor={fileInputId}
                                    className="inline-flex shrink-0 cursor-pointer items-center rounded-full bg-(--color-brand-primary)/10 px-4 py-2 text-sm font-semibold text-(--color-brand-primary) hover:bg-(--color-brand-primary)/20 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--color-brand-primary)"
                                >
                                    {t('Choose File')}
                                </label>
                                <span
                                    id={fileStatusId}
                                    aria-live="polite"
                                    className="min-w-0 flex-1 basis-32 break-all text-sm text-(--color-text-primary)"
                                >
                                    {uploadForm.data.file?.name ?? t('No file selected')}
                                </span>
                            </div>
                            <p id={fileHintId} className="text-xs text-(--color-text-muted) mt-1">
                                {t('Allowed: :formats. Maximum: :size MB.', {
                                    formats: (
                                        selectedDocumentType?.allowed_extensions || [
                                            'pdf',
                                            'jpg',
                                            'jpeg',
                                            'png',
                                        ]
                                    )
                                        .join(', ')
                                        .toUpperCase(),
                                    size: selectedDocumentType?.max_file_size_mb || 10,
                                })}
                            </p>
                            {uploadForm.errors.file && (
                                <p id={fileErrorId} className="text-sm text-(--color-danger) mt-1">
                                    {t(uploadForm.errors.file)}
                                </p>
                            )}
                        </div>
                        {/* Localize document upload errors from the application. */}
                        {uploadForm.errors.upload && (
                            <p className="text-sm text-(--color-danger)">
                                {t(uploadForm.errors.upload)}
                            </p>
                        )}
                    </div>
                </Modal>
            </div>

            <div className="[&_.glass-modal]:min-w-0 [&_.glass-modal]:max-h-[calc(100vh-2rem)] [&_.glass-modal>div:first-child]:flex-wrap [&_.glass-modal>div:first-child]:gap-3 [&_.glass-modal>div:first-child>div]:max-w-full [&_.glass-modal>div:first-child>div]:min-w-0 [&_.glass-modal>div:first-child>div:first-child]:w-full sm:[&_.glass-modal>div:first-child>div:first-child]:w-auto [&_.glass-modal>div:first-child>div:first-child>span]:shrink-0 [&_.glass-modal>div:first-child>div]:flex-wrap [&_.glass-modal_a]:min-h-9 [&_.glass-modal_a]:justify-center [&_.glass-modal_button]:min-h-9 [&_.glass-modal_button]:min-w-9 [&_.glass-modal_a]:focus-visible:outline-2 [&_.glass-modal_button]:focus-visible:outline-2 [&_.glass-modal>div:nth-child(2)]:min-h-0 [&_.glass-modal>div:nth-child(2)]:overscroll-contain [&_.glass-modal_iframe]:min-h-[240px] sm:[&_.glass-modal_iframe]:min-h-[500px]">
                <DocumentViewer
                    key={selectedDocument?.id ?? 'none'}
                    document={selectedDocument}
                    isOpen={showViewer}
                    onClose={() => {
                        setShowViewer(false);
                        setSelectedDocument(null);
                    }}
                />
            </div>
        </VendorLayout>
    );
}
