import { Link } from '@inertiajs/react';
import { AdminLayout, Card, PageHeader } from '@/Components';
import { useLanguage } from '@/Contexts/LanguageContext';
import { translateStaffRoleOption } from '@/i18n/staffRoles';

export default function StaffUserShow({ staffUser }) {
    const { language, t } = useLanguage();
    return (
        <AdminLayout
            title="Staff User Details"
            activeNav="Staff Users"
            header={<PageHeader title="Staff User Details" />}
        >
            <Card title="Staff User Details">
                <dl className="grid gap-4 p-4">
                    <div>
                        <dt>{t('Name')}</dt>
                        <dd>{staffUser.name}</dd>
                    </div>
                    <div>
                        <dt>{t('Email')}</dt>
                        <dd>{staffUser.email}</dd>
                    </div>
                    <div>
                        <dt>{t('Roles')}</dt>
                        <dd>
                            {staffUser.role_items
                                .map((role) =>
                                    translateStaffRoleOption(language, {
                                        value: role.name,
                                        label: role.display_name,
                                    })
                                )
                                .join(', ')}
                        </dd>
                    </div>
                </dl>
            </Card>
            <Link className="btn-primary mt-4 inline-flex" href="/admin/staff-users">
                {t('Back')}
            </Link>
        </AdminLayout>
    );
}
