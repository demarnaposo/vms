import { paymentsEnabled, paymentLinkVisible } from '@/utils/paymentModule';
import { ActionButton, ActionAnchor } from '@/Components/ActionControls';
import { router, usePage } from '@inertiajs/react';
import { VendorLayout, PageHeader, Card, AppIcon } from '@/Components';
import { formatRelativeTime } from '@/utils/dateFormatters';
// Translate vendor notification controls without altering stored notification content.
import { useLanguage } from '@/Contexts/LanguageContext';
import PaginationLinks from '@/Components/PaginationLinks';

export default function Notifications({
    vendor,
    notifications = { data: [] },
    unreadCount = 0,
    totalCount = 0,
    filter = 'all',
}) {
    // Use the selected language for static labels and relative timestamps.
    const { language, t } = useLanguage();
    const { features } = usePage().props;
    const dateLocale = language === 'id' ? 'id-ID' : 'en-US';
    const displayNotifications = notifications.data || [];

    const notificationTypes = {
        document: {
            icon: 'documents',
            label: 'Document',
            color: 'bg-(--color-info-light) text-(--color-info)',
        },
        payment: {
            icon: 'payments',
            label: 'Payment',
            color: 'bg-(--color-success-light) text-(--color-success)',
        },
        compliance: {
            icon: 'compliance',
            label: 'Compliance',
            color: 'bg-(--color-warning-light) text-(--color-warning)',
        },
        performance: {
            icon: 'trend',
            label: 'Performance',
            color: 'bg-(--color-brand-primary-light) text-(--color-brand-primary)',
        },
        system: {
            icon: 'settings',
            label: 'System',
            color: 'bg-(--color-bg-tertiary) text-(--color-text-tertiary)',
        },
        status: {
            icon: 'metrics',
            label: 'Status',
            color: 'bg-(--color-brand-primary-light) text-(--color-brand-primary)',
        },
    };

    const handleMarkAsRead = (id) => {
        router.patch(
            `/vendor/notifications/${id}/read`,
            {},
            {
                preserveScroll: true,
            }
        );
    };

    const handleMarkAllAsRead = () => {
        router.patch(
            '/vendor/notifications/read-all',
            {},
            {
                preserveScroll: true,
            }
        );
    };

    const header = (
        // Localize singular and plural unread counts.
        <PageHeader
            title="Notifications"
            subtitle={t(
                unreadCount === 1 ? ':count unread notification' : ':count unread notifications',
                { count: unreadCount }
            )}
            actions={
                unreadCount > 0 && (
                    <ActionButton variant="primary" onClick={handleMarkAllAsRead}>
                        Mark All as Read
                    </ActionButton>
                )
            }
        />
    );

    const filters = [
        { id: 'all', label: 'All', count: totalCount },
        { id: 'unread', label: 'Unread', count: unreadCount },
        { id: 'document', label: 'Documents' },
        { id: 'payment', label: 'Payments' },
        { id: 'compliance', label: 'Compliance' },
    ];

    return (
        <VendorLayout
            title="Notifications"
            activeNav="Notifications"
            header={header}
            vendor={vendor}
        >
            <div className="space-y-6">
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {filters.map((f) => (
                        <button
                            key={f.id}
                            onClick={() =>
                                router.get(
                                    '/vendor/notifications',
                                    { filter: f.id },
                                    { preserveScroll: true }
                                )
                            }
                            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                                filter === f.id
                                    ? 'bg-(--color-brand-primary) text-white'
                                    : 'bg-(--color-bg-secondary) text-(--color-text-secondary) hover:bg-(--color-bg-hover)'
                            }`}
                        >
                            {/* Translate fixed filter labels while preserving filter codes. */}
                            {t(f.label)}
                            {f.count !== undefined && (
                                <span
                                    className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                                        filter === f.id
                                            ? 'bg-(--color-bg-primary)/20'
                                            : 'bg-(--color-bg-tertiary)'
                                    }`}
                                >
                                    {f.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <Card>
                    {displayNotifications.length === 0 ? (
                        <div className="p-12 text-center text-(--color-text-tertiary)">
                            <div className="text-5xl mb-4 inline-flex justify-center w-full">
                                <AppIcon name="notifications" className="h-12 w-12" />
                            </div>
                            <p className="text-lg font-medium">{t('No notifications')}</p>
                            <p className="text-sm mt-1">
                                {filter === 'all'
                                    ? t('You are all caught up.')
                                    : t('No notifications found for this filter.')}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-(--color-border-secondary)">
                            {displayNotifications.map((notification) => {
                                const typeInfo =
                                    notificationTypes[notification.data?.type] ||
                                    notificationTypes.system;
                                const isUnread = !notification.read_at;

                                return (
                                    <div
                                        key={notification.id}
                                        className={`p-4 hover:bg-(--color-bg-hover) transition-colors ${
                                            isUnread ? 'bg-(--color-brand-primary-light)/50' : ''
                                        }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${typeInfo.color}`}
                                            >
                                                <AppIcon name={typeInfo.icon} className="h-5 w-5" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3
                                                        className={`font-medium ${
                                                            isUnread
                                                                ? 'text-(--color-text-primary)'
                                                                : 'text-(--color-text-secondary)'
                                                        }`}
                                                    >
                                                        {notification.data?.title}
                                                    </h3>
                                                    <span className="text-xs text-(--color-text-muted) whitespace-nowrap">
                                                        {formatRelativeTime(
                                                            notification.created_at,
                                                            dateLocale
                                                        )}
                                                    </span>
                                                </div>
                                                <p
                                                    className={`text-sm mt-1 ${
                                                        isUnread
                                                            ? 'text-(--color-text-secondary)'
                                                            : 'text-(--color-text-tertiary)'
                                                    }`}
                                                >
                                                    {notification.data?.message}
                                                </p>

                                                {notification.data?.action_url &&
                                                    paymentLinkVisible(
                                                        notification.data.action_url,
                                                        features
                                                    ) && (
                                                        <ActionAnchor
                                                            variant="outline"
                                                            href={notification.data.action_url}
                                                            className="mt-2"
                                                        >
                                                            {/* Preserve stored action text and translate only the system fallback. */}
                                                            {notification.data.action_text ||
                                                                t('View Details')}
                                                        </ActionAnchor>
                                                    )}
                                            </div>

                                            {isUnread && (
                                                <ActionButton
                                                    type="button"
                                                    onClick={() =>
                                                        handleMarkAsRead(notification.id)
                                                    }
                                                    className="shrink-0"
                                                >
                                                    {t('Mark read')}
                                                </ActionButton>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <PaginationLinks links={notifications.links} />
                </Card>

                {totalCount === 0 && (
                    <Card title="What notifications will you receive?">
                        <div className="grid md:grid-cols-2 gap-4">
                            {[
                                {
                                    icon: 'documents',
                                    title: 'Document Updates',
                                    desc: 'When your documents are verified or need attention',
                                },
                                {
                                    icon: 'payments',
                                    title: 'Payment Status',
                                    desc: 'Updates on your payment requests and approvals',
                                },
                                {
                                    icon: 'compliance',
                                    title: 'Compliance Alerts',
                                    desc: 'When compliance status changes or action needed',
                                },
                                {
                                    icon: 'metrics',
                                    title: 'Account Updates',
                                    desc: 'Status changes and important announcements',
                                },
                            ]
                                .filter(
                                    (item) => paymentsEnabled(features) || item.icon !== 'payments'
                                )
                                .map((item, index) => (
                                    <div key={index} className="flex items-start gap-3">
                                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--color-brand-primary-light) text-(--color-brand-primary)">
                                            <AppIcon name={item.icon} className="h-5 w-5" />
                                        </span>
                                        <div className="min-w-0">
                                            <div className="font-medium text-(--color-text-primary)">
                                                {t(item.title)}
                                            </div>
                                            <div className="text-sm text-(--color-text-secondary)">
                                                {t(item.desc)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </Card>
                )}
            </div>
        </VendorLayout>
    );
}
