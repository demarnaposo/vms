<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $duplicates = DB::table('document_types')->select('name')->groupBy('name')->havingRaw('COUNT(*) > 1')->pluck('name');
        if ($duplicates->isNotEmpty()) {
            throw new RuntimeException('Duplicate document type codes must be resolved manually before migration: '.$duplicates->implode(', '));
        }

        if (! Schema::hasIndex('document_types', 'document_types_name_unique')) {
            Schema::table('document_types', fn (Blueprint $table) => $table->unique('name', 'document_types_name_unique'));
        }

        if (! Schema::hasTable('master_data_initializations')) {
            Schema::create('master_data_initializations', function (Blueprint $table) {
                $table->string('name')->primary();
                $table->timestamp('initialized_at');
            });
        }

        if (DB::table('document_types')->exists()) {
            DB::table('master_data_initializations')->insertOrIgnore(['name' => 'document_types', 'initialized_at' => now()]);
        }
    }

    public function down(): void
    {
        Schema::table('document_types', fn (Blueprint $table) => $table->dropUnique('document_types_name_unique'));
        Schema::dropIfExists('master_data_initializations');
    }
};
