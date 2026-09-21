<?php

namespace App\Support;

final class IndonesianBusinessIdentifier
{
    // Keep Indonesian business identifiers in a digits-only storage format.
    public static function normalize(mixed $value): mixed
    {
        if (! is_string($value)) {
            return $value;
        }

        return preg_replace('/\D+/', '', $value) ?? '';
    }
}
