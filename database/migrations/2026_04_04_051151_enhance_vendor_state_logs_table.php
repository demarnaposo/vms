<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('vendor_state_logs', function (Blueprint $table) {
            $table->string('reason_code')->nullable()->after('comment');
            $table->foreignId('actioned_by_user_id')->nullable()->constrained('users')->nullOnDelete()->after('reason_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vendor_state_logs', function (Blueprint $table) {
            $table->dropForeign(['actioned_by_user_id']);
            $table->dropColumn(['reason_code', 'actioned_by_user_id']);
        });
    }
};
