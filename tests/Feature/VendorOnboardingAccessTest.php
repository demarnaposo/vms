<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VendorOnboardingAccessTest extends TestCase
{
    use RefreshDatabase;

    private function endpoints(): array
    {
        return [
            ['GET', '/vendor/onboarding'],
            ['GET', '/vendor/onboarding/document/1'],
            ['POST', '/vendor/onboarding/step1'],
            ['POST', '/vendor/onboarding/step2'],
            ['POST', '/vendor/onboarding/step3'],
            ['POST', '/vendor/onboarding/submit'],
        ];
    }

    public function test_non_vendor_roles_cannot_access_any_onboarding_endpoint_or_create_drafts(): void
    {
        foreach ([Role::SUPER_ADMIN, Role::OPS_MANAGER, Role::FINANCE_MANAGER, 'custom_staff', null] as $roleName) {
            $user = User::factory()->create();
            if ($roleName !== null) {
                $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web'], ['display_name' => $roleName]);
                $user->assignRole($role);
            }

            $this->actingAs($user);
            foreach ($this->endpoints() as [$method, $url]) {
                $this->call($method, $url)->assertForbidden();
            }

            $this->assertDatabaseMissing('vendor_applications', ['user_id' => $user->id]);
            $this->assertDatabaseMissing('vendors', ['user_id' => $user->id]);
        }
    }

    public function test_guest_requests_require_login_for_every_onboarding_endpoint(): void
    {
        foreach ($this->endpoints() as [$method, $url]) {
            $this->call($method, $url)->assertRedirect(route('login'));
        }

        $this->assertDatabaseCount('vendor_applications', 0);
    }

    public function test_verified_vendor_can_open_onboarding_and_reach_step_validation(): void
    {
        $role = Role::firstOrCreate(['name' => Role::VENDOR, 'guard_name' => 'web'], ['display_name' => 'Vendor']);
        $user = User::factory()->create();
        $user->assignRole($role);
        $this->actingAs($user);

        $this->get('/vendor/onboarding')->assertOk();
        $this->assertDatabaseHas('vendor_applications', ['user_id' => $user->id, 'status' => 'draft']);
        $this->post('/vendor/onboarding/step1')->assertSessionHasErrors('company_name');
        $this->post('/vendor/onboarding/step2')->assertSessionHasErrors('bank_name');
        $this->post('/vendor/onboarding/step3')->assertSessionHasErrors('step');
        $this->post('/vendor/onboarding/submit')->assertSessionHasErrors('step');
        $this->get('/vendor/onboarding/document/1')->assertNotFound();
    }

    public function test_super_admin_access_to_staff_dashboard_is_preserved(): void
    {
        $role = Role::firstOrCreate(['name' => Role::SUPER_ADMIN, 'guard_name' => 'web'], ['display_name' => 'Super Admin']);
        $user = User::factory()->create();
        $user->assignRole($role);

        $this->actingAs($user)->get('/admin/dashboard')->assertOk();
    }
}
