<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('vendor_states')) {
            DB::table('vendor_states')->where('name', 'terminated')->where('is_terminal', true)
                ->update(['is_terminal' => false]);
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('vendor_states')) {
            DB::table('vendor_states')->where('name', 'terminated')->where('is_terminal', false)
                ->update(['is_terminal' => true]);
        }
    }
};
