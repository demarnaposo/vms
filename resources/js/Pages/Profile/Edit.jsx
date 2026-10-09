import { useForm, usePage } from '@inertiajs/react';
import { Fragment, useId, useState } from 'react';
import PasswordInput from '@/Components/PasswordInput';
// Translate profile settings text from the shared language state.
import { useLanguage } from '@/Contexts/LanguageContext';
import {
    VendorLayout,
    AdminLayout,
    PageHeader,
    Card,
    Button,
    FormInput,
    Modal,
    ModalCancelButton,
    ModalPrimaryButton,
    Alert,
    AppIcon,
} from '@/Components';

function AdminProfileField({ label, type = 'text', value, onChange, error, required }) {
    const id = useId();
    const { t } = useLanguage();
    const inputProps = {
        id,
        value,
        onChange: (event) => onChange(event.target.value),
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error ? `${id}-error` : undefined,
        className: `w-full min-w-0 rounded-xl border bg-(--color-bg-primary) px-4 py-3 text-(--color-text-primary) transition-colors focus:outline-none focus:ring-2 ${error ? 'border-(--color-danger) focus:ring-(--color-danger)/20' : 'border-(--color-border-primary) focus:border-(--color-brand-primary) focus:ring-(--color-brand-primary)/20'}`,
    };
    return (
        <div className="min-w-0">
            <label
                htmlFor={id}
                className="mb-2 block text-sm font-semibold text-(--color-text-primary)"
            >
                {t(label)}{' '}
                {required && (
                    <span aria-hidden="true" className="text-(--color-danger)">
                        *
                    </span>
                )}
            </label>
            {type === 'password' ? (
                <PasswordInput {...inputProps} />
            ) : (
                <input {...inputProps} type={type} />
            )}
            {error && (
                <p
                    id={`${id}-error`}
                    className="mt-1 text-sm text-(--color-danger) [overflow-wrap:anywhere]"
                >
                    {error}
                </p>
            )}
        </div>
    );
}

function AdminProfileModal(props) {
    return (
        <div className="[&_.glass-modal]:min-w-0 [&_.glass-modal]:max-h-[calc(100dvh-2rem)] [&_.glass-modal]:overflow-y-auto [&_.glass-modal]:p-4 sm:[&_.glass-modal]:p-6 [&_h3]:min-w-0 [&_h3]:break-words [&_button]:min-h-9 [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-2 [&_button]:focus-visible:outline-(--color-brand-primary)">
            <Modal {...props} />
        </div>
    );
}

export default function ProfileEdit() {
    // Resolve static profile navigation labels without changing user data.
    const { t } = useLanguage();
    const { auth } = usePage().props;
    const user = auth?.user;
    const isVendor = auth?.roles?.includes('vendor');

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [activeSection, setActiveSection] = useState('profile');

    const profileForm = useForm({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
    });

    const passwordForm = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const deleteForm = useForm({
        password: '',
    });

    const updateProfile = (e) => {
        e.preventDefault();
        profileForm.patch('/profile');
    };

    const updatePassword = (e) => {
        e.preventDefault();
        passwordForm.post('/profile/password', {
            onSuccess: () => passwordForm.reset(),
        });
    };

    const deleteAccount = () => {
        deleteForm.delete('/profile', {
            onSuccess: () => (window.location.href = '/'),
        });
    };

    const Layout = isVendor ? VendorLayout : AdminLayout;
    const ProfileField = isVendor ? FormInput : AdminProfileField;
    const ProfileModal = isVendor ? Modal : AdminProfileModal;
    const ModalFooter = isVendor ? Fragment : 'div';
    const adminActionClass = isVendor
        ? undefined
        : 'min-h-9 w-full justify-center whitespace-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-brand-primary) sm:w-auto';
    const layoutProps = isVendor
        ? { title: 'Profile Settings', activeNav: 'Profile' }
        : { title: 'Profile Settings', activeNav: 'Dashboard' };

    const header = <PageHeader title="Profile Settings" subtitle="Manage your account settings" />;

    const sections = [
        { id: 'profile', label: 'Profile', icon: 'profile' },
        { id: 'password', label: 'Password', icon: 'settings' },
        { id: 'danger', label: 'Danger Zone', icon: 'warning' },
    ];

    return (
        <Layout {...layoutProps} header={header}>
            <div
                className={
                    isVendor ? 'max-w-4xl' : 'min-w-0 max-w-4xl space-y-6 [overflow-wrap:anywhere]'
                }
            >
                {/* Section Tabs */}
                <div className={isVendor ? 'flex gap-2 mb-8' : 'flex flex-wrap gap-2 mb-6'}>
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            type={isVendor ? undefined : 'button'}
                            aria-pressed={isVendor ? undefined : activeSection === section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`${isVendor ? '' : 'min-h-9 min-w-0 justify-center whitespace-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-brand-primary) '}flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                activeSection === section.id
                                    ? 'bg-(--color-brand-primary) text-white shadow-md'
                                    : 'bg-(--color-bg-primary) text-(--color-text-secondary) hover:text-(--color-brand-primary) border border-(--color-border-primary) shadow-sm'
                            }`}
                        >
                            <span className="inline-flex">
                                <AppIcon name={section.icon} className="h-4 w-4" />
                            </span>
                            {/* Localize only the fixed profile section label. */}
                            {t(section.label)}
                        </button>
                    ))}
                </div>

                {/* Profile Section */}
                {activeSection === 'profile' && (
                    <Card title="Profile Information">
                        <form
                            noValidate={!isVendor}
                            onSubmit={updateProfile}
                            className={isVendor ? 'p-6 space-y-6' : 'min-w-0 space-y-5'}
                        >
                            <ProfileField
                                label="Full Name"
                                value={profileForm.data.name}
                                onChange={(val) => profileForm.setData('name', val)}
                                error={profileForm.errors.name}
                                required
                            />
                            <ProfileField
                                label="Email Address"
                                type="email"
                                value={profileForm.data.email}
                                onChange={(val) => profileForm.setData('email', val)}
                                error={profileForm.errors.email}
                                required
                            />
                            <ProfileField
                                label="Phone Number / Mobile"
                                value={profileForm.data.phone}
                                onChange={(val) => profileForm.setData('phone', val)}
                                error={profileForm.errors.phone}
                            />
                            <div className="flex justify-end">
                                <Button
                                    className={adminActionClass}
                                    type="submit"
                                    disabled={profileForm.processing}
                                    disabledReason={'A request is in progress. Please wait.'}
                                >
                                    {profileForm.processing ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                )}

                {/* Password Section */}
                {activeSection === 'password' && (
                    <Card title="Update Password">
                        <form
                            noValidate={!isVendor}
                            onSubmit={updatePassword}
                            className={isVendor ? 'p-6 space-y-6' : 'min-w-0 space-y-5'}
                        >
                            <ProfileField
                                label="Current Password"
                                type="password"
                                value={passwordForm.data.current_password}
                                onChange={(val) => passwordForm.setData('current_password', val)}
                                error={passwordForm.errors.current_password}
                                required
                            />
                            <ProfileField
                                label="New Password"
                                type="password"
                                value={passwordForm.data.password}
                                onChange={(val) => passwordForm.setData('password', val)}
                                error={passwordForm.errors.password}
                                required
                            />
                            <ProfileField
                                label="Confirm New Password"
                                {...(!isVendor
                                    ? { error: passwordForm.errors.password_confirmation }
                                    : {})}
                                type="password"
                                value={passwordForm.data.password_confirmation}
                                onChange={(val) =>
                                    passwordForm.setData('password_confirmation', val)
                                }
                                required
                            />
                            <div className="flex justify-end">
                                <Button
                                    className={adminActionClass}
                                    type="submit"
                                    disabled={passwordForm.processing}
                                    disabledReason={'A request is in progress. Please wait.'}
                                >
                                    {passwordForm.processing ? 'Updating...' : 'Update Password'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                )}

                {/* Danger Zone */}
                {activeSection === 'danger' && (
                    <Card title="Danger Zone">
                        <div className={isVendor ? 'p-6' : 'min-w-0 space-y-6 [&_.flex-1]:min-w-0'}>
                            <Alert type="warning" title="Delete Account">
                                Once you delete your account, all of your data will be permanently
                                removed. This action cannot be undone.
                            </Alert>
                            <div className="mt-6">
                                <Button
                                    className={adminActionClass}
                                    variant="danger"
                                    onClick={() => setShowDeleteModal(true)}
                                >
                                    Delete My Account
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <ProfileModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Delete Account"
                footer={
                    <ModalFooter
                        {...(!isVendor
                            ? {
                                  className:
                                      'flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:justify-end [&>button]:w-full sm:[&>button]:w-auto [&_[data-disabled-trigger]]:w-full sm:[&_[data-disabled-trigger]]:w-auto [&_button]:justify-center [&_button]:whitespace-normal',
                              }
                            : {})}
                    >
                        <ModalCancelButton onClick={() => setShowDeleteModal(false)} />
                        <ModalPrimaryButton
                            variant="danger"
                            onClick={deleteAccount}
                            disabled={!deleteForm.data.password || deleteForm.processing}
                            disabledReason={
                                deleteForm.processing
                                    ? 'A request is in progress. Please wait.'
                                    : 'Enter your password before deleting your account.'
                            }
                        >
                            {deleteForm.processing ? 'Deleting...' : 'Delete Account'}
                        </ModalPrimaryButton>
                    </ModalFooter>
                }
            >
                <div className="space-y-4">
                    <Alert type="error">
                        This action is irreversible. All your data will be permanently deleted.
                    </Alert>
                    <ProfileField
                        label="Enter your password to confirm"
                        type="password"
                        value={deleteForm.data.password}
                        onChange={(val) => deleteForm.setData('password', val)}
                        error={deleteForm.errors.password}
                        required
                    />
                </div>
            </ProfileModal>
        </Layout>
    );
}
