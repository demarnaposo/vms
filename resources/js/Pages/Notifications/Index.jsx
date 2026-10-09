import { ActionButton } from '@/Components/ActionControls';
import { router, usePage } from '@inertiajs/react';
import { AdminLayout, VendorLayout, PageHeader, Card, EmptyState, AppIcon } from '@/Components';
import { formatDateTime } from '@/utils/dateFormatters';
// Translate the shared notification-center interface without altering database content.
import { useLanguage } from '@/Contexts/LanguageContext';
import PaginationLinks from '@/Components/PaginationLinks';

export default function NotificationsIndex({ notifications, unreadCount }) {
    // Use the selected language for fixed copy and notification timestamps.
    const { language, t } = useLanguage();
    const dateLocale = language === 'id' ? 'id-ID' : 'en-US';
    const { auth } = usePage().props;
    const isVendor = auth?.roles?.includes('vendor');

    const markAsRead = (id) => {
        router.post(`/notifications/${id}/read`, {}, { preserveScroll: true });
    };

    const markAllAsRead = () => {
        router.post('/notifications/mark-all-read');
    };

    const severityColors = {
        info: 'border-l-status-info bg-(--color-info-light)/35',
        medium: 'border-l-status-warning bg-(--color-warning-light)/35',
        high: 'border-l-status-warning bg-(--color-warning-light)/55',
        critical: 'border-l-status-danger bg-(--color-danger-light)/40',
    };

    const severityIcons = {
        info: 'info',
        medium: 'running',
        high: 'warning',
        critical: 'error',
    };

    const displayNotifications = notifications?.data || notifications || [];
    const resolvedUnreadCount =
        unreadCount ?? displayNotifications.filter((n) => !n.read_at).length;

    const header = (
        // Localize the unread count while preserving its dynamic value.
        <PageHeader
            title="Notifications"
            actionsClassName={
                isVendor ? undefined : 'w-full md:w-auto [&>div]:w-full md:[&>div]:w-auto'
            }
            subtitle={t(':count unread', { count: resolvedUnreadCount })}
            actions={
                <ActionButton
                    className={
                        isVendor
                            ? undefined
                            : 'min-h-9 w-full justify-center whitespace-normal md:w-auto'
                    }
                    variant="primary"
                    onClick={markAllAsRead}
                >
                    Mark all as read
                </ActionButton>
            }
        />
    );

    const Layout = isVendor ? VendorLayout : AdminLayout;
    const layoutProps = {
        title: 'Notifications',
        activeNav: 'Dashboard',
        header,
    };

    return (
        <Layout {...layoutProps}>
            {displayNotifications.length === 0 ? (
                <EmptyState
                    icon="notifications"
                    title="No notifications"
                    description="You are all caught up. New notifications will appear here."
                />
            ) : (
                <Card className={isVendor ? undefined : 'min-w-0'} noPadding={!isVendor}>
                    <div className="divide-y divide-(--color-border-secondary)">
                        {displayNotifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`p-5 border-l-4 transition-colors ${
                                    severityColors[notification.data?.severity] ||
                                    'border-l-(--color-border-hover)'
                                } ${!notification.read_at ? 'bg-(--color-bg-tertiary)/20' : 'hover:bg-(--color-bg-hover)/10'}`}
                            >
                                <div
                                    className={
                                        isVendor
                                            ? 'flex items-start justify-between gap-4'
                                            : 'flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4'
                                    }
                                >
                                    <div
                                        className={
                                            isVendor
                                                ? 'flex items-start gap-4 flex-1'
                                                : 'flex min-w-0 flex-1 items-start gap-3 sm:gap-4'
                                        }
                                    >
                                        <span
                                            className={
                                                isVendor
                                                    ? 'text-2xl mt-0.5 inline-flex'
                                                    : 'mt-0.5 inline-flex shrink-0 text-2xl'
                                            }
                                        >
                                            <AppIcon
                                                name={
                                                    severityIcons[notification.data?.severity] ||
                                                    'info'
                                                }
                                                className="h-6 w-6"
                                            />
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div
                                                className={
                                                    isVendor
                                                        ? 'flex items-center gap-2 mb-1'
                                                        : 'mb-1 flex min-w-0 items-start gap-2'
                                                }
                                            >
                                                {!notification.read_at && (
                                                    <span
                                                        className={
                                                            isVendor
                                                                ? 'w-2 h-2 rounded-full bg-(--color-brand-primary) flex-shrink-0'
                                                                : 'mt-1.5 h-2 w-2 shrink-0 rounded-full bg-(--color-brand-primary)'
                                                        }
                                                    />
                                                )}
                                                <h3
                                                    className={
                                                        isVendor
                                                            ? 'font-semibold text-(--color-text-primary)'
                                                            : 'min-w-0 font-semibold text-(--color-text-primary) [overflow-wrap:anywhere]'
                                                    }
                                                >
                                                    {notification.data?.title}
                                                </h3>
                                            </div>
                                            <p
                                                className={
                                                    isVendor
                                                        ? 'text-(--color-text-tertiary) text-sm mb-2'
                                                        : 'mb-2 whitespace-pre-line text-sm text-(--color-text-tertiary) [overflow-wrap:anywhere]'
                                                }
                                            >
                                                {notification.data?.message}
                                            </p>
                                            <div className="text-xs text-(--color-text-tertiary)">
                                                {formatDateTime(
                                                    notification.created_at,
                                                    dateLocale
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {!notification.read_at && (
                                        <ActionButton
                                            className={
                                                isVendor
                                                    ? undefined
                                                    : 'min-h-9 w-full shrink-0 justify-center whitespace-normal sm:w-auto'
                                            }
                                            variant="ghost"
                                            onClick={() => markAsRead(notification.id)}
                                        >
                                            Mark read
                                        </ActionButton>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <PaginationLinks links={notifications?.links} />
                </Card>
            )}
        </Layout>
    );
}
