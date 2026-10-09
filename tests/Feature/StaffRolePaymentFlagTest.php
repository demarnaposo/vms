<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\RbacService;
use App\Services\SystemMasterDataService;
use App\Support\PaymentsModule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class StaffRolePaymentFlagTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        (new SystemMasterDataService)->syncRolesAndPermissions();
        $this->admin = User::factory()->create();
        $this->admin->assignRole(Role::SUPER_ADMIN);
        $this->actingAs($this->admin);
    }

    private function grants(Role $role): array
    {
        return $role->permissions()->orderBy('permissions.id')->pluck('permissions.id')->all();
    }

    private function data(Role $role, array $names): array
    {
        return ['name' => $role->name, 'display_name' => 'Updated Label', 'permission_ids' => Permission::whereIn('name', $names)->pluck('id')->all()];
    }

    public function test_catalogues_follow_flag_without_hiding_users_or_assignment_choices(): void
    {
        $custom = Role::create(['name' => 'payment_custom', 'display_name' => 'Payment Custom', 'guard_name' => 'web', 'is_staff' => true]);
        $custom->givePermissionTo('staff.payments.view', 'staff.vendors.view', 'payments.view');
        $user = User::factory()->create();
        $user->assignRole(Role::FINANCE_MANAGER);
        $before = $this->grants($custom);
        foreach ([false, true, false, true] as $enabled) {
            config(['features.payments.enabled' => $enabled]);
            $this->get('/admin/staff-users')->assertInertia(fn ($page) => $page
                ->where('features.payments.enabled', $enabled)
                ->where('staffRoles', function ($roles) use ($enabled, $custom) {
                    $roles = collect($roles);
                    $this->assertSame($enabled, $roles->contains('name', Role::FINANCE_MANAGER));
                    foreach ([Role::SUPER_ADMIN, Role::OPS_MANAGER, $custom->name] as $name) {
                        $this->assertTrue($roles->contains('name', $name));
                    }
                    $record = $roles->firstWhere('name', $custom->name);
                    $this->assertSame($enabled, in_array(Permission::findByName('staff.payments.view')->id, (array) $record['permission_ids']));
                    $this->assertSame($enabled, in_array('payments.view', (array) $record['legacy_permissions']));

                    return true;
                })
                ->where('permissions', function ($permissions) use ($enabled) {
                    $payments = collect($permissions)->filter(fn ($permission) => PaymentsModule::isPaymentPermission($permission['name'], $permission['group']));
                    $this->assertSame($enabled, $payments->isNotEmpty());

                    return true;
                })
                ->where('availableRoles', fn ($roles) => collect($roles)->contains('value', Role::FINANCE_MANAGER))
                ->where('staffUsers', fn ($users) => collect($users)->contains('id', $user->id)));
            $this->assertSame($before, $this->grants($custom));
            $this->assertTrue($user->fresh()->hasRole(Role::FINANCE_MANAGER));
        }
    }

    public function test_disabled_payment_requests_fail_atomically_in_both_languages(): void
    {
        config(['features.payments.enabled' => false]);
        $role = Role::create(['name' => 'mixed', 'display_name' => 'Original', 'guard_name' => 'web', 'is_staff' => true]);
        $role->givePermissionTo('staff.vendors.view', 'staff.payments.view');
        $before = $this->grants($role);
        $audits = AuditLog::count();
        foreach (['en', 'id'] as $locale) {
            foreach (['staff.payments.view', 'payments.view'] as $code) {
                $message = $locale === 'id' ? 'Izin pembayaran tidak dapat diubah saat modul pembayaran dinonaktifkan.' : 'Payment permissions cannot be changed while the payments module is disabled.';
                $data = $this->data($role, [$code, 'staff.documents.list']);
                $this->withUnencryptedCookie('vms_locale', $locale)->put('/admin/staff-roles/'.$role->id, $data)
                    ->assertSessionHasErrors(['permission_ids' => $message]);
                $this->assertSame('Original', $role->fresh()->display_name);
                $this->assertSame($before, $this->grants($role));
                $data['name'] = 'new_blocked_role';
                $this->post('/admin/staff-roles', $data)->assertSessionHasErrors('permission_ids');
                $this->assertDatabaseMissing('roles', ['name' => 'new_blocked_role']);
            }
        }
        $this->assertSame($audits, AuditLog::count());
    }

    public function test_hidden_grants_survive_edits_empty_selection_and_reactivation(): void
    {
        $roles = [Role::findByName(Role::OPS_MANAGER), Role::create(['name' => 'mixed_edit', 'display_name' => 'Mixed', 'guard_name' => 'web', 'is_staff' => true])];
        foreach ($roles as $role) {
            $role->givePermissionTo('staff.payments.view', 'payments.view', 'documents.view');
            $user = User::factory()->create();
            $user->assignRole($role);
            $hidden = $role->permissions()->get()->filter(fn ($p) => PaymentsModule::isPaymentPermission($p->name, $p->group) || ! array_key_exists($p->name, config('rbac.permissions')))->pluck('id')->sort()->values()->all();
            config(['features.payments.enabled' => false]);
            foreach ([['staff.documents.list'], []] as $selection) {
                $this->put('/admin/staff-roles/'.$role->id, $this->data($role, $selection))->assertSessionHasNoErrors();
                $expected = array_merge($hidden, Permission::whereIn('name', $selection)->pluck('id')->all());
                sort($expected);
                $this->assertSame($expected, $this->grants($role));
                $this->assertTrue($user->fresh()->hasRole($role->name));
            }
            config(['features.payments.enabled' => true]);
            $this->assertSame($hidden, $this->grants($role));
            $this->put('/admin/staff-roles/'.$role->id, $this->data($role, ['staff.payments.approve']))->assertSessionHasNoErrors();
            $this->assertTrue($role->fresh()->hasPermissionTo('staff.payments.approve'));
            $this->assertFalse($role->fresh()->hasPermissionTo('staff.payments.view'));
            $this->assertTrue($role->fresh()->hasPermissionTo('payments.view'));
        }
    }

    public function test_finance_management_is_hidden_but_existing_protection_returns_when_enabled(): void
    {
        $finance = Role::findByName(Role::FINANCE_MANAGER);
        $before = $this->grants($finance);
        config(['features.payments.enabled' => false]);
        $this->put('/admin/staff-roles/'.$finance->id, $this->data($finance, []))->assertNotFound();
        $this->delete('/admin/staff-roles/'.$finance->id)->assertNotFound();
        $this->assertSame($before, $this->grants($finance));
        config(['features.payments.enabled' => true]);
        $this->put('/admin/staff-roles/'.$finance->id, $this->data($finance, ['staff.payments.approve']))->assertSessionHasNoErrors();
        $this->delete('/admin/staff-roles/'.$finance->id)->assertSessionHasErrors('role');
    }

    public function test_service_rejects_direct_payment_grants_and_hidden_finance_changes(): void
    {
        config(['features.payments.enabled' => false]);
        $role = Role::findByName(Role::OPS_MANAGER);
        $before = $this->grants($role);
        foreach (['staff.payments.view', 'payments.view'] as $name) {
            try {
                app(RbacService::class)->saveRole($this->data($role, [$name]), $role);
                $this->fail('Disabled payment grant was accepted');
            } catch (ValidationException $exception) {
                $this->assertArrayHasKey('permission_ids', $exception->errors());
            }
            $this->assertSame($before, $this->grants($role));
        }
        $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);
        app(RbacService::class)->saveRole($this->data(Role::findByName(Role::FINANCE_MANAGER), []), Role::findByName(Role::FINANCE_MANAGER));
    }

    public function test_group_metadata_and_code_namespaces_identify_payment_permissions(): void
    {
        foreach (['staff.payments.view', 'payments.request'] as $name) {
            $this->assertTrue(PaymentsModule::isPaymentPermission($name, 'custom'));
        }
        $this->assertTrue(PaymentsModule::isPaymentPermission('custom.approve', 'payments'));
        $this->assertFalse(PaymentsModule::isPaymentPermission('staff.reports.view', 'reports'));
        $this->assertFalse(PaymentsModule::isPaymentPermission('custom.payment_notes', 'vendors'));
        config(['features.payments.enabled' => false]);
        $user = User::factory()->create();
        $user->assignRole(Role::OPS_MANAGER);
        $this->actingAs($user)->post('/admin/staff-roles', ['name' => 'forbidden', 'display_name' => 'Forbidden', 'permission_ids' => []])->assertForbidden();
    }
}
