<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const CODES = [
        'gst_certificate' => 'npwp',
        'pan_card' => 'nib_oss',
        'cancelled_cheque' => 'bank_account_proof',
    ];

    public function up(): void
    {
        $this->rename(self::CODES);
    }

    public function down(): void
    {
        $this->rename(array_flip(self::CODES));
    }

    private function rename(array $mapping): void
    {
        DB::transaction(function () use ($mapping): void {
            $types = DB::table('document_types')->whereIn('name', [...array_keys($mapping), ...array_values($mapping)])
                ->orderBy('id')->lockForUpdate()->get()->groupBy('name');
            // Validate every pair before touching any row, including historical duplicate codes.
            foreach ($mapping as $old => $new) {
                $oldRows = $types->get($old, collect());
                $newRows = $types->get($new, collect());
                if ($oldRows->count() > 1 || $newRows->count() > 1 || ($oldRows->isNotEmpty() && $newRows->isNotEmpty())) {
                    throw new RuntimeException('Document type code collision: '.$old.' -> '.$new.'. Resolve manually without merging assignments.');
                }
            }
            foreach ($mapping as $old => $new) {
                $type = $types->get($old)?->first();
                if ($type) {
                    // Query builder intentionally bypasses CRUD immutability and timestamp updates.
                    DB::table('document_types')->where('id', $type->id)->where('name', $old)->update(['name' => $new]);
                }
            }
            DB::afterCommit(fn () => Cache::forget('document_types_active'));
        });
    }
};
