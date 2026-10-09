<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('vendor_categories', 'description')) {
            Schema::table('vendor_categories', fn (Blueprint $table) => $table->text('description')->nullable());
        }
        DB::table('master_data_initializations')->insertOrIgnore(['name' => 'vendor_categories_lock', 'initialized_at' => now()]);
    }

    public function down(): void
    {
        // Keep descriptions and the catalogue lock intact; dropping them would discard administrator data.
    }
};
