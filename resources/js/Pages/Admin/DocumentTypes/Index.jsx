import { router, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import {
    AdminLayout,
    Alert,
    Badge,
    Button,
    Card,
    DataTable,
    FormInput,
    FormTextarea,
    Modal,
    PageHeader,
} from '@/Components';
import { translateDocumentTypeLabel } from '@/i18n/documentTypes';
import { useLanguage } from '@/Contexts/LanguageContext';

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
            onError: () => setDeletingDocumentType(null),
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
                <div className="flex items-center justify-end gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={buttonFocus}
                        onClick={() => edit(document_type)}
                    >
                        Edit
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`${buttonFocus} text-(--color-danger) hover:text-(--color-danger-dark)`}
                        onClick={() => setDeletingDocumentType(document_type)}
                    >
                        Delete
                    </Button>
                </div>
            ),
        },
    ];

    const header = (
        <PageHeader title="Document Types" subtitle="Manage vendor document requirements." />
    );

    return (
        <AdminLayout title="Document Types" activeNav="Document Types" header={header}>
            <div className="space-y-6">
                <Card title={editingId === null ? 'Add Document Type' : 'Edit Document Type'}>
                    <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
                        <div>
                            <FormInput
                                label="Document Type Code"
                                value={data.name}
                                onChange={(value) => setData('name', value)}
                                placeholder="e.g., insurance_certificate"
                                error={errors.name}
                                disabled={editingId !== null}
                                required
                            />
                            {editingId !== null && (
                                <p className="mt-1 text-xs text-(--color-text-tertiary)">
                                    {t('Document type codes cannot be changed after creation.')}
                                </p>
                            )}
                        </div>
                        <FormInput
                            label="Document Type Name"
                            value={data.display_name}
                            onChange={(value) => setData('display_name', value)}
                            placeholder="e.g., Insurance Certificate"
                            error={errors.display_name}
                            required
                        />
                        <FormTextarea
                            label="Description"
                            value={data.description}
                            onChange={(value) => setData('description', value)}
                            error={errors.description}
                            placeholder="e.g., Proof of current insurance coverage"
                        />
                        <FormInput
                            label="Maximum File Size (MB)"
                            type="number"
                            value={data.max_file_size_mb}
                            onChange={(value) => setData('max_file_size_mb', value)}
                            error={errors.max_file_size_mb}
                            required
                        />
                        {['is_active', 'is_mandatory', 'has_expiry'].map((field, index) => (
                            <div key={field}>
                                <label className="flex items-center gap-3 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name={field}
                                        className={buttonFocus}
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
                                    <p role="alert" className="text-sm text-(--color-danger)">
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
                            disabled={!data.has_expiry}
                            required
                        />
                        <fieldset className="md:col-span-2">
                            <legend className="text-sm font-medium mb-2">
                                {t('Allowed Extensions')}
                            </legend>
                            <div className="flex flex-wrap gap-4">
                                {['pdf', 'jpg', 'jpeg', 'png'].map((extension) => (
                                    <label key={extension} className="flex gap-2 items-center">
                                        <input
                                            type="checkbox"
                                            name="allowed_extensions[]"
                                            className={buttonFocus}
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
                            {(errors.allowed_extensions || errors['allowed_extensions.0']) && (
                                <p role="alert" className="text-sm text-(--color-danger)">
                                    {t(errors.allowed_extensions || errors['allowed_extensions.0'])}
                                </p>
                            )}
                            <p className="mt-2 text-xs text-(--color-text-tertiary)">
                                {t('Supported formats: PDF, JPG, JPEG, PNG. Maximum size: 10 MB.')}
                            </p>
                        </fieldset>
                        <div className="md:col-span-2 flex flex-wrap justify-end gap-3 border-t border-(--color-border-secondary) pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={clearForm}
                                disabled={processing}
                                className={buttonFocus}
                            >
                                {editingId === null ? 'Clear Form' : 'Cancel'}
                            </Button>
                            <Button type="submit" disabled={processing} className={buttonFocus}>
                                {processing
                                    ? 'Saving…'
                                    : editingId === null
                                      ? 'Add Document Type'
                                      : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </Card>

                {errors.document_type && (
                    <div role="alert" aria-live="polite">
                        <Alert type="error">{errors.document_type}</Alert>
                    </div>
                )}

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
