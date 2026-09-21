<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Update only VMS-owned master records while preserving document relations and uploads.
        $documents = [
            'gst_certificate' => [
                'display_name' => 'Taxpayer Identification Number (NPWP) Document',
                'description' => 'Taxpayer identification document',
            ],
            'pan_card' => [
                'display_name' => 'Business Identification Number (NIB) Document',
                'description' => 'Business identification document',
            ],
            'cancelled_cheque' => [
                'display_name' => 'Bank Account Proof',
                'description' => 'Bank account ownership proof for payment verification',
            ],
        ];

        foreach ($documents as $name => $values) {
            DB::table('document_types')
                ->where('name', $name)
                ->update(array_merge($values, ['updated_at' => now()]));
        }
    }

    public function down(): void
    {
        // Avoid restoring obsolete labels during rollback.
    }
};
