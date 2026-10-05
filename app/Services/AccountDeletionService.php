<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class AccountDeletionService
{
    public function assertStaffDeletionReady(User $user): void
    {
        // Staff deletion must not cascade into vendor-owned business records.
        foreach (['vendors', 'vendor_applications'] as $table) {
            if (DB::table($table)->where('user_id', $user->id)->exists()) {
                throw ValidationException::withMessages(['user' => __('alerts.staff_deletion_vendor_owner')]);
            }
        }
        foreach ([
            ['vendors', 'approved_by'], ['vendor_state_logs', 'user_id'],
            ['payment_requests', 'requested_by'], ['payment_approvals', 'user_id'],
            ['audit_logs', 'user_id'], ['vendor_documents', 'verified_by'],
            ['document_versions', 'uploaded_by'], ['performance_scores', 'scored_by'],
            ['compliance_results', 'resolved_by'], ['bond_deductions', 'admin_id'],
        ] as [$table, $column]) {
            $safe = collect(Schema::getForeignKeys($table))->contains(fn ($foreign) => $foreign['columns'] === [$column] && $foreign['foreign_table'] === 'users'
                && strtolower($foreign['on_delete']) === 'set null'
            );
            $nullable = collect(Schema::getColumns($table))->firstWhere('name', $column)['nullable'];
            if (! $safe || ! $nullable) {
                throw ValidationException::withMessages(['user' => __('alerts.staff_deletion_schema_required')]);
            }
        }
    }

    public function revokeStaffCredentials(User $user): void
    {
        DB::table('sessions')->where('user_id', $user->id)->delete();
        DB::table('password_reset_tokens')->where('email', $user->email)->delete();
        if (Schema::hasTable('personal_access_tokens')) {
            DB::table('personal_access_tokens')->where('tokenable_type', $user->getMorphClass())->where('tokenable_id', $user->id)->delete();
        }
    }

    public function assertNoHistory(User $user, string $field = 'user'): void
    {
        foreach ([
            ['vendors', 'user_id'], ['vendors', 'approved_by'], ['vendor_applications', 'user_id'],
            ['vendor_state_logs', 'user_id'], ['vendor_state_logs', 'actioned_by_user_id'],
            ['payment_requests', 'requested_by'], ['payment_approvals', 'user_id'], ['payment_logs', 'user_id'],
            ['audit_logs', 'user_id'], ['vendor_documents', 'verified_by'], ['document_versions', 'uploaded_by'],
            ['performance_scores', 'scored_by'], ['score_history', 'user_id'], ['compliance_flags', 'resolved_by'], ['bond_deductions', 'admin_id'],
        ] as [$table, $column]) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, $column) && DB::table($table)->where($column, $user->id)->exists()) {
                throw ValidationException::withMessages([$field => __('alerts.account_deletion_has_history')]);
            }
        }
        if (DB::table('audit_logs')->where('auditable_type', $user->getMorphClass())->where('auditable_id', $user->id)->exists()
            || DB::table('notifications')->where('notifiable_type', $user->getMorphClass())->where('notifiable_id', $user->id)->exists()) {
            throw ValidationException::withMessages([$field => __('alerts.account_deletion_has_history')]);
        }
    }
}
