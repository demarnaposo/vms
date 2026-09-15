<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed roles
        Role::firstOrCreate(
            ['name' => 'vendor'],
            ['display_name' => 'Vendor', 'description' => 'Vendor Role']
        );
        Role::firstOrCreate(
            ['name' => 'super_admin'],
            ['display_name' => 'Super Admin', 'description' => 'Admin Role']
        );
    }

    public function test_users_can_register_as_vendor()
    {
        $response = $this->post('/register', [
            'name' => 'Test Vendor',
            'email' => 'vendor@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role' => 'vendor', // Changed from role_id to role string as per controller
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard'));
    }

    public function test_vendor_login_redirects_to_vendor_dashboard()
    {
        // Create a vendor user
        /** @var \App\Models\User $user */
        $user = User::factory()->create();
        $user->roles()->attach(Role::where('name', 'vendor')->first());

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard'));

        // Follow redirect to check final destination logic
        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertRedirect(route('vendor.dashboard'));
    }

    public function test_admin_login_redirects_to_admin_dashboard()
    {
        // Create an admin user
        /** @var \App\Models\User $user */
        $user = User::factory()->create();
        $user->roles()->attach(Role::where('name', 'super_admin')->first());

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticated();

        // Follow redirect logic
        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertRedirect(route('admin.dashboard'));
    }

    public function test_users_cannot_login_with_invalid_password()
    {
        $user = User::factory()->create();

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $this->assertGuest();
    }

    // Start Update 15 September 2026, by @WNP: Verify login failures follow the Indonesian locale cookie.
    public function test_invalid_login_feedback_is_localized_in_indonesian()
    {
        $user = User::factory()->create();

        $response = $this->withUnencryptedCookie('vms_locale', 'id')->post('/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $response->assertSessionHasErrors([
            'email' => 'Email atau kata sandi yang Anda masukkan tidak sesuai.',
        ]);
        $this->assertGuest();
    }

    // Start Update 15 September 2026, by @WNP: Verify registration validation uses Indonesian field labels.
    public function test_registration_validation_feedback_is_localized_in_indonesian()
    {
        $response = $this->withUnencryptedCookie('vms_locale', 'id')->post('/register', []);

        $response->assertSessionHasErrors([
            'name' => 'nama wajib diisi.',
            'email' => 'email wajib diisi.',
            'password' => 'kata sandi wajib diisi.',
        ]);
    }

    public function test_users_can_logout()
    {
        /** @var \App\Models\User $user */
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/logout');

        $this->assertGuest();
        $response->assertRedirect('/');
    }
}
