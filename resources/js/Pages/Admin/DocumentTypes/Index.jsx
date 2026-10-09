import { DisabledButton } from '@/Components/DisabledActionTooltip';
import AppIcon from '@/Components/AppIcon';
import { ActionButton } from '@/Components/ActionControls';
import { router, useForm } from '@inertiajs/react';
import { useId, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminLayout, Badge, Button, Card, DataTable, Modal, PageHeader } from '@/Components';
import { translateDocumentTypeLabel } from '@/i18n/documentTypes';
import { useLanguage } from '@/Contexts/LanguageContext';

// Keep this form presentation local so other pages retain their existing controls.
function FormInput({
    label,
    value,
    onChange,
    error,
    placeholder = '',
    showRequiredIndicator = false,
    disabled = false,
    disabledReason,
    type = 'text',
    as: Control = 'input',
    rows = 4,
    autoComplete,
}) {
    const id = useId();
    const { t } = useLanguage();
    const [visible, setVisible] = useState(false);
    const password = type === 'password';
    const toggleLabel = t(visible ? 'Hide password' : 'Show password');
    return (
        <div className="min-w-0">
            <label htmlFor={id} className="mb-2 block text-sm font-medium">
                {t(label)}{' '}
                {showRequiredIndicator && (
                    <span aria-hidden="true" className="text-(--color-danger)">
                        *
                    </span>
                )}
            </label>
            <div className="relative">
                <Control
                    id={id}
                    type={Control === 'input' ? (password && visible ? 'text' : type) : undefined}
                    rows={Control === 'textarea' ? rows : undefined}
                    step={type === 'number' ? 'any' : undefined}
                    autoComplete={autoComplete}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder={t(placeholder)}
                    disabled={disabled}
                    aria-required={showRequiredIndicator || undefined}
                    aria-invalid={!!error}
                    aria-describedby={error ? id + '-error' : undefined}
                    className={
                        'input-field w-full disabled:cursor-not-allowed disabled:bg-(--color-bg-secondary) ' +
                        (password ? 'pr-12 ' : '') +
                        (error ? '!border-(--color-danger)' : '')
                    }
                />
                {password && (
                    <DisabledButton
                        type="button"
                        onClick={() => setVisible((current) => !current)}
                        disabled={disabled}
                        disabledReason={disabledReason}
                        aria-label={toggleLabel}
                        title={toggleLabel}
                        aria-pressed={visible}
                        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-(--color-text-muted) focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--color-brand-primary) disabled:opacity-50"
                    >
                        <AppIcon name={visible ? 'eye-off' : 'eye'} className="h-5 w-5" />
                    </DisabledButton>
                )}
            </div>
            {error && (
                <p id={id + '-error'} role="alert" className="mt-1 text-sm text-(--color-danger)">
                    {t(error)}
                </p>
            )}
        </div>
    );
}

function FormTextarea(props) {
    return <FormInput {...props} as="textarea" />;
}

const emptyDocumentType = {
    name: '',
    display_name: '',
    description: '',
    is_active: true,
    is_mandatory: false,
    has_expiry: false,
    expiry_warning_days: 0,
    allowed_extensions: ['pdf'],
    max_file_size_mb: 10,
};
const buttonFocus =
    'focus-visible:ring-2 focus-visible:ring-(--color-brand-primary) focus-visible:ring-offset-2';

export default function DocumentTypeIndex({ documentTypes = [] }) {
    const formId = useId();
    const { language, t } = useLanguage();
    const [editingId, setEditingId] = useState(null);
    const [deletingDocumentType, setDeletingDocumentType] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const numberFormatter = useMemo(
        () => new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US'),
        [language]
    );
    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm(emptyDocumentType);

    const clearForm = () => {
        setEditingId(null);
        reset();
        clearErrors();
    };

    const edit = (document_type) => {
        setEditingId(document_type.id);
        setData({
            name: document_type.name,
            description: document_type.description || '',
            is_mandatory: document_type.is_mandatory,
            has_expiry: document_type.has_expiry,
            expiry_warning_days: document_type.has_expiry ? document_type.expiry_warning_days : 0,
            allowed_extensions: (
                document_type.allowed_extensions || ['pdf', 'jpg', 'jpeg', 'png']
            ).filter((extension) => ['pdf', 'jpg', 'jpeg', 'png'].includes(extension)),
            max_file_size_mb: document_type.max_file_size_mb,
            display_name: document_type.display_name,
            is_active: document_type.is_active,
        });
        clearErrors();
    };

    const submit = (event) => {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: clearForm };
        if (editingId !== null) {
            put(`/admin/document-types/${editingId}`, options);
        } else {
            post('/admin/document-types', options);
        }
    };

    const remove = () => {
        if (!deletingDocumentType) return;
        setDeleting(true);
        router.delete(`/admin/document-types/${deletingDocumentType.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeletingDocumentType(null),
            onError: (responseErrors) => {
                if (responseErrors.document_type) toast.error(t(responseErrors.document_type));
                setDeletingDocumentType(null);
            },
            onFinish: () => setDeleting(false),
        });
    };

    const columns = [
        {
            header: 'Document Type Name',
            render: (document_type) => (
                <span className="font-medium text-(--color-text-primary) break-words">
                    {translateDocumentTypeLabel(language, document_type)}
                </span>
            ),
        },
        {
            header: 'Document Type Code',
            render: (document_type) => (
                <span className="font-mono text-xs break-all" translate="no">
                    {document_type.name}
                </span>
            ),
        },
        {
            header: 'Status',
            render: (document_type) => (
                <Badge status={document_type.is_active ? 'active' : 'secondary'}>
                    {t(document_type.is_active ? 'Active' : 'Inactive')}
                </Badge>
            ),
        },
        {
            header: 'Documents',
            align: 'center',
            render: (document_type) => (
                <span className="tabular-nums">
                    {numberFormatter.format(document_type.documents_count)}
                </span>
            ),
        },
        {
            header: 'Actions',
            align: 'right',
            render: (document_type) => (
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <ActionButton
                        variant="primary"
                        className={buttonFocus}
                        onClick={() => edit(document_type)}
                    >
                        Edit
                    </ActionButton>
                    <ActionButton
                        variant="danger"
                        className={buttonFocus}
                        onClick={() => setDeletingDocumentType(document_type)}
                    >
                        Delete
                    </ActionButton>
                </div>
            ),
        },
    ];

    // console.log('Document Types:', documentTypes);

    const header = (
        <PageHeader title="Document Types" subtitle="Manage vendor document requirements." />
    );

    return (
        <AdminLayout title="Document Types" activeNav="Document Types" header={header}>
            <div className="space-y-6">
                <Card title={editingId === null ? 'Add Document Type' : 'Edit Document Type'}>
                    <form noValidate onSubmit={submit} className="grid gap-4 md:grid-cols-2">
                        <div>
                            <FormInput
                                label="Document Type Code"
                                value={data.name}
                                onChange={(value) => setData('name', value)}
                                placeholder="e.g., insurance_certificate"
                                error={errors.name}
                                disabled={processing || editingId !== null}
                                showRequiredIndicator
                            />
                            {editingId !== null && (
                                <p className="mt-1 text-xs text-(--color-text-tertiary)">
                                    {t('Document type codes cannot be changed after creation.')}
                                </p>
                            )}
                        </div>
                        <FormInput
                            disabled={processing}
                            disabledReason={'A request is in progress. Please wait.'}
                            label="Document Type Name"
                            value={data.display_name}
                            onChange={(value) => setData('display_name', value)}
                            placeholder="e.g., Insurance Certificate"
                            error={errors.display_name}
                            showRequiredIndicator
                        />
                        <FormTextarea
                            disabled={processing}
                            label="Description"
                            value={data.description}
                            onChange={(value) => setData('description', value)}
                            error={errors.description}
                            placeholder="e.g., Proof of current insurance coverage"
                        />
                        <FormInput
                            disabled={processing}
                            disabledReason={'A request is in progress. Please wait.'}
                            label="Maximum File Size (MB)"
                            type="number"
                            value={data.max_file_size_mb}
                            onChange={(value) => setData('max_file_size_mb', value)}
                            error={errors.max_file_size_mb}
                            showRequiredIndicator
                        />
                        {['is_active', 'is_mandatory', 'has_expiry'].map((field, index) => (
                            <div key={field}>
                                <label className="flex items-center gap-3 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name={field}
                                        disabled={processing}
                                        aria-invalid={!!errors[field]}
                                        aria-describedby={
                                            errors[field] ? `${formId}-${field}-error` : undefined
                                        }
                                        className={`h-5 w-5 accent-(--color-brand-primary) ${buttonFocus}`}
                                        checked={data[field]}
                                        onChange={(event) =>
                                            setData({
                                                ...data,
                                                [field]: event.target.checked,
                                                ...(field === 'has_expiry'
                                                    ? {
                                                          expiry_warning_days: event.target.checked
                                                              ? 30
                                                              : 0,
                                                      }
                                                    : {}),
                                            })
                                        }
                                    />
                                    {t(['Active', 'Mandatory', 'Has Expiry'][index])}
                                </label>
                                {errors[field] && (
                                    <p
                                        id={`${formId}-${field}-error`}
                                        role="alert"
                                        className="mt-1 text-sm text-(--color-danger)"
                                    >
                                        {t(errors[field])}
                                    </p>
                                )}
                            </div>
                        ))}
                        <FormInput
                            label="Expiry Warning Days"
                            type="number"
                            value={data.expiry_warning_days}
                            onChange={(value) => setData('expiry_warning_days', value)}
                            error={errors.expiry_warning_days}
                            disabled={processing || !data.has_expiry}
                            showRequiredIndicator
                        />
                        <fieldset className="md:col-span-2">
                            <legend className="text-sm font-medium mb-2">
                                {t('Allowed Extensions')}{' '}
                                <span aria-hidden="true" className="text-(--color-danger)">
                                    *
                                </span>
                            </legend>
                            <div className="flex flex-wrap gap-4">
                                {['pdf', 'jpg', 'jpeg', 'png'].map((extension) => (
                                    <label key={extension} className="flex gap-2 items-center">
                                        <input
                                            type="checkbox"
                                            name="allowed_extensions[]"
                                            disabled={processing}
                                            aria-invalid={Object.keys(errors).some(
                                                (key) =>
                                                    key === 'allowed_extensions' ||
                                                    key.startsWith('allowed_extensions.')
                                            )}
                                            aria-describedby={`${formId}-extensions-help ${formId}-extensions-error`}
                                            className={`h-5 w-5 accent-(--color-brand-primary) ${buttonFocus}`}
                                            checked={data.allowed_extensions.includes(extension)}
                                            onChange={(event) =>
                                                setData(
                                                    'allowed_extensions',
                                                    event.target.checked
                                                        ? [...data.allowed_extensions, extension]
                                                        : data.allowed_extensions.filter(
                                                              (value) => value !== extension
                                                          )
                                                )
                                            }
                                        />
                                        <span translate="no">{extension.toUpperCase()}</span>
                                    </label>
                                ))}
                            </div>
                            <div id={`${formId}-extensions-error`}>
                                {[
                                    ...new Set(
                                        Object.entries(errors)
                                            .filter(
                                                ([key]) =>
                                                    key === 'allowed_extensions' ||
                                                    key.startsWith('allowed_extensions.')
                                            )
                                            .map(([, message]) => message)
                                    ),
                                ].map((message) => (
                                    <p
                                        key={message}
                                        role="alert"
                                        className="mt-1 text-sm text-(--color-danger)"
                                    >
                                        {t(message)}
                                    </p>
                                ))}
                            </div>
                            <p
                                id={`${formId}-extensions-help`}
                                className="mt-2 text-sm text-(--color-text-tertiary)"
                            >
                                {t('Supported formats: PDF, JPG, JPEG, PNG. Maximum size: 10 MB.')}
                            </p>
                        </fieldset>
                        <div className="md:col-span-2 flex flex-wrap justify-end gap-3 border-t border-(--color-border-secondary) pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={clearForm}
                                disabled={processing}
                                disabledReason={'A request is in progress. Please wait.'}
                                className={buttonFocus}
                            >
                                {editingId === null ? 'Clear Form' : 'Cancel'}
                            </Button>
                            <Button
                                type="submit"
                                disabled={processing}
                                disabledReason={'A request is in progress. Please wait.'}
                                className={buttonFocus}
                            >
                                {processing
                                    ? 'Saving…'
                                    : editingId === null
                                      ? 'Add Document Type'
                                      : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </Card>

                <Card title="Document Types" noPadding>
                    <DataTable
                        columns={columns}
                        data={documentTypes}
                        emptyMessage="No document types yet."
                    />
                </Card>
            </div>

            <Modal
                isOpen={deletingDocumentType !== null}
                onClose={() => setDeletingDocumentType(null)}
                title="Delete Document Type"
                footer={
                    <>
                        <Button
                            variant="outline"
                            onClick={() => setDeletingDocumentType(null)}
                            className={buttonFocus}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={remove}
                            disabled={deleting}
                            disabledReason={'A request is in progress. Please wait.'}
                            className={buttonFocus}
                        >
                            {deleting ? 'Deleting…' : 'Delete Document Type'}
                        </Button>
                    </>
                }
            >
                <p className="text-sm text-(--color-text-secondary)">
                    {t('Delete this document type?')}{' '}
                    <strong className="break-words text-(--color-text-primary)">
                        {translateDocumentTypeLabel(language, deletingDocumentType)}
                    </strong>
                </p>
                <p className="mt-3 text-sm text-(--color-text-tertiary)">
                    {t(
                        'Document types used by documents, drafts or compliance cannot be deleted. Deactivate them instead.'
                    )}
                </p>
            </Modal>
        </AdminLayout>
    );
}
