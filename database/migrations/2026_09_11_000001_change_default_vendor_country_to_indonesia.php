<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Start Update 11 September 2026, by @WNP: Change the vendor country default without rewriting historical addresses.
    public function up(): void
    {
        Schema::table('vendors', function (Blueprint $table) {
            $table->string('country')->default('Indonesia')->change();
        });
    }

    // Start Update 11 September 2026, by @WNP: Restore the previous schema default when rolling back.
    public function down(): void
    {
        Schema::table('vendors', function (Blueprint $table) {
            $table->string('country')->default('India')->change();
        });
    }
};
