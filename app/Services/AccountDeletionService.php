<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class AccountDeletionService
{
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
