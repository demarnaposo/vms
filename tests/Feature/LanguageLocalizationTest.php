<?php

namespace Tests\Feature;

use Tests\TestCase;

// Start Update 11 September 2026, by @WNP: Verify the supported language list and server-side Indonesian validation locale.
class LanguageLocalizationTest extends TestCase
{
    public function test_application_supports_english_and_indonesian(): void
    {
        $this->assertSame(['en', 'id'], config('app.supported_locales'));
        $this->assertSame('en', config('app.locale'));
    }

    public function test_indonesian_cookie_localizes_backend_validation_messages(): void
    {
        $response = $this
            // Start Update 14 September 2026, by @WNP: Send the renamed plain locale cookie produced by the browser switcher.
            ->withUnencryptedCookie('vms_locale', 'id')
            ->from('/register')
            ->post('/register', []);

        $response->assertRedirect('/register');
        $response->assertSessionHasErrors(['name', 'email', 'password']);
        $this->assertSame('nama wajib diisi.', session('errors')->get('name')[0]);
        $this->assertSame('kata sandi wajib diisi.', session('errors')->get('password')[0]);
    }

    public function test_unsupported_language_cookie_falls_back_to_english(): void
    {
        $response = $this
            // Start Update 14 September 2026, by @WNP: Verify unsupported values in the renamed cookie still fall back to English.
            ->withUnencryptedCookie('vms_locale', 'xx')
            ->from('/register')
            ->post('/register', []);

        $response->assertRedirect('/register');
        $this->assertSame('The name field is required.', session('errors')->get('name')[0]);
    }
}
