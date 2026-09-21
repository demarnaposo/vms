<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Reuse the obsolete identifier column for the vendor deed number.
        Schema::table('vendors', function (Blueprint $table) {
            $table->renameColumn('pan_number', 'deed_number');
        });
    }

    public function down(): void
    {
        // Restore the previous column name when rolling back.
        Schema::table('vendors', function (Blueprint $table) {
            $table->renameColumn('deed_number', 'pan_number');
        });
    }
};
