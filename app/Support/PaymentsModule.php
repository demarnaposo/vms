<?php

namespace App\Support;

final class PaymentsModule
{
    public static function enabled(): bool
    {
        return (bool) config('features.payments.enabled', false);
    }

    public static function isPaymentPath(string $path): bool
    {
        return (bool) preg_match('~^(?:vendor/payments(?:/.*)?|admin/payments(?:/.*)?|admin/reports/payment|admin/reports/export/(?i:payment(?:_report)?))$~', trim($path, '/'));
    }
}
