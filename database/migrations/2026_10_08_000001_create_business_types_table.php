<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('business_types')) {
            Schema::create('business_types', function (Blueprint $table): void {
                $table->id();
                $table->string('code', 50)->unique();
                $table->string('display_name');
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        app(\App\Services\SystemMasterDataService::class)->syncBusinessTypes();
    }

    public function down(): void
    {
        // Keep the catalogue, bootstrap lock and string/JSON references intact on rollback.
    }
};
