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
        Schema::create('vendor_proposals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vendor_application_id')->constrained()->cascadeOnDelete();
            $table->string('document_path')->nullable();
            $table->string('proposal_hash')->nullable();
            $table->enum('status', ['DRAFT', 'SENT', 'DIGITALLY_SIGNED', 'REJECTED'])->default('DRAFT');
            $table->string('ip_address')->nullable();
            $table->timestamp('signed_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vendor_proposals');
    }
};
