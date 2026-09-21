<?php

namespace Tests\Feature;

use App\Services\ContactMessageService;
use Egulias\EmailValidator\EmailValidator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class ContactMessageSubmissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_successful_submission_is_stored_before_success_feedback_is_returned(): void
    {
        $this->allowSyntacticallyValidTestEmail();

        $payload = [
            'name' => 'Contact Person',
            'email' => 'contact@example.com',
            'subject' => 'Product question',
            'message' => 'Please provide more information about VMS.',
        ];

        $this->withUnencryptedCookie('vms_locale', 'id')
            ->from(route('contact'))
            ->post(route('contact.store'), $payload)
            ->assertRedirect(route('contact'))
            ->assertSessionHas(
                'success',
                'Terima kasih atas pesan Anda! Kami akan segera menghubungi Anda.',
            )
            ->assertSessionMissing('error');

        $this->assertDatabaseHas('contact_messages', $payload);
    }

    public function test_validation_failure_does_not_store_a_message_or_return_success(): void
    {
        $this->withUnencryptedCookie('vms_locale', 'id')
            ->from(route('contact'))
            ->post(route('contact.store'), [
                'name' => '',
                'email' => 'invalid-email',
                'subject' => '',
                'message' => '',
            ])
            ->assertRedirect(route('contact'))
            ->assertSessionHasErrors(['name', 'email', 'subject', 'message'])
            ->assertSessionMissing('success');

        $this->assertDatabaseCount('contact_messages', 0);
    }

    public function test_storage_failure_returns_safe_error_without_success_feedback(): void
    {
        $this->allowSyntacticallyValidTestEmail();

        $service = Mockery::mock(ContactMessageService::class);
        $service->shouldReceive('create')
            ->once()
            ->andThrow(new RuntimeException('Sensitive storage detail'));
        $this->app->instance(ContactMessageService::class, $service);

        $this->withUnencryptedCookie('vms_locale', 'en')
            ->from(route('contact'))
            ->post(route('contact.store'), [
                'name' => 'Contact Person',
                'email' => 'contact@example.com',
                'subject' => 'Product question',
                'message' => 'Please provide more information about VMS.',
            ])
            ->assertRedirect(route('contact'))
            ->assertSessionHas('error', 'Your message could not be sent. Please try again.')
            ->assertSessionMissing('success');

        $this->assertDatabaseCount('contact_messages', 0);
    }

    private function allowSyntacticallyValidTestEmail(): void
    {
        $emailValidator = Mockery::mock(EmailValidator::class);
        $emailValidator->shouldReceive('isValid')->andReturnTrue();
        $this->app->instance(EmailValidator::class, $emailValidator);
    }
}
