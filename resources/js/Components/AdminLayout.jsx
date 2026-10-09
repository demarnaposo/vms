import { Head } from '@inertiajs/react';
import React from 'react';
import AppIcon from './AppIcon';
import Sidebar from './Sidebar';
import LayoutHeader from './LayoutHeader';
// Translate admin layout titles globally.
import { useLanguage } from '@/Contexts/LanguageContext';

// =====================================
// ADMIN LAYOUT - Professional Design
// =====================================
export default function AdminLayout({
    children,
    title = 'Admin',
    activeNav = 'Dashboard',
    header = null,
    badges = {},
}) {
    const { t } = useLanguage();

    const [sidebarOpen, setSidebarOpen] = React.useState(false);

    return (
        <>
            <Head title={t(title)} />
            <div className="app-shell min-h-screen bg-(--color-bg-secondary) flex">
                <div className="animated-backdrop" aria-hidden="true">
                    <div className="animated-backdrop__grid" />
                </div>
                <Sidebar
                    activeItem={activeNav}
                    variant="admin"
                    badges={badges}
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                />

                <main className="flex-1 w-full md:pl-64 transition-all">
                    {/* Mobile Header */}
                    <div className="md:hidden h-[73px] border-b border-(--color-border-primary) bg-(--color-bg-primary)/90 backdrop-blur-xl flex items-center px-5 justify-between sticky top-0 z-30">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="p-2 -ml-2 rounded-lg text-(--color-text-secondary) hover:bg-(--color-bg-hover)"
                            >
                                <AppIcon name="menu" className="w-6 h-6" fallback={t('Menu')} />
                            </button>
                            <span className="font-bold text-(--color-text-primary) tracking-tight">
                                {t(title)}
                            </span>
                        </div>
                    </div>

                    <LayoutHeader>{header}</LayoutHeader>

                    <div className="p-4 md:p-8">{children}</div>
                </main>
            </div>
        </>
    );
}
