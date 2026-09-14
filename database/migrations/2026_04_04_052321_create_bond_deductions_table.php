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
        Schema::create('bond_deductions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vendor_bond_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount_deducted', 12, 2);
            $table->string('reason');
            $table->foreignId('admin_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bond_deductions');
    }
};
