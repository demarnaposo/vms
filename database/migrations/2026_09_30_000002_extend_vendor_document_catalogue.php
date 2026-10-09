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
        $baseline = require database_path('data/system_master_data.php');
        $types = array_filter($baseline['document_types'], fn ($type) => ! $type['is_mandatory']);
        DB::transaction(function () use ($types): void {
            foreach ($types as $type) {
                if (DB::table('document_types')->where('name', $type['name'])->exists()) {
                    continue;
                }
                unset($type['sort_order']);
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
