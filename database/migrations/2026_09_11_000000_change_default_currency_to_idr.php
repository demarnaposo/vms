<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Start Update 11 September 2026, by @WNP: Change currency defaults safely without rewriting historical transaction data.
    public function up(): void
    {
        Schema::table('payment_requests', function (Blueprint $table) {
            $table->string('currency', 3)->default('IDR')->change();
        });

        Schema::table('vendor_bonds', function (Blueprint $table) {
            $table->string('currency', 3)->default('IDR')->change();
        });

        Schema::table('razorpay_transactions', function (Blueprint $table) {
            $table->string('currency', 3)->default('IDR')->change();
        });
    }

    // Start Update 11 September 2026, by @WNP: Restore only schema defaults when rolling back, leaving stored records untouched.
    public function down(): void
    {
        Schema::table('payment_requests', function (Blueprint $table) {
            $table->string('currency', 3)->default('INR')->change();
        });

        Schema::table('vendor_bonds', function (Blueprint $table) {
            $table->string('currency', 3)->default('INR')->change();
        });

        Schema::table('razorpay_transactions', function (Blueprint $table) {
            $table->string('currency', 3)->default('INR')->change();
        });
    }
};
