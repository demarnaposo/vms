import { Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
    AdminLayout,
    Button,
    Card,
    DataTable,
    FormInput,
    FormTextarea,
    Modal,
    PageHeader,
} from '@/Components';
import { useLanguage } from '@/Contexts/LanguageContext';
import { translateStaffRoleOption } from '@/i18n/staffRoles';
import {
    translateStaffPermissionField,
    translateStaffPermissionGroup,
} from '@/i18n/staffPermissions';
import { formatDateTime } from '@/utils/dateFormatters';

const focus =
    'focus-visible:ring-2 focus-visible:ring-(--color-brand-primary) focus-visible:ring-offset-2';
const emptyUser = { name: '', email: '', password: '', password_confirmation: '', role_ids: [] };
const emptyRole = { name: '', display_name: '', description: '', permission_ids: [] };

function FormErrors({ errors }) {
    return Object.keys(errors).length ? (
        <div role="alert" className="text-sm text-(--color-danger)">
            {Object.values(errors).join(' ')}
        </div>
    ) : null;
}

function StaffUserForm({ roles, editing, onDone }) {
    const { language, t } = useLanguage();
    const form = useForm(
        editing
            ? { name: editing.name, email: editing.email, role_ids: editing.role_ids }
            : emptyUser
    );
    const submit = (event) => {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onDone();
            },
        };
        if (editing) form.put(`/admin/staff-users/${editing.id}`, options);
        else form.post('/admin/staff-users', options);
    };
    const toggle = (id) =>
        form.setData(
            'role_ids',
            form.data.role_ids.includes(id)
                ? form.data.role_ids.filter((value) => value !== id)
                : [...form.data.role_ids, id]
        );
    return (
        <Card title={editing ? 'Edit Staff User' : 'Create Internal User'}>
            <form onSubmit={submit} className="p-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                    <FormInput
                        label="Full Name"
                        value={form.data.name}
                        onChange={(value) => form.setData('name', value)}
                        error={form.errors.name}
                        placeholder="e.g., John Doe"
                        required
                    />
                    <FormInput
                        label="Email"
                        type="email"
                        value={form.data.email}
                        onChange={(value) => form.setData('email', value)}
                        error={form.errors.email}
                        placeholder="e.g., johndoe@example.com"
                        required
                    />
                    {!editing && (
                        <>
                            <FormInput
                                label="Password"
                                type="password"
                                value={form.data.password}
                                onChange={(value) => form.setData('password', value)}
                                error={form.errors.password}
                                required
                            />
                            <FormInput
                                label="Confirm Password"
                                type="password"
                                value={form.data.password_confirmation}
                                onChange={(value) => form.setData('password_confirmation', value)}
                                error={form.errors.password_confirmation}
                                required
                            />
                        </>
                    )}
                </div>
                <fieldset className="space-y-2">
                    <legend className="font-medium">
                        {t('Staff Roles')} <span aria-hidden="true">*</span>
                    </legend>
                    <div className="flex flex-wrap gap-4">
                        {roles.map((role) => (
                            <label key={role.id} className="inline-flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    className={focus}
                                    checked={form.data.role_ids.includes(role.id)}
                                    onChange={() => toggle(role.id)}
                                    disabled={form.processing}
                                />
                                <span>{translateStaffRoleOption(language, role)}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>
                <FormErrors errors={form.errors} />
                <div className="flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            form.reset();
                            form.clearErrors();
                            onDone();
                        }}
                        disabled={form.processing}
                    >
                        {editing ? 'Cancel' : 'Clear Form'}
                    </Button>
                    <Button type="submit" disabled={form.processing}>
                        {form.processing ? 'Saving...' : 'Save User'}
                    </Button>
                </div>
            </form>
        </Card>
    );
}

function StaffRoleForm({ permissions, editing, onDone }) {
    const { language, t } = useLanguage();
    const form = useForm(
        editing
            ? {
                  name: editing.name,
                  display_name: editing.display_name,
                  description: editing.description || '',
                  permission_ids: editing.permission_ids,
              }
            : emptyRole
    );
    const groups = permissions
        .filter((permission) => permission.operational)
        .reduce((result, permission) => {
            const group = permission.group || 'system';
            (result[group] ||= []).push(permission);
            return result;
        }, {});
    const toggle = (id) =>
        form.setData(
            'permission_ids',
            form.data.permission_ids.includes(id)
                ? form.data.permission_ids.filter((value) => value !== id)
                : [...form.data.permission_ids, id]
        );
    const submit = (event) => {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onDone();
            },
        };
        if (editing) form.put(`/admin/staff-roles/${editing.id}`, options);
        else form.post('/admin/staff-roles', options);
    };
    return (
        <Card title={editing ? 'Edit Staff Role' : 'Create Staff Role'}>
            <form onSubmit={submit} className="p-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                    <FormInput
                        label="Role Code"
                        value={form.data.name}
                        onChange={(value) => form.setData('name', value)}
                        disabled={Boolean(editing)}
                        error={form.errors.name}
                        placeholder="e.g., document_reviewer"
                        required
                    />
                    <FormInput
                        label="Role Name"
                        value={form.data.display_name}
                        onChange={(value) => form.setData('display_name', value)}
                        error={form.errors.display_name}
                        placeholder="e.g., Document Reviewer"
                        required
                    />
                </div>
                <FormTextarea
                    label="Description"
                    value={form.data.description}
                    onChange={(value) => form.setData('description', value)}
                    error={form.errors.description}
                    placeholder="e.g., Reviews vendor documents"
                />
                {editing?.name === 'super_admin' ? (
                    <p>{t('Super admin access is protected and cannot be restricted here.')}</p>
                ) : (
                    Object.entries(groups).map(([group, items]) => (
                        <fieldset
                            key={group}
                            className="rounded-xl border border-(--color-border-primary) p-4"
                        >
                            <legend className="px-2 font-medium">
                                {translateStaffPermissionGroup(language, group)}
                            </legend>
                            <div className="grid gap-3 md:grid-cols-2">
                                {items.map((permission) => (
                                    <label key={permission.id} className="flex items-start gap-2">
                                        <input
                                            type="checkbox"
                                            className={`mt-1 ${focus}`}
                                            checked={form.data.permission_ids.includes(
                                                permission.id
                                            )}
                                            onChange={() => toggle(permission.id)}
                                            disabled={form.processing}
                                        />
                                        <span>
                                            <span className="block">
                                                {translateStaffPermissionField(
                                                    language,
                                                    permission
                                                )}
                                            </span>
                                            <span
                                                className="block text-xs text-(--color-text-tertiary)"
                                                translate="no"
                                            >
                                                {permission.name}
                                            </span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                    ))
                )}
                {editing?.legacy_permissions.length > 0 && (
                    <p className="text-sm text-(--color-text-secondary)">
                        {t('Legacy permissions are preserved and cannot be edited here.')}{' '}
                        <span translate="no">{editing.legacy_permissions.join(', ')}</span>
                    </p>
                )}
                <FormErrors errors={form.errors} />
                <div className="flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            form.reset();
                            form.clearErrors();
                            onDone();
                        }}
                        disabled={form.processing}
                    >
                        {editing ? 'Cancel' : 'Clear Form'}
                    </Button>
                    <Button type="submit" disabled={form.processing}>
                        {form.processing ? 'Saving...' : 'Save Role'}
                    </Button>
                </div>
            </form>
        </Card>
    );
}

export default function StaffIndex({
    staffUsers = [],
    availableRoles = [],
    staffRoles = [],
    permissions = [],
    legacyRoles = [],
}) {
    const { language, t } = useLanguage();
    const [tab, setTab] = useState('users');
    const [editingUser, setEditingUser] = useState(null);
    const [editingRole, setEditingRole] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [busy, setBusy] = useState(false);
    const roleLabel = (role) =>
        translateStaffRoleOption(language, { value: role.name, label: role.display_name });
    const userColumns = [
        { header: 'Name', render: (row) => row.name },
        { header: 'Email', render: (row) => row.email },
        { header: 'Roles', render: (row) => row.role_items.map(roleLabel).join(', ') },
        {
            header: 'Created',
            render: (row) => formatDateTime(row.created_at, language === 'id' ? 'id-ID' : 'en-US'),
        },
        {
            header: 'Actions',
            render: (row) =>
                row.manageable ? (
                    <div className="flex flex-wrap gap-2">
                        <Link
                            className="inline-flex items-center gap-2 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-(--color-border-primary) hover:border-(--color-border-secondary) text-(--color-text-secondary) hover:bg-(--color-bg-secondary) px-4 py-2 text-sm"
                            href={`/admin/staff-users/${row.id}`}
                        >
                            {t('View')}
                        </Link>
                        <Button variant="outline" onClick={() => setEditingUser(row)}>
                            Edit
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => setDeleting({ kind: 'users', row })}
                        >
                            Delete
                        </Button>
                    </div>
                ) : (
                    <span>{t('Mixed vendor roles require manual review.')}</span>
                ),
        },
    ];
    const roleColumns = [
        { header: 'Role Name', render: roleLabel },
        { header: 'Role Code', render: (row) => <span translate="no">{row.name}</span> },
        { header: 'Users', render: (row) => row.users_count },
        {
            header: 'Actions',
            render: (row) => (
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setEditingRole(row)}>
                        Edit
                    </Button>
                    <Button
                        variant="danger"
                        disabled={row.protected || row.users_count > 0}
                        onClick={() => setDeleting({ kind: 'roles', row })}
                    >
                        Delete
                    </Button>
                </div>
            ),
        },
    ];
    const permissionColumns = [
        {
            header: 'Permission',
            render: (row) => translateStaffPermissionField(language, row),
        },
        { header: 'Code', render: (row) => <span translate="no">{row.name}</span> },
        { header: 'Group', render: (row) => translateStaffPermissionField(language, row, 'group') },
        {
            header: 'Usage',
            render: (row) =>
                row.operational ? (
                    <span className="break-words text-xs">
                        {translateStaffPermissionField(language, row, 'usage')}
                    </span>
                ) : (
                    t('Legacy or protected permission; not selectable.')
                ),
        },
    ];
    const remove = () => {
        setBusy(true);
        router.delete(`/admin/staff-${deleting.kind}/${deleting.row.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeleting(null),
            onError: (errors) => {
                toast.error(Object.values(errors).join(' '));
                setDeleting(null);
            },
            onFinish: () => setBusy(false),
        });
    };
    return (
        <AdminLayout
            title="Staff Users"
            activeNav="Staff Users"
            header={
                <PageHeader
                    title="Staff Users"
                    subtitle="Manage staff users, roles and permissions"
                />
            }
        >
            <div className="space-y-6">
                <nav
                    aria-label={t('Staff management sections')}
                    className="inline-flex flex-wrap gap-2 rounded-xl bg-(--color-bg-tertiary) p-1"
                >
                    {[
                        ['users', 'Users'],
                        ['roles', 'Roles'],
                        ['permissions', 'Permissions'],
                    ].map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            aria-current={tab === value ? 'page' : undefined}
                            onClick={() => setTab(value)}
                            className={`rounded-lg px-4 py-2 text-sm font-medium ${focus} ${tab === value ? 'bg-(--color-brand-primary) text-white shadow-token-primary' : 'text-(--color-text-tertiary) hover:bg-(--color-bg-primary)'}`}
                        >
                            {t(label)}
                        </button>
                    ))}
                </nav>
                {tab === 'users' && (
                    <>
                        <StaffUserForm
                            key={editingUser?.id || 'new-user'}
                            roles={availableRoles}
                            editing={editingUser}
                            onDone={() => setEditingUser(null)}
                        />
                        <Card title="Internal Users">
                            <DataTable
                                columns={userColumns}
                                data={staffUsers}
                                emptyMessage="No staff users found"
                            />
                        </Card>
                    </>
                )}
                {tab === 'roles' && (
                    <>
                        <StaffRoleForm
                            key={editingRole?.id || 'new-role'}
                            permissions={permissions}
                            editing={editingRole}
                            onDone={() => setEditingRole(null)}
                        />
                        <Card title="Staff Roles">
                            <p className="p-4 text-sm">
                                {t(
                                    'Built-in role codes and assigned roles are protected from deletion.'
                                )}
                            </p>
                            <DataTable
                                columns={roleColumns}
                                data={staffRoles}
                                emptyMessage="No staff roles found"
                            />
                        </Card>
                        {legacyRoles.length > 0 && (
                            <Card title="Legacy Roles">
                                <p className="p-4">
                                    {t(
                                        'Unclassified legacy roles are preserved for manual review.'
                                    )}{' '}
                                    <span translate="no">
                                        {legacyRoles.map((role) => role.name).join(', ')}
                                    </span>
                                </p>
                            </Card>
                        )}
                    </>
                )}
                {tab === 'permissions' && (
                    <Card title="Permission Catalogue">
                        <p className="p-4 text-sm">
                            {t(
                                'Permission codes are protected. Only operational permissions can be assigned to staff roles.'
                            )}
                        </p>
                        <DataTable
                            columns={permissionColumns}
                            data={permissions}
                            emptyMessage="No permissions found"
                        />
                    </Card>
                )}
            </div>
            <Modal
                isOpen={Boolean(deleting)}
                onClose={() => {
                    if (!busy) setDeleting(null);
                }}
                title="Confirm Deletion"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setDeleting(null)} disabled={busy}>
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={remove} disabled={busy}>
                            {busy ? 'Deleting...' : 'Delete'}
                        </Button>
                    </>
                }
            >
                <p>
                    {t(
                        'Delete this record? Historical records and assigned roles cannot be deleted.'
                    )}
                </p>
                <p className="mt-2 font-medium">
                    {deleting?.row.display_name || deleting?.row.name}
                </p>
            </Modal>
        </AdminLayout>
    );
}
