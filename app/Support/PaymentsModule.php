<?php

namespace App\Support;

final class PaymentsModule
{
    public static function enabled(): bool
    {
        return (bool) config('features.payments.enabled', false);
    }

    public static function isPaymentPermission(string $name, ?string $group = null): bool
    {
        return str_starts_with($name, 'staff.payments.')
            || str_starts_with($name, 'payments.')
            || $group === 'payments'
            || (config('rbac.permissions', [])[$name]['group'] ?? null) === 'payments';
    }

    public static function isPaymentPath(string $path): bool
    {
        return (bool) preg_match('~^(?:vendor/payments(?:/.*)?|admin/payments(?:/.*)?|admin/reports/payment|admin/reports/export/(?i:payment(?:_report)?))$~', trim($path, '/'));
    }
}
