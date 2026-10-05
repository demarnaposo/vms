<?php

namespace Tests\Feature;

use Tests\TestCase;

class DefaultLanguageTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // Exercise the Indonesian deployment default separately from PHPUnit's English override.
        config(['app.locale' => 'id']);
        app()->setLocale('id');
    }

    public function test_new_visitors_receive_indonesian_html_on_landing_and_login(): void
    {
        foreach (['/', '/login'] as $url) {
            $this->get($url)->assertOk()->assertSee('<html lang="id">', false);
        }
        $this->assertSame('en', config('app.fallback_locale'));
    }

    public function test_invalid_cookie_uses_indonesian_validation(): void
    {
        $this->withUnencryptedCookie('vms_locale', 'xx')
            ->from('/register')->post('/register', [])->assertRedirect('/register')
            ->assertSessionHasErrors(['name', 'email', 'password']);
        $this->assertSame('nama wajib diisi.', session('errors')->get('name')[0]);
    }

    public function test_saved_english_cookie_overrides_indonesian_default(): void
    {
        $this->withUnencryptedCookie('vms_locale', 'en')
            ->get('/login')->assertOk()->assertSee('<html lang="en">', false);
        $this->from('/register')->post('/register', [])->assertRedirect('/register');
        $this->assertSame('The name field is required.', session('errors')->get('name')[0]);
    }

    public function test_language_can_switch_in_both_directions_through_existing_cookie_endpoint(): void
    {
        foreach (['en', 'id', 'en', 'id'] as $locale) {
            $this->withUnencryptedCookie('vms_locale', $locale)->post('/locale')->assertNoContent();
            $this->get('/')->assertOk()->assertSee('<html lang="'.$locale.'">', false);
        }
    }
}
