<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('vendor_categories')) {
            Schema::create('vendor_categories', function (Blueprint $table) {
                $table->id();
                $table->string('code', 100)->unique();
                $table->string('display_name');
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasColumn('vendors', 'category_id')) {
            Schema::table('vendors', function (Blueprint $table) {
                $table->foreignId('category_id')->nullable()->constrained('vendor_categories')->restrictOnDelete();
            });
        }

        DB::transaction(function (): void {
            $resolve = function (string $value): int {
                $builtIn = DB::table('vendor_categories')->where('code', $value)->value('id');
                if ($builtIn !== null) {
                    return (int) $builtIn;
                }

                if (mb_strlen($value) > 255) {
                    throw new RuntimeException('A legacy vendor category exceeds 255 characters; resolve it before migration.');
                }

                $code = 'legacy_'.hash('sha256', $value);
                DB::table('vendor_categories')->insertOrIgnore([
                    'code' => $code,
                    'display_name' => $value,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                return (int) DB::table('vendor_categories')->where('code', $code)->value('id');
            };

            DB::table('vendors')->whereNull('category_id')->select('id', 'category')->orderBy('id')->chunkById(200, function ($vendors) use ($resolve): void {
                foreach ($vendors as $vendor) {
                    if ($vendor->category !== null && $vendor->category !== '') {
                        DB::table('vendors')->where('id', $vendor->id)->update(['category_id' => $resolve($vendor->category)]);
                    }
                }
            });

            DB::table('vendor_applications')->select('id', 'data')->orderBy('id')->chunkById(200, function ($applications) use ($resolve): void {
                foreach ($applications as $application) {
                    $data = json_decode($application->data ?? '{}', true, 512, JSON_THROW_ON_ERROR);
                    if (! is_array($data)) {
                        throw new RuntimeException('Invalid vendor application data at ID '.$application->id);
                    }
                    $step1 = $data['step1'] ?? null;
                    if (is_array($step1) && ! isset($step1['category_id']) && isset($step1['category']) && $step1['category'] !== '') {
                        if (! is_string($step1['category'])) {
                            throw new RuntimeException('Invalid legacy category in vendor application ID '.$application->id);
                        }
                        $data['step1']['category_id'] = $resolve($step1['category']);
                        DB::table('vendor_applications')->where('id', $application->id)->update([
                            'data' => json_encode($data, JSON_THROW_ON_ERROR),
                        ]);
                    }
                }
            });
        });
    }

    public function down(): void
    {
        throw new RuntimeException('Reversing vendor categories would discard category IDs created after migration.');
    }
};
