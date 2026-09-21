<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Change the vendor country default without rewriting historical addresses.
    public function up(): void
    {
        Schema::table('vendors', function (Blueprint $table) {
            $table->string('country')->default('Indonesia')->change();
        });
    }

    // Restore the previous schema default when rolling back.
    public function down(): void
    {
        Schema::table('vendors', function (Blueprint $table) {
            $table->string('country')->default('India')->change();
        });
    }
};
