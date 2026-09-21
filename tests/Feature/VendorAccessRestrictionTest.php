<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Models\Vendor;
use App\Services\VendorLifecycleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class VendorAccessRestrictionTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $vendorUser;

    private Vendor $vendor;

    protected function setUp(): void
    {
        parent::setUp();

        $vendorRole = Role::firstOrCreate(['name' => Role::VENDOR], ['display_name' => 'Vendor']);
        $adminRole = Role::firstOrCreate(['name' => Role::SUPER_ADMIN], ['display_name' => 'Super Admin']);

        $this->admin = User::factory()->create();
        $this->admin->roles()->attach($adminRole);

        $this->vendorUser = User::factory()->create(['is_active' => true]);
        $this->vendorUser->roles()->attach($vendorRole);

        $this->vendor = Vendor::factory()->create([
            'user_id' => $this->vendorUser->id,
            'status' => Vendor::STATUS_ACTIVE,
        ]);
    }

    public function test_active_vendor_can_log_in_and_access_vendor_routes(): void
    {
        $this->post(route('login'), [
            'email' => $this->vendorUser->email,
            'password' => 'password',
        ])->assertRedirect(route('dashboard'));

        $this->assertAuthenticatedAs($this->vendorUser);
        $this->get(route('vendor.dashboard'))->assertOk();
    }

    public function test_suspended_vendor_cannot_log_in_or_keep_an_existing_session(): void
    {
        $originalRememberToken = $this->vendorUser->remember_token;
        $this->actingAs($this->vendorUser);

        app(VendorLifecycleService::class)->suspend($this->vendor, $this->admin, 'Access review');

        $this->vendorUser->refresh();
        $this->assertFalse($this->vendorUser->is_active);
        $this->assertNotSame($originalRememberToken, $this->vendorUser->remember_token);

        $this->get(route('vendor.dashboard'))
            ->assertRedirect(route('login'))
            ->assertSessionHasErrors('email');
        $this->assertGuest();

        $this->post(route('login'), [
            'email' => $this->vendorUser->email,
            'password' => 'password',
        ])->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_terminated_vendor_cannot_log_in_or_keep_an_existing_session(): void
    {
        $this->actingAs($this->vendorUser);

        app(VendorLifecycleService::class)->terminate($this->vendor, $this->admin, 'Contract ended');

        $this->assertFalse($this->vendorUser->fresh()->is_active);
        $this->get(route('vendor.profile'))
            ->assertRedirect(route('login'))
            ->assertSessionHasErrors('email');
        $this->assertGuest();

        $this->post(route('login'), [
            'email' => $this->vendorUser->email,
            'password' => 'password',
        ])->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_database_sessions_are_revoked_when_vendor_access_is_blocked(): void
    {
        config()->set('session.driver', 'database');

        DB::table('sessions')->insert([
            'id' => 'vendor-session',
            'user_id' => $this->vendorUser->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'test',
            'payload' => '',
            'last_activity' => now()->timestamp,
        ]);

        app(VendorLifecycleService::class)->suspend($this->vendor, $this->admin, 'Access review');

        $this->assertDatabaseMissing('sessions', ['id' => 'vendor-session']);
    }

    public function test_reactivation_enables_the_account_without_restoring_old_sessions(): void
    {
        config()->set('session.driver', 'database');

        app(VendorLifecycleService::class)->terminate($this->vendor, $this->admin, 'Contract ended');
        app(VendorLifecycleService::class)->reactivate($this->vendor->fresh(), $this->admin, 'Appeal accepted');

        $this->assertTrue($this->vendorUser->fresh()->is_active);
        $this->assertSame(Vendor::STATUS_UNDER_REVIEW, $this->vendor->fresh()->status);
        $this->assertDatabaseCount('sessions', 0);
    }
}
