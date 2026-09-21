<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Change currency defaults safely without rewriting historical transaction data.
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

    // Restore only schema defaults when rolling back, leaving stored records untouched.
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
