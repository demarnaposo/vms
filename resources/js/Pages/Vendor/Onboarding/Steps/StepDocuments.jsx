import { DisabledButton } from '@/Components/DisabledActionTooltip';
import { useMemo, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { formatDate } from '@/utils/dateFormatters';
// Translate the document onboarding step through the global language context.
import { useLanguage } from '@/Contexts/LanguageContext';
// Localize fixed document master labels and descriptions during onboarding.
import { translateDocumentTypeDescription, translateDocumentTypeLabel } from '@/i18n/documentTypes';
import { Modal, ModalCancelButton, ModalPrimaryButton } from '@/Components';

export default function StepDocuments({ documentTypes, sessionData }) {
    // Read the active language for master-data translation.
    const { language, t } = useLanguage();
    const [uploadedDocs, setUploadedDocs] = useState([]);
    const [expiryByType, setExpiryByType] = useState({});
    const [processing, setProcessing] = useState(false);
    const processingRef = useRef(false);
    const [requestTypeId, setRequestTypeId] = useState(null);
    const [pendingRemovalTypeId, setPendingRemovalTypeId] = useState(null);
    const sessionDocs = useMemo(() => sessionData?.step3?.documents || [], [sessionData]);
    const normalizeTypeId = (typeId) => String(typeId ?? '');
    const { props } = usePage();
    const errors = props.errors || {};

    const sessionDocsByType = useMemo(() => {
        const docsMap = new Map();

        (Array.isArray(sessionDocs) ? sessionDocs : []).forEach((doc) => {
            docsMap.set(normalizeTypeId(doc.document_type_id), doc);
        });

        return docsMap;
    }, [sessionDocs]);

    const persist = (formData, typeId = null, intent = 'autosave') => {
        if (processingRef.current) return;
        processingRef.current = true;
        setProcessing(true);
        setRequestTypeId(typeId);
        formData.append('intent', intent);
        router.post('/vendor/onboarding/step3', formData, {
            forceFormData: true,
            preserveScroll: true,
            preserveState: true,
            headers: formData.has('documents[0][file]')
                ? { 'X-Onboarding-Document-Type': typeId }
                : {},
            onFinish: () => {
                processingRef.current = false;
                setProcessing(false);
            },
            onSuccess: () => {
                setUploadedDocs((docs) => docs.filter((doc) => doc.typeId !== typeId));
                setExpiryByType((dates) => {
                    const next = { ...dates };
                    delete next[typeId];
                    return next;
                });
                setPendingRemovalTypeId(null);
            },
        });
    };

    const upload = (typeId, file) => {
        const data = new FormData();
        data.append('documents[0][document_type_id]', typeId);
        data.append('documents[0][file]', file);
        persist(data, typeId);
    };

    const handleFileUpload = (typeId, file) => {
        if (processingRef.current) return;
        const normalizedTypeId = normalizeTypeId(typeId);
        setUploadedDocs((docs) => [
            ...docs.filter((doc) => doc.typeId !== normalizedTypeId),
            { typeId: normalizedTypeId, file, name: file.name },
        ]);
        upload(normalizedTypeId, file);
    };

    const handleExpiryChange = (typeId, expiryDate) => {
        if (processingRef.current) return;
        const normalizedTypeId = normalizeTypeId(typeId);
        setExpiryByType((dates) => ({ ...dates, [normalizedTypeId]: expiryDate }));
        if (sessionDocsByType.has(normalizedTypeId)) {
            const data = new FormData();
            data.append(`expiry_dates[${normalizedTypeId}]`, expiryDate);
            persist(data, normalizedTypeId);
        }
    };

    const submit = (event) => {
        event.preventDefault();
        persist(new FormData(), null, 'continue');
    };

    const removeDocument = () => {
        const data = new FormData();
        data.append('removed_document_type_ids[0]', pendingRemovalTypeId);
        persist(data, normalizeTypeId(pendingRemovalTypeId));
    };

    const viewDocument = (typeId) => {
        window.open(`/vendor/onboarding/document/${typeId}`, '_blank', 'noopener,noreferrer');
    };

    const getFileError = (index) => {
        return (
            errors[`documents.${index}.file`] ||
            errors[`documents.${index}.document_type_id`] ||
            errors[`documents.${index}.expiry_date`]
        );
    };

    return (
        <div className="bg-(--color-bg-primary) border border-(--color-border-primary) rounded-2xl min-w-0 p-4 sm:p-8 md:p-12 shadow-token-lg animate-fade-in">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 text-(--color-text-primary)">
                    {t('Upload Documents')}
                </h1>
                <p className="text-(--color-text-tertiary)">
                    {t(
                        'Upload required documents for verification. Files marked with * are mandatory.'
                    )}
                </p>
                {errors.documents &&
                    !documentTypes?.some((type) => errors[`documents_by_type.${type.id}`]) && (
                        <div
                            role="alert"
                            className="mt-4 p-4 bg-(--color-danger-light) border border-(--color-danger) rounded-lg text-(--color-danger) text-sm"
                        >
                            {/* Localize static document-step errors. */}
                            {t(errors.documents)}
                        </div>
                    )}
            </div>

            <form noValidate onSubmit={submit} className="space-y-6">
                <div className="grid gap-4">
                    {(!documentTypes || documentTypes.length === 0) && (
                        <div className="p-4 rounded-xl border border-(--color-warning) bg-(--color-warning-light) text-(--color-warning-dark) text-sm">
                            {t(
                                'No document types are configured yet. Please contact admin to set up required onboarding documents.'
                            )}
                        </div>
                    )}

                    {documentTypes
                        ?.filter(
                            (type) =>
                                type.is_active || sessionDocsByType.has(normalizeTypeId(type.id))
                        )
                        .map((docType) => {
                            const normalizedTypeId = normalizeTypeId(docType.id);
                            const uploadedDoc = uploadedDocs.find(
                                (doc) => doc.typeId === normalizedTypeId
                            );
                            const sessionDoc = sessionDocsByType.get(normalizedTypeId);
                            const hasUploadedDoc = Boolean(sessionDoc);
                            const backendError =
                                errors[`documents_by_type.${docType.id}`] ||
                                errors[`expiry_dates.${docType.id}`] ||
                                (requestTypeId === normalizedTypeId ? getFileError(0) : null);
                            const error = backendError || null;
                            const errorId = `document-${docType.id}-error`;
                            const typeRequiresExpiry = Boolean(docType.has_expiry);
                            const canEditExpiry = Boolean(docType.is_active) && hasUploadedDoc;
                            const expiryValue =
                                expiryByType[normalizedTypeId] ?? sessionDoc?.expiry_date ?? '';

                            return (
                                <div
                                    key={docType.id}
                                    className={`p-4 rounded-xl border transition-all ${
                                        hasUploadedDoc
                                            ? 'border-(--color-success) bg-(--color-success-light)'
                                            : 'border-(--color-border-primary) bg-(--color-bg-secondary)'
                                    } ${error ? 'border-(--color-danger) bg-(--color-danger-light)' : ''}`}
                                >
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0 flex-1 break-words">
                                            <div className="font-medium text-(--color-text-primary)">
                                                {/* Translate only the recognized system document type. */}
                                                {translateDocumentTypeLabel(language, docType)}
                                                {docType.is_active && docType.is_mandatory && (
                                                    <span
                                                        className="text-(--color-danger) ml-1"
                                                        aria-hidden="true"
                                                    >
                                                        *
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-(--color-text-tertiary)">
                                                {t('Allowed: :formats. Maximum: :size MB.', {
                                                    formats: (docType.allowed_extensions || ['pdf'])
                                                        .join(', ')
                                                        .toUpperCase(),
                                                    size: docType.max_file_size_mb,
                                                })}
                                            </p>
                                            {!docType.is_active && (
                                                <p className="text-sm text-(--color-warning)">
                                                    {t(
                                                        'This document type is inactive. Remove it from the draft to continue.'
                                                    )}
                                                </p>
                                            )}
                                            {docType.description && (
                                                <p className="text-sm text-(--color-text-tertiary) mt-1">
                                                    {/* Keep custom descriptions raw and translate master descriptions. */}
                                                    {translateDocumentTypeDescription(
                                                        language,
                                                        docType
                                                    )}
                                                </p>
                                            )}
                                            {typeRequiresExpiry && (
                                                <div className="mt-3 max-w-xs">
                                                    <label
                                                        htmlFor={`document-${docType.id}-expiry`}
                                                        className="block text-xs font-semibold text-(--color-text-secondary) mb-1"
                                                    >
                                                        {t('Expiry Date')}
                                                        {canEditExpiry && (
                                                            <span
                                                                className="ml-1 text-(--color-danger)"
                                                                aria-hidden="true"
                                                            >
                                                                *
                                                            </span>
                                                        )}
                                                    </label>
                                                    <input
                                                        id={`document-${docType.id}-expiry`}
                                                        aria-invalid={Boolean(error)}
                                                        aria-describedby={
                                                            error ? errorId : undefined
                                                        }
                                                        type="date"
                                                        value={expiryValue}
                                                        disabled={processing || !canEditExpiry}
                                                        min={new Date().toISOString().split('T')[0]}
                                                        onChange={(event) =>
                                                            handleExpiryChange(
                                                                normalizedTypeId,
                                                                event.target.value
                                                            )
                                                        }
                                                        className={`w-full rounded-lg border px-3 py-2 text-sm bg-(--color-bg-primary) ${
                                                            canEditExpiry
                                                                ? 'border-(--color-border-primary) text-(--color-text-primary)'
                                                                : 'border-(--color-border-secondary) text-(--color-text-tertiary) cursor-not-allowed'
                                                        }`}
                                                    />
                                                    {!hasUploadedDoc && (
                                                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                                                            {t(
                                                                'Upload file first, then set expiry date.'
                                                            )}
                                                        </p>
                                                    )}
                                                    {sessionDoc?.expiry_date && !canEditExpiry && (
                                                        <p className="mt-1 text-xs text-(--color-text-tertiary)">
                                                            {t('Current expiry:')}{' '}
                                                            {formatDate(sessionDoc.expiry_date)}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                            {uploadedDoc && (
                                                <p className="text-sm text-(--color-text-secondary) mt-2 break-all">
                                                    {uploadedDoc.name} —{' '}
                                                    {processing
                                                        ? t('Uploading...')
                                                        : t(
                                                              'Upload not saved. Correct the document fields or choose another file.'
                                                          )}
                                                </p>
                                            )}
                                            {hasUploadedDoc && (
                                                <p className="text-sm text-(--color-success) mt-2 flex min-w-0 items-center gap-1 wrap-anywhere">
                                                    <svg
                                                        className="w-4 h-4"
                                                        fill="currentColor"
                                                        viewBox="0 0 20 20"
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                    {sessionDoc?.file_name}
                                                </p>
                                            )}
                                            {typeRequiresExpiry && hasUploadedDoc && (
                                                <p className="text-xs text-(--color-text-tertiary) mt-1">
                                                    {t('Expires on:')}{' '}
                                                    {formatDate(sessionDoc?.expiry_date)}
                                                </p>
                                            )}
                                            {/* Localize document upload and expiry feedback. */}
                                            {error && (
                                                <p
                                                    id={errorId}
                                                    role="alert"
                                                    className="text-sm text-(--color-danger) mt-1"
                                                >
                                                    {t(error)}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            {sessionDoc && (
                                                <button
                                                    type="button"
                                                    disabled={processing}
                                                    className="text-sm text-(--color-danger)"
                                                    onClick={() =>
                                                        setPendingRemovalTypeId(docType.id)
                                                    }
                                                >
                                                    {t('Remove from draft')}
                                                </button>
                                            )}
                                            {hasUploadedDoc && (
                                                <button
                                                    type="button"
                                                    onClick={() => viewDocument(docType.id)}
                                                    className="px-4 py-2 rounded-lg bg-(--color-bg-secondary) border border-(--color-border-primary) hover:bg-(--color-bg-hover) text-(--color-text-primary) text-sm font-medium transition-colors"
                                                >
                                                    {t('View')}
                                                </button>
                                            )}
                                            <label className="cursor-pointer">
                                                <input
                                                    aria-invalid={Boolean(error)}
                                                    aria-describedby={error ? errorId : undefined}
                                                    type="file"
                                                    className="sr-only peer"
                                                    aria-label={`${t('Upload')} ${translateDocumentTypeLabel(language, docType)}`}
                                                    accept={(
                                                        docType.allowed_extensions || [
                                                            'pdf',
                                                            'jpg',
                                                            'jpeg',
                                                            'png',
                                                        ]
                                                    )
                                                        .map((extension) => `.${extension}`)
                                                        .join(',')}
                                                    disabled={processing || !docType.is_active}
                                                    onChange={(e) => {
                                                        if (e.target.files[0])
                                                            handleFileUpload(
                                                                normalizedTypeId,
                                                                e.target.files[0]
                                                            );
                                                        e.target.value = '';
                                                    }}
                                                />
                                                <span className="peer-focus-visible:ring-2 peer-focus-visible:ring-(--color-brand-primary) px-4 py-2 rounded-lg bg-(--color-bg-primary) border border-(--color-border-primary) hover:border-(--color-brand-primary) text-(--color-text-secondary) text-sm font-medium transition-colors">
                                                    {hasUploadedDoc ? t('Replace') : t('Upload')}
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between pt-4">
                    <button
                        type="button"
                        disabled={processing}
                        onClick={() => router.get('/vendor/onboarding?step=2')}
                        className="px-6 py-3 rounded-xl border border-(--color-border-primary) text-(--color-text-secondary) hover:bg-(--color-bg-hover) transition-colors font-medium"
                    >
                        {t('Back')}
                    </button>
                    <DisabledButton
                        type="submit"
                        disabled={processing}
                        disabledReason={'A request is in progress. Please wait.'}
                        className="theme-primary-action font-semibold rounded-lg shadow-token-primary hover:-translate-y-px hover:shadow-token-primary transition-all flex items-center gap-2 text-lg px-8 py-3 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {processing ? t('Saving...') : t('Continue')}
                        {!processing && (
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                                />
                            </svg>
                        )}
                    </DisabledButton>
                </div>
            </form>
            <Modal
                isOpen={pendingRemovalTypeId !== null}
                onClose={() => {
                    if (!processing) setPendingRemovalTypeId(null);
                }}
                title="Remove from draft"
                footer={
                    <>
                        <ModalCancelButton
                            disabled={processing}
                            onClick={() => setPendingRemovalTypeId(null)}
                        />
                        <ModalPrimaryButton
                            variant="danger"
                            disabled={processing}
                            onClick={removeDocument}
                        >
                            Remove from draft
                        </ModalPrimaryButton>
                    </>
                }
            >
                <p>{t('Remove this document from the draft?')}</p>
            </Modal>
        </div>
    );
}
