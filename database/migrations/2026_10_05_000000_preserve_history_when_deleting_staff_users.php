<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const REFERENCES = [
        ['vendors', 'approved_by', true],
        ['vendor_state_logs', 'user_id', false],
        ['payment_requests', 'requested_by', false],
        ['payment_approvals', 'user_id', true],
        ['audit_logs', 'user_id', true],
        ['vendor_documents', 'verified_by', true],
        ['document_versions', 'uploaded_by', false],
        ['performance_scores', 'scored_by', false],
        ['compliance_results', 'resolved_by', true],
        ['bond_deductions', 'admin_id', false],
    ];

    public function up(): void
    {
        foreach (self::REFERENCES as [$table, $column]) {
            $this->replaceReference($table, $column, true, 'set null');
        }
    }

    public function down(): void
    {
        // A deleted actor cannot be reconstructed without inventing historical attribution.
        foreach (self::REFERENCES as [$table, $column, $nullable]) {
            if (! $nullable && DB::table($table)->whereNull($column)->exists()) {
                throw new RuntimeException('Cannot roll back staff deletion history references while deleted actors exist.');
            }
        }
        foreach (self::REFERENCES as [$table, $column, $nullable]) {
            $this->replaceReference($table, $column, $nullable, $table === 'bond_deductions' ? 'cascade' : 'no action');
        }
    }

    private function replaceReference(string $table, string $column, bool $nullable, string $onDelete): void
    {
        foreach (Schema::getForeignKeys($table) as $foreign) {
            if ($foreign['columns'] === [$column] && $foreign['foreign_table'] === 'users') {
                Schema::table($table, fn (Blueprint $blueprint) => $blueprint->dropForeign(Schema::getConnection()->getDriverName() === 'sqlite' ? [$column] : $foreign['name']));
            }
        }
        Schema::table($table, fn (Blueprint $blueprint) => $blueprint->unsignedBigInteger($column)->nullable($nullable)->change());
        Schema::table($table, fn (Blueprint $blueprint) => $blueprint->foreign($column)->references('id')->on('users')->onDelete($onDelete));
    }
};
