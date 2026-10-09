import { FormSelect } from '@/Components/FormInputs';
import { DisabledButton } from '@/Components/DisabledActionTooltip';
import AppIcon from '@/Components/AppIcon';
import { useForm } from '@inertiajs/react';
import { useId, useMemo, useState } from 'react';
import { AdminLayout, PageHeader, Card, Button } from '@/Components';
// Translate notification delivery errors through the shared language context.
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
                        'input-field w-full min-w-0 disabled:cursor-not-allowed disabled:bg-(--color-bg-secondary) ' +
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

export default function SendNotification({ vendors = [], staffUsers = [] }) {
    // Resolve static alert messages without translating recipient data.
    const { t } = useLanguage();
    const form = useForm({
        title: '',
        message: '',
        severity: 'info',
        target: 'all_vendors',
        target_id: '',
        action_url: '',
    });

    const targetOptions = [
        { value: 'all_vendors', label: 'All Vendors' },
        { value: 'specific_vendor', label: 'Specific Vendor' },
        { value: 'specific_user', label: 'Specific User' },
    ];

    const severityOptions = [
        { value: 'info', label: 'Info' },
        { value: 'warning', label: 'Warning' },
        { value: 'critical', label: 'Critical' },
    ];

    const recipientOptions = useMemo(() => {
        if (form.data.target === 'specific_vendor') {
            return vendors.map((v) => ({
                value: v.user_id,
                label: `${v.company_name} (${v.user?.email || 'N/A'})`,
            }));
        }
        if (form.data.target === 'specific_user') {
            return staffUsers.map((u) => ({
                value: u.id,
                label: `${u.name} (${u.email})`,
            }));
        }
        return [];
    }, [form.data.target, vendors, staffUsers]);

    const showRecipientPicker = form.data.target !== 'all_vendors';

    const handleSubmit = (e) => {
        e.preventDefault();
        form.post('/admin/notifications/send', {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    };

    const header = (
        <PageHeader
            title="Send Notification"
            subtitle="Broadcast notifications to vendors or staff users"
        />
    );

    return (
        <AdminLayout title="Send Notification" activeNav="Notifications" header={header}>
            <div className="min-w-0 space-y-6">
                <Card title="Compose Notification">
                    <form noValidate onSubmit={handleSubmit} className="space-y-4">
                        <FormInput
                            disabled={form.processing}
                            disabledReason={'A request is in progress. Please wait.'}
                            label="Title"
                            value={form.data.title}
                            onChange={(val) => form.setData('title', val)}
                            placeholder="Notification title"
                            error={form.errors.title}
                            showRequiredIndicator
                        />

                        <FormTextarea
                            disabled={form.processing}
                            label="Message"
                            value={form.data.message}
                            onChange={(val) => form.setData('message', val)}
                            placeholder="Write your notification message..."
                            error={form.errors.message}
                            showRequiredIndicator
                        />

                        <div className="grid min-w-0 grid-cols-1 xl:grid-cols-2 gap-4">
                            <FormSelect
                                size="field"
                                disabled={form.processing}
                                label="Severity"
                                value={form.data.severity}
                                onChange={(val) => form.setData('severity', val)}
                                options={severityOptions}
                                error={form.errors.severity}
                                showRequiredIndicator
                            />

                            <FormSelect
                                size="field"
                                disabled={form.processing}
                                label="Send To"
                                value={form.data.target}
                                onChange={(val) => {
                                    form.setData((data) => ({
                                        ...data,
                                        target: val,
                                        target_id: '',
                                    }));
                                }}
                                options={targetOptions}
                                error={form.errors.target}
                                showRequiredIndicator
                            />
                        </div>

                        {/* Preserve database recipient names in notification targeting. */}
                        {showRecipientPicker && (
                            <FormSelect
                                size="field"
                                disabled={form.processing}
                                label="Select Recipient"
                                value={form.data.target_id}
                                onChange={(val) => form.setData('target_id', String(val))}
                                options={recipientOptions}
                                translateOptions={false}
                                placeholder="Choose a recipient..."
                                error={form.errors.target_id}
                                showRequiredIndicator
                            />
                        )}

                        <FormInput
                            disabled={form.processing}
                            disabledReason={'A request is in progress. Please wait.'}
                            label="Action URL (Optional)"
                            value={form.data.action_url}
                            onChange={(val) => form.setData('action_url', val)}
                            placeholder="/vendor/documents or any path"
                            error={form.errors.action_url}
                        />

                        {/* Localize the notification failure alert. */}
                        {form.errors.send && (
                            <p role="alert" className="text-sm text-(--color-danger)">
                                {t(form.errors.send)}
                            </p>
                        )}

                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
                            <Button
                                className="min-h-9 justify-center whitespace-normal"
                                type="button"
                                variant="outline"
                                disabled={form.processing}
                                disabledReason={'A request is in progress. Please wait.'}
                                onClick={() => form.reset()}
                            >
                                Clear
                            </Button>
                            <Button
                                className="min-h-9 justify-center whitespace-normal"
                                type="submit"
                                disabled={form.processing}
                                disabledReason={'A request is in progress. Please wait.'}
                            >
                                {form.processing ? 'Sending...' : 'Send Notification'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </AdminLayout>
    );
}
