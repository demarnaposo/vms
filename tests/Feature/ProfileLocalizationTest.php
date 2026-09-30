<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileLocalizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_with_vendor_history_cannot_be_deleted_and_session_stays_active(): void
    {
        $user = User::factory()->create();
        $vendor = Vendor::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)->delete('/profile', ['password' => 'password'])
            ->assertRedirect()
            ->assertSessionHasErrors('password');

        $this->assertAuthenticatedAs($user);
        $this->assertDatabaseHas('users', ['id' => $user->id]);
        $this->assertDatabaseHas('vendors', ['id' => $vendor->id]);
    }

    public function test_wrong_password_does_not_delete_account(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->delete('/profile', ['password' => 'incorrect'])
            ->assertSessionHasErrors('password');

        $this->assertAuthenticatedAs($user);
        $this->assertDatabaseHas('users', ['id' => $user->id]);
    }

    public function test_account_without_history_can_still_be_deleted(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->delete('/profile', ['password' => 'password'])
            ->assertRedirect('/');

        $this->assertGuest();
        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }

    // Verify an invalid current password uses Indonesian feedback.
    public function test_current_password_validation_is_localized_in_indonesian(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->withUnencryptedCookie('vms_locale', 'id')
            ->post('/profile/password', [
                'current_password' => 'wrong-password',
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ]);

        $response->assertSessionHasErrors([
            'current_password' => 'Kata sandi saat ini tidak sesuai.',
        ]);
    }

    // Verify profile validation uses Indonesian field names.
    public function test_profile_field_validation_is_localized_in_indonesian(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->withUnencryptedCookie('vms_locale', 'id')
            ->patch('/profile', [
                'name' => '',
                'email' => '',
                'phone' => str_repeat('8', 21),
            ]);

        $response->assertSessionHasErrors([
            'name' => 'nama wajib diisi.',
            'email' => 'email wajib diisi.',
            'phone' => 'nomor telepon / ponsel tidak boleh lebih dari 20 karakter.',
        ]);
    }
}
