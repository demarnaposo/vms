<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class VendorNumberGenerator
{
    public function next(): string
    {
        $sequence = DB::table('vendor_number_sequences')->insertGetId([
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $this->format((int) $sequence);
    }

    public function format(int $sequence): string
    {
        return 'V'.str_pad((string) $sequence, 3, '0', STR_PAD_LEFT);
    }
}
