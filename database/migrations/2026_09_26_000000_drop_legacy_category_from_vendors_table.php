<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('vendors', 'category')) {
            return;
        }

        if (! Schema::hasTable('vendor_categories') || ! Schema::hasColumn('vendors', 'category_id')) {
            throw new RuntimeException('Vendor category relation must exist before removing the legacy category column.');
        }

        DB::transaction(function (): void {
            DB::table('vendors')
                ->whereNull('category_id')
                ->whereNotNull('category')
                ->where('category', '!=', '')
                ->select('id', 'category')
                ->orderBy('id')
                ->chunkById(200, function ($vendors): void {
                    foreach ($vendors as $vendor) {
                        $value = $vendor->category;
                        if (! is_string($value) || mb_strlen($value) > 255) {
                            throw new RuntimeException('Invalid legacy vendor category at vendor ID '.$vendor->id);
                        }

                        $categoryId = DB::table('vendor_categories')->where('code', $value)->value('id');
                        if ($categoryId === null) {
                            $code = 'legacy_'.hash('sha256', $value);
                            DB::table('vendor_categories')->insertOrIgnore([
                                'code' => $code,
                                'display_name' => $value,
                                'is_active' => true,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]);
                            $categoryId = DB::table('vendor_categories')->where('code', $code)->value('id');
                        }

                        if ($categoryId === null) {
                            throw new RuntimeException('Failed to preserve legacy category at vendor ID '.$vendor->id);
                        }

                        DB::table('vendors')->where('id', $vendor->id)->whereNull('category_id')->update([
                            'category_id' => $categoryId,
                        ]);
                    }
                });

            if (DB::table('vendors')->whereNull('category_id')->whereNotNull('category')->where('category', '!=', '')->exists()) {
                throw new RuntimeException('Legacy vendor categories remain unmapped; the category column was not removed.');
            }
        });

        Schema::table('vendors', function (Blueprint $table): void {
            $table->dropColumn('category');
        });
    }

    public function down(): void
    {
        throw new RuntimeException('Reversing this migration could discard categories managed through category_id.');
    }
};
