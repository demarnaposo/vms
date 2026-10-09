<?php

namespace Tests\Feature;

use Illuminate\Testing\TestResponse;
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
            $this->assertHtmlLanguage($this->get($url)->assertOk(), 'id');
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
        $this->assertHtmlLanguage(
            $this->withUnencryptedCookie('vms_locale', 'en')->get('/login')->assertOk(),
            'en'
        );
        $this->from('/register')->post('/register', [])->assertRedirect('/register');
        $this->assertSame('The name field is required.', session('errors')->get('name')[0]);
    }

    public function test_language_can_switch_in_both_directions_through_existing_cookie_endpoint(): void
    {
        foreach (['en', 'id', 'en', 'id'] as $locale) {
            $this->withUnencryptedCookie('vms_locale', $locale)->post('/locale')->assertNoContent();
            $this->assertHtmlLanguage($this->get('/')->assertOk(), $locale);
        }
    }

    private function assertHtmlLanguage(TestResponse $response, string $locale): void
    {
        $document = new \DOMDocument;
        $previous = libxml_use_internal_errors(true);
        try {
            $document->loadHTML($response->getContent());
            $this->assertSame($locale, $document->documentElement?->getAttribute('lang'));
        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($previous);
        }
    }
}
