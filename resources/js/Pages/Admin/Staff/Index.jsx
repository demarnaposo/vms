import { DisabledButton } from '@/Components/DisabledActionTooltip';
import AppIcon from '@/Components/AppIcon';
import { ActionButton } from '@/Components/ActionControls';
import { router, useForm } from '@inertiajs/react';
import { useId, useState } from 'react';
import { toast } from 'sonner';
import { AdminLayout, Button, Card, DataTable, Modal, PageHeader } from '@/Components';
import { useLanguage } from '@/Contexts/LanguageContext';
import { translateStaffRoleOption } from '@/i18n/staffRoles';
import {
    translateStaffPermissionField,
    translateStaffPermissionGroup,
} from '@/i18n/staffPermissions';
import { formatDateTime } from '@/utils/dateFormatters';

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

const focus =
    'focus-visible:ring-2 focus-visible:ring-(--color-brand-primary) focus-visible:ring-offset-2';
const emptyUser = { name: '', email: '', password: '', password_confirmation: '', role_ids: [] };
const emptyRole = { name: '', display_name: '', description: '', permission_ids: [] };

function FormErrors({ errors }) {
    return Object.keys(errors).length ? (
        <div role="alert" className="text-sm text-(--color-danger)">
            {[...new Set(Object.values(errors))].join(' ')}
        </div>
    ) : null;
}

function StaffUserForm({ roles, editing, onDone }) {
    const roleErrorId = useId();
    const { language, t } = useLanguage();
    const form = useForm(
        editing
            ? { ...emptyUser, name: editing.name, email: editing.email, role_ids: editing.role_ids }
            : emptyUser
    );
    const roleErrors = Object.fromEntries(
        Object.entries(form.errors).filter(
            ([field]) => field === 'role_ids' || field.startsWith('role_ids.')
        )
    );
    const generalErrors = Object.fromEntries(
        Object.entries(form.errors).filter(
            ([field]) =>
                !['name', 'email', 'password', 'password_confirmation', 'role_ids'].includes(
                    field
                ) && !field.startsWith('role_ids.')
        )
    );
    const submit = (event) => {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onError: () => {
                if (editing)
                    toast.error(
                        t('Unable to update the user. Please check the highlighted fields.')
                    );
            },
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
            <form noValidate onSubmit={submit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                    <FormInput
                        disabled={form.processing}
                        disabledReason={'A request is in progress. Please wait.'}
                        label="Full Name"
                        value={form.data.name}
                        onChange={(value) => form.setData('name', value)}
                        error={form.errors.name}
                        placeholder="e.g., John Doe"
                        showRequiredIndicator
                    />
                    <FormInput
                        disabled={form.processing}
                        disabledReason={'A request is in progress. Please wait.'}
                        label="Email"
                        type="email"
                        value={form.data.email}
                        onChange={(value) => form.setData('email', value)}
                        error={form.errors.email}
                        placeholder="e.g., johndoe@example.com"
                        showRequiredIndicator
                    />
                    <FormInput
                        disabled={form.processing}
                        disabledReason={'A request is in progress. Please wait.'}
                        label={editing ? 'New Password' : 'Password'}
                        type="password"
                        autoComplete="new-password"
                        value={form.data.password}
                        onChange={(value) => form.setData('password', value)}
                        error={form.errors.password}
                        showRequiredIndicator={!editing}
                    />
                    <FormInput
                        disabled={form.processing}
                        disabledReason={'A request is in progress. Please wait.'}
                        label="Confirm Password"
                        type="password"
                        autoComplete="new-password"
                        value={form.data.password_confirmation}
                        onChange={(value) => form.setData('password_confirmation', value)}
                        error={form.errors.password_confirmation}
                        showRequiredIndicator={!editing}
                    />
                    {editing && (
                        <p className="text-sm text-(--color-text-tertiary) md:col-span-2">
                            {t('Leave blank if you do not want to change the password.')}
                        </p>
                    )}
                </div>
                <fieldset
                    className="space-y-2"
                    aria-describedby={Object.keys(roleErrors).length ? roleErrorId : undefined}
                >
                    <legend className="text-sm font-medium">
                        {t('Staff Roles')}{' '}
                        <span aria-hidden="true" className="text-(--color-danger)">
                            *
                        </span>
                    </legend>
                    <div className="flex flex-wrap gap-4">
                        {roles.map((role) => (
                            <label key={role.id} className="inline-flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    aria-invalid={Object.keys(roleErrors).length > 0}
                                    aria-describedby={
                                        Object.keys(roleErrors).length ? roleErrorId : undefined
                                    }
                                    className={'h-5 w-5 accent-(--color-brand-primary) ' + focus}
                                    checked={form.data.role_ids.includes(role.id)}
                                    onChange={() => toggle(role.id)}
                                    disabled={form.processing}
                                />
                                <span>{translateStaffRoleOption(language, role)}</span>
                            </label>
                        ))}
                    </div>
                    <div id={roleErrorId}>
                        <FormErrors errors={roleErrors} />
                    </div>
                </fieldset>
                <FormErrors errors={generalErrors} />
                <div className="flex flex-wrap justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            form.reset();
                            form.clearErrors();
                            onDone();
                        }}
                        disabled={form.processing}
                        disabledReason={'A request is in progress. Please wait.'}
                    >
                        {editing ? 'Cancel' : 'Clear Form'}
                    </Button>
                    <Button
                        type="submit"
                        disabled={form.processing}
                        disabledReason={'A request is in progress. Please wait.'}
                    >
                        {form.processing ? 'Saving...' : 'Save User'}
                    </Button>
                </div>
            </form>
        </Card>
    );
}

function StaffRoleForm({ permissions, editing, onDone }) {
    const { language, t } = useLanguage();
    const editableIds = new Set(
        permissions
            .filter((permission) => permission.operational)
            .map((permission) => permission.id)
    );
    const form = useForm(
        editing
            ? {
                  name: editing.name,
                  display_name: editing.display_name,
                  description: editing.description || '',
                  permission_ids: editing.permission_ids.filter((id) => editableIds.has(id)),
              }
            : emptyRole
    );
    const permissionErrors = Object.fromEntries(
        Object.entries(form.errors).filter(
            ([field]) => field === 'permission_ids' || field.startsWith('permission_ids.')
        )
    );
    const otherErrors = Object.fromEntries(
        Object.entries(form.errors).filter(
            ([field]) =>
                !['name', 'display_name', 'description', ...Object.keys(permissionErrors)].includes(
                    field
                )
        )
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
            <form noValidate onSubmit={submit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                    <FormInput
                        label="Role Code"
                        value={form.data.name}
                        onChange={(value) => form.setData('name', value)}
                        disabled={form.processing || Boolean(editing)}
                        error={form.errors.name}
                        placeholder="e.g., document_reviewer"
                        showRequiredIndicator
                    />
                    <FormInput
                        disabled={form.processing}
                        disabledReason={'A request is in progress. Please wait.'}
                        label="Role Name"
                        value={form.data.display_name}
                        onChange={(value) => form.setData('display_name', value)}
                        error={form.errors.display_name}
                        placeholder="e.g., Document Reviewer"
                        showRequiredIndicator
                    />
                </div>
                <FormTextarea
                    disabled={form.processing}
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
                                            aria-invalid={
                                                Object.keys(permissionErrors).length > 0 ||
                                                undefined
                                            }
                                            aria-describedby={
                                                Object.keys(permissionErrors).length > 0
                                                    ? 'role-permission-errors'
                                                    : undefined
                                            }
                                            className={`mt-1 h-5 w-5 shrink-0 accent-(--color-brand-primary) ${focus}`}
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
                <div id="role-permission-errors">
                    <FormErrors errors={permissionErrors} />
                </div>
                {editing?.legacy_permissions.length > 0 && (
                    <p className="text-sm text-(--color-text-secondary)">
                        {t('Legacy permissions are preserved and cannot be edited here.')}{' '}
                        <span translate="no">{editing.legacy_permissions.join(', ')}</span>
                    </p>
                )}
                <FormErrors errors={otherErrors} />
                <div className="flex flex-wrap justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            form.reset();
                            form.clearErrors();
                            onDone();
                        }}
                        disabled={form.processing}
                        disabledReason={'A request is in progress. Please wait.'}
                    >
                        {editing ? 'Cancel' : 'Clear Form'}
                    </Button>
                    <Button
                        type="submit"
                        disabled={form.processing}
                        disabledReason={'A request is in progress. Please wait.'}
                    >
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
            align: 'right',
            render: (row) =>
                row.manageable ? (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <ActionButton variant="primary" onClick={() => setEditingUser(row)}>
                            Edit
                        </ActionButton>
                        <ActionButton
                            variant="danger"
                            onClick={() => setDeleting({ kind: 'users', row })}
                        >
                            Delete
                        </ActionButton>
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
            align: 'right',
            render: (row) => (
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <ActionButton variant="primary" onClick={() => setEditingRole(row)}>
                        Edit
                    </ActionButton>
                    <ActionButton
                        variant="danger"
                        disabled={row.protected || row.users_count > 0}
                        disabledReason={
                            row.protected
                                ? 'Built-in roles cannot be deleted.'
                                : 'This role is assigned to staff users and cannot be deleted.'
                        }
                        onClick={() => setDeleting({ kind: 'roles', row })}
                    >
                        Delete
                    </ActionButton>
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
                            className={`rounded-lg px-4 py-2 text-sm font-medium ${focus} ${tab === value ? 'theme-primary-action shadow-token-primary' : 'text-(--color-text-tertiary) hover:bg-(--color-bg-primary)'}`}
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
                        <div className="min-w-0 [&_table]:min-w-[720px] [&_table]:table-fixed [&_th:nth-child(1)]:w-[25%] [&_th:nth-child(2)]:w-[25%] [&_th:nth-child(3)]:w-[20%] [&_th:nth-child(4)]:w-[30%] [&_td]:break-words">
                            <DataTable
                                columns={permissionColumns}
                                data={permissions}
                                emptyMessage="No permissions found"
                                stickyHeader={true}
                            />
                        </div>
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
                        <Button
                            variant="outline"
                            onClick={() => setDeleting(null)}
                            disabled={busy}
                            disabledReason={'A request is in progress. Please wait.'}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={remove}
                            disabled={busy}
                            disabledReason={'A request is in progress. Please wait.'}
                        >
                            {busy ? 'Deleting...' : 'Delete'}
                        </Button>
                    </>
                }
            >
                <p>
                    {t(
                        deleting?.kind === 'users'
                            ? 'Permanently delete this internal user? This cannot be undone. Historical records will be retained.'
                            : 'Delete this record? Historical records and assigned roles cannot be deleted.'
                    )}
                </p>
                <p className="mt-2 font-medium">
                    {deleting?.row.display_name || deleting?.row.name}
                </p>
            </Modal>
        </AdminLayout>
    );
}
