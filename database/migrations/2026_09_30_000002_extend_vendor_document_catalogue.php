<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Empty installations receive the full catalogue through the existing bootstrap.
        if (! DB::table('document_types')->exists()) {
            return;
        }
        $types = [
            ['name' => 'company_deed', 'display_name' => 'Company Deed of Establishment', 'description' => 'Deed establishing the company'],
            ['name' => 'bank_account_letter', 'display_name' => 'Bank Account Confirmation Letter', 'description' => 'Bank letter confirming the company account'],
            ['name' => 'domicile_letter', 'display_name' => 'Company Domicile Letter', 'description' => 'Letter confirming the company domicile'],
            ['name' => 'pic_identity_card', 'display_name' => 'PIC Identity Card (KTP)', 'description' => 'Identity card of the person in charge'],
            ['name' => 'experience_portfolio', 'display_name' => 'Experience Portfolio', 'description' => 'Portfolio of previous projects and work experience'],
            ['name' => 'business_license', 'display_name' => 'SIUP / Business License', 'description' => 'Trading license or other applicable business license'],
            ['name' => 'pkp_certificate', 'display_name' => 'PKP Certificate (if applicable)', 'description' => 'Optional certificate for vendors registered as PKP'],
        ];
        DB::transaction(function () use ($types): void {
            foreach ($types as $type) {
                if (DB::table('document_types')->where('name', $type['name'])->exists()) {
                    continue;
                }
                DB::table('document_types')->insert([
                    ...$type, 'is_mandatory' => false, 'has_expiry' => false,
                    'expiry_warning_days' => 0, 'max_file_size_mb' => 10,
                    'allowed_extensions' => json_encode(['pdf', 'jpg', 'jpeg', 'png'], JSON_THROW_ON_ERROR),
                    'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
                ]);
            }
            DB::afterCommit(fn () => Cache::forget('document_types_active'));
        });
    }

    public function down(): void
    {
        // Types can acquire documents and draft references after deployment.
        throw new RuntimeException('Document catalogue rollback requires a data-preserving review; automatic deletion is disabled.');
    }
};
