<?php

namespace App\Support;

final class DocumentTypeCode
{
    private const LEGACY = [
        'gst_certificate' => 'npwp',
        'pan_card' => 'nib_oss',
        'cancelled_cheque' => 'bank_account_proof',
    ];

    public static function canonical(string $code): string
    {
        return self::LEGACY[$code] ?? $code;
    }

    public static function equivalents(string $code): array
    {
        $canonical = self::canonical($code);

        return array_values(array_unique([$canonical, ...array_keys(self::LEGACY, $canonical, true)]));
    }
}
