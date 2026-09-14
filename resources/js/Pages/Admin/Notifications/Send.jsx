import { useForm } from '@inertiajs/react';
import { useMemo } from 'react';
import {
    AdminLayout,
    PageHeader,
    Card,
    Button,
    FormInput,
    FormTextarea,
    FormSelect,
} from '@/Components';
// Start Update 12 September 2026, by @WNP: Translate notification delivery errors through the shared language context.
import { useLanguage } from '@/Contexts/LanguageContext';

export default function SendNotification({ vendors = [], staffUsers = [] }) {
    // Start Update 12 September 2026, by @WNP: Resolve static alert messages without translating recipient data.
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
            <div className="max-w-2xl">
                <Card title="Compose Notification">
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        <FormInput
                            label="Title"
                            value={form.data.title}
                            onChange={(val) => form.setData('title', val)}
                            placeholder="Notification title"
                            error={form.errors.title}
                            required
                        />

                        <FormTextarea
                            label="Message"
                            value={form.data.message}
                            onChange={(val) => form.setData('message', val)}
                            placeholder="Write your notification message..."
                            error={form.errors.message}
                            required
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormSelect
                                label="Severity"
                                value={form.data.severity}
                                onChange={(val) => form.setData('severity', val)}
                                options={severityOptions}
                                error={form.errors.severity}
                                required
                            />

                            <FormSelect
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
                                required
                            />
                        </div>

                        {/* Start Update 12 September 2026, by @WNP: Preserve database recipient names in notification targeting. */}
                        {showRecipientPicker && (
                            <FormSelect
                                label="Select Recipient"
                                value={form.data.target_id}
                                onChange={(val) => form.setData('target_id', val)}
                                options={recipientOptions}
                                translateOptions={false}
                                placeholder="Choose a recipient..."
                                error={form.errors.target_id}
                                required
                            />
                        )}

                        <FormInput
                            label="Action URL (Optional)"
                            value={form.data.action_url}
                            onChange={(val) => form.setData('action_url', val)}
                            placeholder="/vendor/documents or any path"
                            error={form.errors.action_url}
                        />

                        {/* Start Update 12 September 2026, by @WNP: Localize the notification failure alert. */}
                        {form.errors.send && (
                            <p className="text-sm text-(--color-danger)">{t(form.errors.send)}</p>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="secondary" onClick={() => form.reset()}>
                                Clear
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Sending...' : 'Send Notification'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </AdminLayout>
    );
}
