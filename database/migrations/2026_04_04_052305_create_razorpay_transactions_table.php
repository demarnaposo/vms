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
        Schema::create('razorpay_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vendor_bond_id')->constrained()->cascadeOnDelete();
            $table->string('razorpay_order_id')->nullable();
            $table->string('razorpay_payment_id')->nullable();
            $table->string('razorpay_signature')->nullable();
            $table->decimal('amount', 12, 2);
            // Start Update 11 September 2026, by @WNP: Use IDR as the transaction currency default for fresh installations.
            $table->string('currency', 3)->default('IDR');
            $table->enum('type', ['PAYMENT', 'REFUND'])->default('PAYMENT');
            $table->enum('status', ['CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED'])->default('CREATED');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('razorpay_transactions');
    }
};
