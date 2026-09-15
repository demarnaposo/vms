import { useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import {
    AdminLayout,
    Badge,
    PageHeader,
    Button,
    Modal,
    ModalCancelButton,
    ModalPrimaryButton,
} from '@/Components';
import { formatDateTime } from '@/utils/dateFormatters';
// Start Update 13 September 2026, by @WNP: Translate fixed contact-status choices, not user-entered messages or notes.
import { useLanguage } from '@/Contexts/LanguageContext';

export default function Show({ message }) {
    // Start Update 15 September 2026, by @WNP: Resolve static labels and dates while retaining stored message content.
    const { language, t } = useLanguage();
    const dateLocale = language === 'id' ? 'id-ID' : 'en-IN';
    const { data, setData, put, processing, errors } = useForm({
        status: message.status,
        admin_notes: message.admin_notes || '',
    });

    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const handleUpdate = (e) => {
        e.preventDefault();
        put(`/admin/contact-messages/${message.id}`);
    };

    const handleDelete = () => {
        router.delete(`/admin/contact-messages/${message.id}`);
    };

    // Start Update 15 September 2026, by @WNP: Translate the static frame around the original sender name.
    const header = (
        <PageHeader
            title="Message Details"
            subtitle={
                <>
                    {t('From')} {message.name} - {formatDateTime(message.created_at, dateLocale)}
                </>
            }
            backLink="/admin/contact-messages"
            actions={
                <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
                    Delete
                </Button>
            }
        />
    );

    // Start Update 15 September 2026, by @WNP: Localize the page title without translating the sender name.
    return (
        <AdminLayout
            title={t('Message from :name', { name: message.name })}
            activeNav="Messages"
            header={header}
        >
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Message Card */}
                    <div className="card">
                        <div className="p-6 border-b border-(--color-border-primary)">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-xl font-semibold text-(--color-text-primary) mb-2">
                                        {message.subject}
                                    </h2>
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-(--color-brand-primary) flex items-center justify-center text-white font-medium text-sm">
                                                {message.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <span className="text-(--color-text-primary) font-medium">
                                                    {message.name}
                                                </span>
                                                <span className="text-(--color-text-tertiary) mx-2">
                                                    -
                                                </span>
                                                <span className="text-(--color-text-tertiary)">
                                                    {message.email}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <Badge status={message.status} />
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-(--color-text-secondary) whitespace-pre-wrap leading-relaxed">
                                {message.message}
                            </p>
                        </div>
                    </div>

                    {/* Admin Actions */}
                    <div className="card">
                        <div className="p-6 border-b border-(--color-border-primary)">
                            <h3 className="text-lg font-semibold text-(--color-text-primary)">
                                {/* Start Update 15 September 2026, by @WNP: Localize the fixed status action heading. */}
                                {t('Update Status')}
                            </h3>
                        </div>
                        <form onSubmit={handleUpdate} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-(--color-text-secondary) mb-2">
                                    {t('Status')}
                                </label>
                                <select
                                    value={data.status}
                                    onChange={(e) => setData('status', e.target.value)}
                                    className="input-field w-full"
                                >
                                    {/* Start Update 13 September 2026, by @WNP: Keep canonical contact-status values for submissions. */}
                                    <option value="new">{t('new')}</option>
                                    <option value="read">{t('read')}</option>
                                    <option value="replied">{t('replied')}</option>
                                    <option value="closed">{t('closed')}</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-(--color-text-secondary) mb-2">
                                    {t('Internal Notes')}
                                </label>
                                <textarea
                                    value={data.admin_notes}
                                    onChange={(e) => setData('admin_notes', e.target.value)}
                                    rows={4}
                                    className="input-field w-full resize-none"
                                    placeholder={t('Add notes for your team...')}
                                />
                                {/* Start Update 15 September 2026, by @WNP: Surface localized server validation while preserving typed notes. */}
                                {errors.admin_notes && (
                                    <p className="text-sm text-(--color-danger) mt-1" role="alert">
                                        {t(errors.admin_notes)}
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-end pt-2">
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Sender Info */}
                    <div className="card p-6">
                        <h3 className="text-sm font-semibold text-(--color-text-tertiary) uppercase tracking-wider mb-4">
                            {/* Start Update 15 September 2026, by @WNP: Localize the fixed sender information heading. */}
                            {t('Sender Details')}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-(--color-text-tertiary) uppercase font-medium">
                                    {t('Name')}
                                </label>
                                <p className="text-(--color-text-primary) mt-1">{message.name}</p>
                            </div>
                            <div>
                                <label className="text-xs text-(--color-text-tertiary) uppercase font-medium">
                                    {t('Email')}
                                </label>
                                <p className="mt-1">
                                    <a
                                        href={`mailto:${message.email}`}
                                        className="text-(--color-brand-primary) hover:underline break-all"
                                    >
                                        {message.email}
                                    </a>
                                </p>
                            </div>
                            <div>
                                <label className="text-xs text-(--color-text-tertiary) uppercase font-medium">
                                    {t('Received')}
                                </label>
                                <p className="text-(--color-text-primary) mt-1">
                                    {formatDateTime(message.created_at, dateLocale)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Reply */}
                    <div className="card p-6 bg-gradient-to-br from-(--color-brand-primary)/10 to-(--color-brand-secondary)/10 border-(--color-brand-primary)/20">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-(--color-brand-primary) flex items-center justify-center">
                                <svg
                                    className="w-5 h-5 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                    />
                                </svg>
                            </div>
                            <h4 className="font-semibold text-(--color-text-primary)">
                                {/* Start Update 15 September 2026, by @WNP: Localize quick-reply controls without changing the recipient. */}
                                {t('Quick Reply')}
                            </h4>
                        </div>
                        <p className="text-sm text-(--color-text-secondary) mb-4">
                            {t('Open your email client to respond directly.')}
                        </p>
                        <a
                            href={`mailto:${message.email}?subject=Re: ${encodeURIComponent(message.subject)}`}
                            className="block w-full py-2.5 px-4 bg-(--color-brand-primary) text-white text-center font-medium rounded-lg hover:opacity-90 transition-opacity"
                        >
                            {t('Compose Reply')}
                        </a>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Delete Message"
                footer={
                    <>
                        <ModalCancelButton onClick={() => setShowDeleteModal(false)} />
                        <ModalPrimaryButton variant="danger" onClick={handleDelete}>
                            Delete
                        </ModalPrimaryButton>
                    </>
                }
            >
                <p className="text-sm text-(--color-text-secondary)">
                    {t(
                        'Are you sure you want to delete this message? This action cannot be undone.'
                    )}
                </p>
            </Modal>
        </AdminLayout>
    );
}
