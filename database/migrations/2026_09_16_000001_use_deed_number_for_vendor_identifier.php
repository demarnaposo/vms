<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Start Update 16 September 2026, by @WNP: Reuse the obsolete identifier column for the vendor deed number.
        Schema::table('vendors', function (Blueprint $table) {
            $table->renameColumn('pan_number', 'deed_number');
        });
    }

    public function down(): void
    {
        // Start Update 16 September 2026, by @WNP: Restore the previous column name when rolling back.
        Schema::table('vendors', function (Blueprint $table) {
            $table->renameColumn('deed_number', 'pan_number');
        });
    }
};
