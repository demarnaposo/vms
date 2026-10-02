<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\SystemMasterDataService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;
use Tests\TestCase;

class RbacManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        (new SystemMasterDataService)->syncRolesAndPermissions();
        $this->admin = User::factory()->create();
        $this->admin->assignRole('super_admin');
    }

    private function permission(string $code): int
    {
        return Permission::where('name', 'staff.'.$code)->value('id');
    }

    public function test_staff_validation_uses_selected_language_without_creating_records(): void
    {
        foreach (['id' => 'Pilihan izin wajib dikirim, meskipun kosong.', 'en' => 'The permission selection must be provided, even when empty.'] as $locale => $message) {
            $this->actingAs($this->admin)->withUnencryptedCookie('vms_locale', $locale)
                ->post('/admin/staff-roles', ['name' => 'reviewer_translation', 'display_name' => 'Custom Label'])
                ->assertSessionHasErrors(['permission_ids' => $message]);
            $this->assertDatabaseMissing('roles', ['name' => 'reviewer_translation']);

            $this->post('/admin/staff-users', ['name' => 'Fixture', 'email' => 'fixture@example.com', 'password' => 'password', 'password_confirmation' => 'password', 'role_ids' => [999999]])
                ->assertSessionHasErrors(['role_ids.0' => $locale === 'id' ? 'peran staff yang dipilih tidak valid.' : 'The selected staff role is invalid.']);
            $this->assertDatabaseMissing('users', ['email' => 'fixture@example.com']);
        }
    }

    public function test_morph_repair_restores_super_admin_dashboard_access(): void
    {
        \Illuminate\Support\Facades\DB::table('role_user')->where('user_id', $this->admin->id)->update(['model_type' => 'AppModelsUser']);
        $this->actingAs($this->admin->fresh())->get('/admin/dashboard')->assertForbidden();

        (require database_path('migrations/2026_09_30_000001_repair_rbac_user_morph_type.php'))->up();

        $this->actingAs($this->admin->fresh())->get('/admin/dashboard')->assertOk();
        $this->get('/dashboard')->assertRedirect(route('admin.dashboard'));
    }

    private function custom(array $permissions = [], string $name = 'reviewer'): Role
    {
        $role = Role::create(['name' => $name, 'display_name' => 'Pemeriksa Khusus', 'guard_name' => 'web', 'is_staff' => true]);
        $role->syncPermissions(array_map(fn ($code) => 'staff.'.$code, $permissions));

        return $role;
    }

    public function test_custom_role_has_only_its_selected_endpoint_and_redirect(): void
    {
        $user = User::factory()->create();
        $user->assignRole($this->custom(['vendors.view']));
        $this->actingAs($user)->get('/admin/vendors')->assertOk();
        $this->get('/admin/payments')->assertForbidden();
        $this->get('/admin/documents')->assertForbidden();
        $this->get('/dashboard')->assertRedirect(route('admin.vendors.index'));
        $this->get('/admin/vendors')->assertInertia(fn ($page) => $page->where('auth.can.is_staff', true)->where('auth.can', fn ($can) => $can['vendors.view'] === true && $can['payments.view'] === false));
    }

    public function test_role_and_staff_crud_and_multi_role_assignment(): void
    {
        $this->actingAs($this->admin)->post('/admin/staff-roles', ['name' => 'reviewer', 'display_name' => 'Nama Custom Tetap', 'description' => 'Manual', 'permission_ids' => [$this->permission('vendors.view')]])->assertSessionHasNoErrors();
        $role = Role::where('name', 'reviewer')->firstOrFail();
        $this->assertTrue($role->is_staff);
        $this->post('/admin/staff-users', ['name' => 'Rina', 'email' => 'rina@example.com', 'password' => 'Password123!', 'password_confirmation' => 'Password123!', 'role_ids' => [$role->id, Role::where('name', 'finance_manager')->value('id')]])->assertSessionHasNoErrors();
        $user = User::where('email', 'rina@example.com')->firstOrFail();
        $this->get('/admin/staff-users/'.$user->id)->assertOk();
        $this->assertCount(2, $user->roles);
        $this->put('/admin/staff-users/'.$user->id, ['name' => 'Rina Updated', 'email' => 'rina.updated@example.com', 'role_ids' => [$role->id]])->assertSessionHasNoErrors();
        $this->assertEquals('Rina Updated', $user->fresh()->name);
        $this->put('/admin/staff-roles/'.$role->id, ['name' => 'reviewer', 'display_name' => 'Label Baru', 'permission_ids' => [$this->permission('documents.list')]])->assertSessionHasNoErrors();
        $this->assertEquals('Label Baru', $role->fresh()->display_name);
        $this->delete('/admin/staff-roles/'.$role->id)->assertSessionHasErrors('role');
        $this->delete('/admin/staff-users/'.$user->id)->assertSessionHasErrors('user');
        $unused = $this->custom([], 'unused');
        $this->delete('/admin/staff-roles/'.$unused->id)->assertSessionHasNoErrors();
        $this->assertDatabaseMissing('roles', ['id' => $unused->id]);
        $this->assertDatabaseHas('audit_logs', ['auditable_type' => Role::class, 'auditable_id' => $unused->id, 'event' => AuditLog::EVENT_DELETED]);
    }

    public function test_history_free_staff_can_be_deleted_without_losing_audit_trail(): void
    {
        $target = User::factory()->create();
        $target->assignRole($this->custom());
        $this->actingAs($this->admin)->delete('/admin/staff-users/'.$target->id)->assertSessionHasNoErrors();
        $this->assertDatabaseMissing('users', ['id' => $target->id]);
        $this->assertDatabaseMissing('role_user', ['user_id' => $target->id]);
        $this->assertDatabaseHas('audit_logs', ['auditable_id' => $target->id, 'auditable_type' => User::class, 'event' => AuditLog::EVENT_DELETED]);
    }

    public function test_last_admin_is_protected_in_assignment_staff_delete_and_profile_delete(): void
    {
        $opsId = Role::where('name', 'ops_manager')->value('id');
        $this->actingAs($this->admin)->put('/admin/staff-users/'.$this->admin->id, ['name' => $this->admin->name, 'email' => $this->admin->email, 'role_ids' => [$opsId]])->assertSessionHasErrors('role_ids');
        $this->delete('/admin/staff-users/'.$this->admin->id)->assertSessionHasErrors('user');
        $this->delete('/profile', ['password' => 'password'])->assertSessionHasErrors('password');
        $this->assertTrue($this->admin->fresh()->isSuperAdmin());
        $this->assertDatabaseHas('users', ['id' => $this->admin->id]);
    }

    public function test_two_admin_changes_cannot_sequentially_remove_the_last_admin(): void
    {
        $other = User::factory()->create();
        $other->assignRole('super_admin');
        $opsId = Role::where('name', 'ops_manager')->value('id');
        $this->actingAs($this->admin)->put('/admin/staff-users/'.$other->id, ['name' => $other->name, 'email' => $other->email, 'role_ids' => [$opsId]])->assertSessionHasNoErrors();
        $this->put('/admin/staff-users/'.$this->admin->id, ['name' => $this->admin->name, 'email' => $this->admin->email, 'role_ids' => [$opsId]])->assertSessionHasErrors('role_ids');
        $this->assertEquals(1, User::role('super_admin')->count());
    }

    public function test_role_rename_built_in_delete_and_guard_forgery_are_rejected(): void
    {
        $role = $this->custom();
        $this->actingAs($this->admin)->put('/admin/staff-roles/'.$role->id, ['name' => 'renamed', 'display_name' => 'New', 'permission_ids' => []])->assertSessionHasErrors('name');
        $this->delete('/admin/staff-roles/'.Role::where('name', 'ops_manager')->value('id'))->assertSessionHasErrors('role');
        $this->post('/admin/staff-roles', ['name' => 'new_role', 'display_name' => 'New', 'guard_name' => 'api', 'permission_ids' => []])->assertSessionHasErrors('guard_name');
        $this->post('/admin/staff-roles', ['name' => 'super_admin', 'display_name' => 'New', 'permission_ids' => []])->assertSessionHasErrors('name');
    }

    public function test_vendor_foreign_guard_and_invalid_ids_cannot_be_assigned_to_staff(): void
    {
        $apiRole = Role::create(['name' => 'api_test', 'display_name' => 'API', 'guard_name' => 'api', 'is_staff' => true]);
        $this->actingAs($this->admin);
        foreach ([Role::where('name', 'vendor')->value('id'), $apiRole->id, 999999] as $id) {
            $this->post('/admin/staff-users', ['name' => 'Invalid', 'email' => 'invalid@example.com', 'password' => 'Password123!', 'password_confirmation' => 'Password123!', 'role_ids' => [$id]])->assertSessionHasErrors('role_ids.0');
        }
        $this->assertDatabaseMissing('users', ['email' => 'invalid@example.com']);
    }

    public function test_custom_role_and_vendor_cannot_escalate_via_direct_management_requests(): void
    {
        foreach ([$this->custom(['vendors.view']), Role::where('name', 'vendor')->first()] as $role) {
            $user = User::factory()->create();
            $user->assignRole($role);
            $this->actingAs($user)->get('/admin/staff-users')->assertForbidden();
            $this->post('/admin/staff-roles', ['name' => 'escalated', 'display_name' => 'Escalated', 'permission_ids' => []])->assertForbidden();
            $this->put('/admin/staff-users/'.$this->admin->id, [])->assertForbidden();
            $this->delete('/admin/staff-users/'.$this->admin->id)->assertForbidden();
        }
    }

    public function test_legacy_permissions_stay_preserved_and_do_not_activate_finance_admin_access(): void
    {
        $finance = Role::where('name', 'finance_manager')->first();
        $finance->givePermissionTo('documents.view', 'compliance.view');
        $user = User::factory()->create();
        $user->assignRole($finance);
        $this->actingAs($user)->get('/admin/documents')->assertForbidden();
        $this->get('/admin/compliance')->assertForbidden();
        $this->assertTrue($user->staffCan('documents.view'));
        $this->assertTrue($finance->hasPermissionTo('compliance.view'));
        $this->actingAs($this->admin)->put('/admin/staff-roles/'.$finance->id, ['name' => 'finance_manager', 'display_name' => 'Finance Custom Label', 'permission_ids' => []])->assertSessionHasNoErrors();
        $this->assertTrue($finance->fresh()->hasPermissionTo('compliance.view'));
        $this->post('/admin/staff-roles', ['name' => 'invalid_permission', 'display_name' => 'Invalid', 'permission_ids' => [Permission::where('name', 'compliance.view')->value('id')]])->assertSessionHasErrors('permission_ids.0');
    }

    public function test_revocation_updates_all_role_users_on_their_next_request_even_with_old_cache(): void
    {
        $role = $this->custom(['vendors.view']);
        $users = User::factory()->count(2)->create();
        foreach ($users as $user) {
            $user->assignRole($role);
            Cache::put("user_{$user->id}_auth_data_v2", ['can' => ['vendors.view' => true]], 300);
            $this->actingAs($user)->get('/admin/vendors')->assertOk();
        }
        $this->actingAs($this->admin)->put('/admin/staff-roles/'.$role->id, ['name' => $role->name, 'display_name' => $role->display_name, 'permission_ids' => []])->assertSessionHasNoErrors();
        foreach ($users as $user) {
            $this->actingAs($user)->get('/admin/vendors')->assertForbidden();
            $this->get('/notifications')->assertInertia(fn ($page) => $page->where('auth.can', fn ($can) => $can['vendors.view'] === false));
        }
    }

    public function test_bootstrap_does_not_restore_admin_revoked_permissions_or_labels(): void
    {
        $role = Role::where('name', 'ops_manager')->first();
        $role->syncPermissions([]);
        $role->update(['display_name' => 'Manual Label']);
        $custom = $this->custom(['vendors.view']);
        (new SystemMasterDataService)->syncRolesAndPermissions();
        $this->assertEquals('Manual Label', $role->fresh()->display_name);
        $this->assertCount(0, $role->fresh()->permissions);
        $this->assertTrue($custom->fresh()->hasPermissionTo('staff.vendors.view'));
    }

    public function test_no_role_user_is_not_staff_and_multi_role_permissions_are_unioned(): void
    {
        $user = User::factory()->create();
        $this->assertFalse($user->isStaff());
        $this->assertNull($user->getPrimaryRole());
        $this->assertSame('No Role', $user->getRoleDisplayName());
        $this->actingAs($user)->get('/dashboard')->assertForbidden();
        $primaryRole = $this->custom(['vendors.view'], 'vendors_reader');
        $secondaryRole = $this->custom(['payments.view'], 'payments_reader');
        $user->assignRole($secondaryRole, $primaryRole);
        $this->assertTrue($user->isStaff());
        $this->assertTrue($user->getPrimaryRole()->is($primaryRole));
        $this->assertSame($primaryRole->display_name, $user->getRoleDisplayName());
        $this->get('/admin/vendors')->assertOk();
        $this->get('/admin/payments')->assertOk();
        $this->get('/admin/documents')->assertForbidden();
        $this->assertFalse(Gate::forUser($user)->allows('manageComplianceRules'));
    }

    public function test_dashboard_with_only_a_view_permission_does_not_expose_other_modules(): void
    {
        $user = User::factory()->create();
        $user->assignRole($this->custom(['dashboard.view', 'vendors.view']));
        $this->actingAs($user)->get('/admin/dashboard')->assertInertia(fn ($page) => $page
            ->has('stats.total_vendors')->missing('stats.pending_payments')->has('pendingDocuments', 0)
            ->has('pendingPayments', 0)->has('recentActivity', 0));
    }

    public function test_permission_does_not_bypass_vendor_transition_status_or_vendor_ownership(): void
    {
        $reviewer = User::factory()->create();
        $reviewer->assignRole($this->custom(['vendors.approve']));
        $owner = User::factory()->create();
        $owner->assignRole('vendor');
        $vendor = \App\Models\Vendor::factory()->create(['user_id' => $owner->id, 'status' => 'draft']);
        $this->actingAs($reviewer)->post('/admin/vendors/'.$vendor->id.'/approve')->assertSessionHasErrors('status');
        $this->assertEquals('draft', $vendor->fresh()->status);
        $attacker = User::factory()->create();
        $attacker->assignRole('vendor');
        $this->assertFalse(Gate::forUser($attacker)->allows('view', $vendor));
        $this->assertTrue(Gate::forUser($owner)->allows('view', $vendor));
    }

    public function test_direct_permission_without_staff_scope_cannot_open_admin_routes(): void
    {
        foreach ([false, true] as $vendorAccount) {
            $user = User::factory()->create();
            if ($vendorAccount) {
                $user->assignRole('vendor');
            }
            $user->givePermissionTo('staff.vendors.view');
            $this->actingAs($user)->get('/admin/vendors')->assertForbidden();
            $this->assertFalse($user->isStaff());
        }
    }
}
