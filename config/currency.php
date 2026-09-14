<?php

// Start Update 11 September 2026, by @WNP: Centralize the application's default currency and Indonesian formatting settings.
return [
    'code' => env('CURRENCY_CODE', 'IDR'),
    'symbol' => env('CURRENCY_SYMBOL', 'Rp'),
    'locale' => env('CURRENCY_LOCALE', 'id-ID'),
    'fraction_digits' => (int) env('CURRENCY_FRACTION_DIGITS', 0),
];
