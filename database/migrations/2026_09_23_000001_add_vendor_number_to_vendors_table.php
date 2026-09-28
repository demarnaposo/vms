<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vendor_number_sequences', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
        });

        Schema::table('vendors', function (Blueprint $table) {
            $table->string('vendor_number', 32)->nullable()->unique()->after('id');
        });
    }

    public function down(): void
    {
        Schema::table('vendors', function (Blueprint $table) {
            $table->dropUnique(['vendor_number']);
            $table->dropColumn('vendor_number');
        });

        Schema::dropIfExists('vendor_number_sequences');
    }
};
