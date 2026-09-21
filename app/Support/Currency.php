<?php

namespace App\Support;

class Currency
{
    // Format monetary values consistently using the centralized Indonesian currency configuration.
    public static function format(float|int|string|null $amount): string
    {
        $fractionDigits = (int) config('currency.fraction_digits', 0);
        $decimalSeparator = $fractionDigits > 0 ? ',' : '';

        return sprintf(
            '%s %s',
            config('currency.symbol', 'Rp'),
            number_format((float) ($amount ?? 0), $fractionDigits, $decimalSeparator, '.')
        );
    }

    // Expose the configured ISO currency code for defaults and exports.
    public static function code(): string
    {
        return (string) config('currency.code', 'IDR');
    }
}
