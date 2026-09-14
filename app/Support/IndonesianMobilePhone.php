<?php

namespace App\Support;

// Start Update 14 September 2026, by @WNP: Share VMS mobile-number validation and local-format normalization.
final class IndonesianMobilePhone
{
    public const LOCAL_REGEX = '/^08[1-9][0-9]{7,10}$/';

    public static function normalize(string $number): string
    {
        return str_starts_with($number, '+62') ? '0'.substr($number, 3) : $number;
    }
}
