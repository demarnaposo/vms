<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileLocalizationTest extends TestCase
{
    use RefreshDatabase;

    // Start Update 15 September 2026, by @WNP: Verify an invalid current password uses Indonesian feedback.
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

    // Start Update 15 September 2026, by @WNP: Verify profile validation uses Indonesian field names.
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
