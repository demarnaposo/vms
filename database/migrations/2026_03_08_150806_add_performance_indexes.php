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
        Schema::table('contact_messages', function (Blueprint $table) {
            $table->index('status');
        });

        Schema::table('compliance_flags', function (Blueprint $table) {
            $table->index(['vendor_id', 'compliance_rule_id', 'status'], 'cf_vendor_rule_status_idx');
        });

        Schema::table('payment_requests', function (Blueprint $table) {
            $table->index(['status', 'created_at'], 'pr_status_created_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contact_messages', function (Blueprint $table) {
            $table->dropIndex(['status']);
        });

        Schema::table('compliance_flags', function (Blueprint $table) {
            $table->dropIndex('cf_vendor_rule_status_idx');
        });

        Schema::table('payment_requests', function (Blueprint $table) {
            $table->dropIndex('pr_status_created_idx');
        });
    }
};
