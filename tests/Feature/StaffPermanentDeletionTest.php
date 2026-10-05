<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
use App\Models\Vendor;
use App\Services\SystemMasterDataService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class StaffPermanentDeletionTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $target;

    public function createApplication()
    {
        $app = parent::createApplication();
        if ($app->configurationIsCached() || config('database.default') !== 'sqlite'
            || config('database.connections.sqlite.database') !== ':memory:'
            || config('cache.default') !== 'array' || config('session.driver') !== 'array'
            || config('mail.default') !== 'array' || config('queue.default') !== 'sync') {
            throw new \RuntimeException('Permanent deletion tests require isolated uncached SQLite memory configuration.');
        }

        return $app;
    }

    protected function setUp(): void
    {
        parent::setUp();
        (new SystemMasterDataService)->syncRolesAndPermissions();
        $this->admin = User::factory()->create();
        $this->admin->assignRole(Role::SUPER_ADMIN);
        $this->target = User::factory()->create();
        $this->target->assignRole('ops_manager');
    }

    public function test_permanent_deletion_preserves_history_and_revokes_credentials(): void
    {
        $vendor = Vendor::factory()->create(['approved_by' => $this->target->id]);
        $auditId = DB::table('audit_logs')->insertGetId(['user_id' => $this->target->id, 'auditable_type' => User::class, 'auditable_id' => $this->target->id, 'event' => 'updated', 'reason' => 'Preserved history']);
        $logId = DB::table('vendor_state_logs')->insertGetId(['vendor_id' => $vendor->id, 'user_id' => $this->target->id, 'actioned_by_user_id' => $this->target->id, 'from_status' => 'draft', 'to_status' => 'submitted', 'comment' => 'Preserved transition']);
        $paymentId = DB::table('payment_requests')->insertGetId(['vendor_id' => $vendor->id, 'requested_by' => $this->target->id, 'reference_number' => 'TEST-STAFF-DELETE', 'amount' => 1000, 'description' => 'Preserved payment']);
        $approvalId = DB::table('payment_approvals')->insertGetId(['payment_request_id' => $paymentId, 'user_id' => $this->target->id, 'stage' => 'ops_validation', 'action' => 'approved']);
        $bondId = DB::table('vendor_bonds')->insertGetId(['vendor_id' => $vendor->id, 'total_amount' => 1000, 'current_balance' => 900]);
        $deductionId = DB::table('bond_deductions')->insertGetId(['vendor_bond_id' => $bondId, 'admin_id' => $this->target->id, 'amount_deducted' => 100, 'reason' => 'Preserved deduction']);
        $typeId = DB::table('document_types')->insertGetId(['name' => 'test_staff_delete', 'display_name' => 'Test document']);
        $documentId = DB::table('vendor_documents')->insertGetId(['vendor_id' => $vendor->id, 'document_type_id' => $typeId, 'file_name' => 'test.pdf', 'file_path' => 'test.pdf', 'file_hash' => 'test-only-hash', 'file_size' => 100, 'mime_type' => 'application/pdf', 'verified_by' => $this->target->id]);
        $versionId = DB::table('document_versions')->insertGetId(['vendor_document_id' => $documentId, 'version' => 1, 'file_path' => 'test.pdf', 'file_hash' => 'test-only-hash', 'uploaded_by' => $this->target->id]);
        $metricId = DB::table('performance_metrics')->insertGetId(['name' => 'test_staff_delete', 'display_name' => 'Test metric']);
        $scoreId = DB::table('performance_scores')->insertGetId(['vendor_id' => $vendor->id, 'performance_metric_id' => $metricId, 'scored_by' => $this->target->id, 'score' => 90, 'period_start' => '2026-10-01', 'period_end' => '2026-10-05']);
        $ruleId = DB::table('compliance_rules')->insertGetId(['name' => 'test_staff_delete', 'description' => 'Test rule', 'type' => 'custom', 'conditions' => '{}']);
        $resultId = DB::table('compliance_results')->insertGetId(['vendor_id' => $vendor->id, 'compliance_rule_id' => $ruleId, 'evaluated_at' => now(), 'resolved_by' => $this->target->id]);
        DB::table('sessions')->insert(['id' => 'staff-test-session', 'user_id' => $this->target->id, 'payload' => '', 'last_activity' => time()]);
        DB::table('password_reset_tokens')->insert(['email' => $this->target->email, 'token' => 'test-only-token']);
        DB::table('notifications')->insert(['id' => '00000000-0000-0000-0000-000000000001', 'type' => 'test', 'notifiable_type' => User::class, 'notifiable_id' => $this->target->id, 'data' => '{}']);
        $this->actingAs($this->admin)->delete('/admin/staff-users/'.$this->target->id)->assertSessionHasNoErrors()->assertSessionHas('success', __('alerts.rbac_user_deleted'));
        $this->assertDatabaseMissing('users', ['id' => $this->target->id]);
        $this->assertDatabaseMissing('role_user', ['user_id' => $this->target->id, 'model_type' => User::class]);
        $this->assertDatabaseMissing('sessions', ['user_id' => $this->target->id]);
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $this->target->email]);
        $this->assertDatabaseHas('notifications', ['notifiable_id' => $this->target->id]);
        $this->assertDatabaseHas('vendors', ['id' => $vendor->id, 'approved_by' => null]);
        $this->assertDatabaseHas('audit_logs', ['id' => $auditId, 'user_id' => null, 'reason' => 'Preserved history']);
        $this->assertDatabaseHas('vendor_state_logs', ['id' => $logId, 'user_id' => null, 'actioned_by_user_id' => null, 'comment' => 'Preserved transition']);
        $this->assertDatabaseHas('payment_requests', ['id' => $paymentId, 'requested_by' => null, 'amount' => 1000]);
        $this->assertDatabaseHas('payment_approvals', ['id' => $approvalId, 'user_id' => null, 'action' => 'approved']);
        $this->assertDatabaseHas('bond_deductions', ['id' => $deductionId, 'admin_id' => null, 'amount_deducted' => 100]);
        $this->assertDatabaseHas('vendor_documents', ['id' => $documentId, 'verified_by' => null, 'file_path' => 'test.pdf']);
        $this->assertDatabaseHas('document_versions', ['id' => $versionId, 'uploaded_by' => null, 'version' => 1]);
        $this->assertDatabaseHas('performance_scores', ['id' => $scoreId, 'scored_by' => null, 'score' => 90]);
        $this->assertDatabaseHas('compliance_results', ['id' => $resultId, 'resolved_by' => null]);
        $deleted = AuditLog::where('auditable_type', User::class)->where('auditable_id', $this->target->id)->where('event', AuditLog::EVENT_DELETED)->firstOrFail();
        $this->assertSame($this->target->name, $deleted->old_values['name']);
        $this->assertArrayNotHasKey('password', $deleted->old_values);
    }

    public function test_history_reference_migration_and_rollback_are_data_preserving(): void
    {
        $migration = require database_path('migrations/2026_10_05_000000_preserve_history_when_deleting_staff_users.php');
        $migration->down();
        $auditId = DB::table('audit_logs')->insertGetId(['user_id' => $this->target->id, 'auditable_type' => User::class, 'auditable_id' => $this->target->id, 'event' => 'updated']);
        $this->actingAs($this->admin)->delete('/admin/staff-users/'.$this->target->id)->assertSessionHasErrors('user');
        $this->assertDatabaseHas('users', ['id' => $this->target->id]);
        $migration->up();
        $this->assertDatabaseHas('audit_logs', ['id' => $auditId, 'user_id' => $this->target->id]);
        foreach ([['document_versions', 'uploaded_by'], ['performance_scores', 'scored_by'], ['compliance_results', 'resolved_by']] as [$table, $column]) {
            $foreign = collect(Schema::getForeignKeys($table))->firstWhere('columns', [$column]);
            $this->assertSame('set null', strtolower($foreign['on_delete']));
            $this->assertTrue(collect(Schema::getColumns($table))->firstWhere('name', $column)['nullable']);
        }
    }

    public function test_last_admin_and_vendor_owners_remain_protected(): void
    {
        $this->actingAs($this->admin)->delete('/admin/staff-users/'.$this->admin->id)->assertSessionHasErrors('user');
        Vendor::factory()->create(['user_id' => $this->target->id]);
        $this->delete('/admin/staff-users/'.$this->target->id)->assertSessionHasErrors('user');
        $this->assertDatabaseHas('users', ['id' => $this->target->id]);
        $this->assertDatabaseHas('users', ['id' => $this->admin->id]);
    }

    public function test_rollback_refuses_to_invent_deleted_actor_ids(): void
    {
        $vendor = Vendor::factory()->create();
        $logId = DB::table('vendor_state_logs')->insertGetId(['vendor_id' => $vendor->id, 'user_id' => $this->target->id, 'from_status' => 'draft', 'to_status' => 'submitted']);
        $this->actingAs($this->admin)->delete('/admin/staff-users/'.$this->target->id)->assertSessionHasNoErrors();
        $migration = require database_path('migrations/2026_10_05_000000_preserve_history_when_deleting_staff_users.php');
        try {
            $migration->down();
            $this->fail('Rollback must refuse to fabricate deleted actors.');
        } catch (\RuntimeException $exception) {
            $this->assertStringContainsString('Cannot roll back', $exception->getMessage());
        }
        $this->assertDatabaseHas('vendor_state_logs', ['id' => $logId, 'user_id' => null]);
        $foreign = collect(Schema::getForeignKeys('vendor_state_logs'))->firstWhere('columns', ['user_id']);
        $this->assertSame('set null', strtolower($foreign['on_delete']));
    }

    public function test_non_admin_cannot_delete_staff(): void
    {
        $this->actingAs($this->target)->delete('/admin/staff-users/'.$this->admin->id)->assertForbidden();
        $this->assertDatabaseHas('users', ['id' => $this->admin->id]);
    }
}
