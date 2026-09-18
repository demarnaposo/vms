<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Start Update 16 September 2026, by @WNP: Expand VMS-owned document labels without changing stable keys or relations.
        DB::table('document_types')
            ->where('name', 'gst_certificate')
            ->update([
                'display_name' => 'Taxpayer Identification Number (NPWP) Document',
                'updated_at' => now(),
            ]);

        DB::table('document_types')
            ->where('name', 'pan_card')
            ->update([
                'display_name' => 'Business Identification Number (NIB) Document',
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        // Start Update 16 September 2026, by @WNP: Keep expanded master labels during rollback.
    }
};
