import { vendorCategoryLabel } from '@/i18n/vendorCategories';
import { DisabledButton } from '@/Components/DisabledActionTooltip';
import AppIcon from '@/Components/AppIcon';
import { ActionButton } from '@/Components/ActionControls';
import { router, useForm } from '@inertiajs/react';
import { useId, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminLayout, Badge, Button, Card, DataTable, Modal, PageHeader } from '@/Components';
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

const emptyCategory = { code: '', display_name: '', description: '', is_active: true };
const buttonFocus =
    'focus-visible:ring-2 focus-visible:ring-(--color-brand-primary) focus-visible:ring-offset-2';

export default function VendorCategoryIndex({ categories = [] }) {
    const activeErrorId = useId();
    const { language, t } = useLanguage();
    const [editingId, setEditingId] = useState(null);
    const [deletingCategory, setDeletingCategory] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const numberFormatter = useMemo(
        () => new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US'),
        [language]
    );
    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm(emptyCategory);

    const clearForm = () => {
        setEditingId(null);
        reset();
        clearErrors();
    };

    const edit = (category) => {
        if (processing || deleting) return;
        setEditingId(category.id);
        setData({
            code: category.code,
            display_name: category.display_name,
            description: category.description || '',
            is_active: category.is_active,
        });
        clearErrors();
    };

    const submit = (event) => {
        event.preventDefault();
        if (processing || deleting) return;
        const options = { preserveScroll: true, onSuccess: clearForm };
        if (editingId !== null) {
            put(`/admin/vendor-categories/${editingId}`, options);
        } else {
            post('/admin/vendor-categories', options);
        }
    };

    const remove = () => {
        if (!deletingCategory || deleting || processing) return;
        setDeleting(true);
        router.delete(`/admin/vendor-categories/${deletingCategory.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeletingCategory(null),
            onError: (responseErrors) => {
                if (responseErrors.category) toast.error(t(responseErrors.category));
                setDeletingCategory(null);
            },
            onFinish: () => setDeleting(false),
        });
    };

    const columns = [
        {
            header: 'Category Name',
            render: (category) => (
                <span className="font-medium text-(--color-text-primary) break-words">
                    {vendorCategoryLabel(language, category)}
                </span>
            ),
        },
        {
            header: 'Description',
            render: (category) => (
                <p className="max-w-md whitespace-pre-wrap wrap-anywhere text-sm text-(--color-text-secondary)">
                    {vendorCategoryLabel(language, category, 'description') || '-'}
                </p>
            ),
        },
        {
            header: 'Category Code',
            render: (category) => (
                <span className="font-mono text-xs break-all" translate="no">
                    {category.code}
                </span>
            ),
        },
        {
            header: 'Status',
            render: (category) => (
                <Badge status={category.is_active ? 'active' : 'secondary'}>
                    {t(category.is_active ? 'Active' : 'Inactive')}
                </Badge>
            ),
        },
        {
            header: 'Vendors',
            align: 'center',
            render: (category) => (
                <span className="tabular-nums">
                    {numberFormatter.format(category.vendors_count)}
                </span>
            ),
        },
        {
            header: 'Actions',
            align: 'right',
            render: (category) => (
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <ActionButton
                        variant="primary"
                        className={buttonFocus}
                        disabled={processing || deleting}
                        disabledReason="A request is in progress. Please wait."
                        onClick={() => edit(category)}
                    >
                        Edit
                    </ActionButton>
                    <ActionButton
                        variant="danger"
                        className={buttonFocus}
                        disabled={
                            processing || deleting || category.in_use || category.vendors_count > 0
                        }
                        disabledReason={
                            processing || deleting
                                ? 'A request is in progress. Please wait.'
                                : 'This category is in use. Deactivate it instead.'
                        }
                        onClick={() => setDeletingCategory(category)}
                    >
                        Delete
                    </ActionButton>
                </div>
            ),
        },
    ];

    const header = (
        <PageHeader
            title="Vendor Categories"
            subtitle="Manage categories used during vendor registration."
        />
    );

    return (
        <AdminLayout title="Vendor Categories" activeNav="Vendor Categories" header={header}>
            <div className="space-y-6">
                <Card title={editingId === null ? 'Add Category' : 'Edit Category'}>
                    <form noValidate onSubmit={submit} className="grid gap-4 md:grid-cols-2">
                        <div>
                            <FormInput
                                label="Category Code"
                                value={data.code}
                                onChange={(value) => setData('code', value)}
                                placeholder="e.g., office_supplies"
                                error={errors.code}
                                disabled={processing || editingId !== null}
                                showRequiredIndicator
                            />
                            {editingId !== null && (
                                <p className="mt-1 text-xs text-(--color-text-tertiary)">
                                    {t('Category codes cannot be changed after creation.')}
                                </p>
                            )}
                        </div>
                        <FormInput
                            disabled={processing}
                            disabledReason={'A request is in progress. Please wait.'}
                            label="Category Name"
                            value={vendorCategoryLabel(language, {
                                code: data.code,
                                display_name: data.display_name,
                            })}
                            onChange={(value) => setData('display_name', value)}
                            placeholder="e.g., Office Supplies"
                            error={errors.display_name}
                            showRequiredIndicator
                        />
                        <div className="md:col-span-2">
                            <FormInput
                                label="Description"
                                as="textarea"
                                value={vendorCategoryLabel(
                                    language,
                                    { code: data.code, description: data.description },
                                    'description'
                                )}
                                onChange={(value) => setData('description', value)}
                                error={errors.description}
                                placeholder="e.g., Cleaning services and building security"
                                disabled={processing || deleting}
                            />
                        </div>
                        <label className="md:col-span-2 flex w-fit items-center gap-3">
                            <input
                                type="checkbox"
                                name="is_active"
                                disabled={processing}
                                aria-invalid={!!errors.is_active}
                                aria-describedby={errors.is_active ? activeErrorId : undefined}
                                checked={data.is_active}
                                onChange={(event) => setData('is_active', event.target.checked)}
                                className="h-5 w-5 accent-(--color-brand-primary) focus-visible:ring-2"
                            />
                            {t('Active')}
                        </label>
                        {errors.is_active && (
                            <p
                                id={activeErrorId}
                                role="alert"
                                className="md:col-span-2 mt-1 text-sm text-(--color-danger)"
                            >
                                {t(errors.is_active)}
                            </p>
                        )}
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
                                      ? 'Add Category'
                                      : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </Card>

                <Card title="Vendor Categories" noPadding>
                    <DataTable
                        columns={columns}
                        data={categories}
                        emptyMessage="No vendor categories yet."
                    />
                </Card>
            </div>

            <Modal
                isOpen={deletingCategory !== null}
                onClose={() => {
                    if (!deleting) setDeletingCategory(null);
                }}
                title="Delete Category"
                footer={
                    <>
                        <Button
                            variant="outline"
                            disabled={deleting}
                            disabledReason="A request is in progress. Please wait."
                            onClick={() => setDeletingCategory(null)}
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
                            {deleting ? 'Deleting…' : 'Delete Category'}
                        </Button>
                    </>
                }
            >
                <p className="text-sm text-(--color-text-secondary)">
                    {t('Delete this vendor category?')}{' '}
                    <strong className="break-words text-(--color-text-primary)">
                        {vendorCategoryLabel(language, deletingCategory)}
                    </strong>
                </p>
                <p className="mt-3 text-sm text-(--color-text-tertiary)">
                    {t(
                        'Categories used by vendors or drafts cannot be deleted. Deactivate them instead.'
                    )}
                </p>
            </Modal>
        </AdminLayout>
    );
}
