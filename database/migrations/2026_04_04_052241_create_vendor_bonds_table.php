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
        Schema::create('vendor_bonds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vendor_id')->constrained()->cascadeOnDelete();
            $table->decimal('total_amount', 12, 2);
            $table->decimal('current_balance', 12, 2);
            // Start Update 11 September 2026, by @WNP: Use IDR as the vendor bond currency default for fresh installations.
            $table->string('currency', 3)->default('IDR');
            $table->enum('status', ['PENDING', 'PAID', 'PARTIALLY_FORFEITED', 'REFUNDED', 'FORFEITED'])->default('PENDING');
            $table->timestamp('valid_until')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vendor_bonds');
    }
};
