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
    Modal,
    PageHeader,
} from '@/Components';
import { useLanguage } from '@/Contexts/LanguageContext';

const emptyCategory = { code: '', display_name: '', is_active: true };
const buttonFocus =
    'focus-visible:ring-2 focus-visible:ring-(--color-brand-primary) focus-visible:ring-offset-2';

export default function VendorCategoryIndex({ categories = [] }) {
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
        setEditingId(category.id);
        setData({
            code: category.code,
            display_name: category.display_name,
            is_active: category.is_active,
        });
        clearErrors();
    };

    const submit = (event) => {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: clearForm };
        if (editingId !== null) {
            put(`/admin/vendor-categories/${editingId}`, options);
        } else {
            post('/admin/vendor-categories', options);
        }
    };

    const remove = () => {
        if (!deletingCategory) return;
        setDeleting(true);
        router.delete(`/admin/vendor-categories/${deletingCategory.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeletingCategory(null),
            onError: () => setDeletingCategory(null),
            onFinish: () => setDeleting(false),
        });
    };

    const columns = [
        {
            header: 'Category Name',
            render: (category) => (
                <span className="font-medium text-(--color-text-primary) break-words">
                    {category.display_name}
                </span>
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
                <div className="flex items-center justify-end gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={buttonFocus}
                        onClick={() => edit(category)}
                    >
                        Edit
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`${buttonFocus} text-(--color-danger) hover:text-(--color-danger-dark)`}
                        onClick={() => setDeletingCategory(category)}
                    >
                        Delete
                    </Button>
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
                    <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
                        <div>
                            <FormInput
                                label="Category Code"
                                value={data.code}
                                onChange={(value) => setData('code', value)}
                                placeholder="e.g., office_supplies"
                                error={errors.code}
                                disabled={editingId !== null}
                                required
                            />
                            {editingId !== null && (
                                <p className="mt-1 text-xs text-(--color-text-tertiary)">
                                    {t('Category codes cannot be changed after creation.')}
                                </p>
                            )}
                        </div>
                        <FormInput
                            label="Category Name"
                            value={data.display_name}
                            onChange={(value) => setData('display_name', value)}
                            placeholder="e.g., Office Supplies"
                            error={errors.display_name}
                            required
                        />
                        <label className="md:col-span-2 flex w-fit items-center gap-3 rounded-xl text-sm font-medium text-(--color-text-primary) cursor-pointer">
                            <input
                                type="checkbox"
                                name="is_active"
                                checked={data.is_active}
                                onChange={(event) => setData('is_active', event.target.checked)}
                                className="h-5 w-5 rounded border-(--color-border-primary) text-(--color-brand-primary) focus-visible:ring-2 focus-visible:ring-(--color-brand-primary)"
                            />
                            {t('Active')}
                        </label>
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
                                      ? 'Add Category'
                                      : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </Card>

                {errors.category && (
                    <div role="alert" aria-live="polite">
                        <Alert type="error">{errors.category}</Alert>
                    </div>
                )}

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
                onClose={() => setDeletingCategory(null)}
                title="Delete Category"
                footer={
                    <>
                        <Button
                            variant="outline"
                            onClick={() => setDeletingCategory(null)}
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
                            {deleting ? 'Deleting…' : 'Delete Category'}
                        </Button>
                    </>
                }
            >
                <p className="text-sm text-(--color-text-secondary)">
                    {t('Delete this vendor category?')}{' '}
                    <strong className="break-words text-(--color-text-primary)">
                        {deletingCategory?.display_name}
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
