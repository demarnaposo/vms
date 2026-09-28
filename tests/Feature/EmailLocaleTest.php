<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Vendor;
use App\Notifications\VendorApplicationSubmitted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class EmailLocaleTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_saves_locale_and_renders_complete_indonesian_verification_email(): void
    {
        $this->withUnencryptedCookie('vms_locale', 'id')->post('/register', [
            'name' => 'New Vendor',
            'email' => 'new.vendor@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertRedirect(route('verification.notice'));

        $this->assertSame('id', User::where('email', 'new.vendor@example.com')->firstOrFail()->preferred_locale);

        $message = Mail::mailer('array')->getSymfonyTransport()->messages()->sole()->getOriginalMessage();
        $html = $message->getHtmlBody();

        $this->assertSame('Verifikasi alamat email VMS Anda', $message->getSubject());
        $this->assertStringContainsString('Halo!', $html);
        $this->assertStringContainsString('Verifikasi Alamat Email', $html);
        $this->assertStringContainsString('Salam,', $html);
        $this->assertStringContainsString('Jika Anda kesulitan mengeklik tombol', $html);
    }

    public function test_queued_vendor_application_email_uses_each_recipient_locale(): void
    {
        $vendor = Vendor::factory()->create(['company_name' => 'PPM Manajemen']);
        $indonesianRecipient = User::factory()->create(['preferred_locale' => 'id']);
        $englishRecipient = User::factory()->create(['preferred_locale' => 'en']);

        App::setLocale('en');
        $indonesianRecipient->notify(new VendorApplicationSubmitted($vendor));
        $englishRecipient->notify(new VendorApplicationSubmitted($vendor));

        $messages = Mail::mailer('array')->getSymfonyTransport()->messages();
        $this->assertCount(2, $messages);

        $indonesianMail = $messages[0]->getOriginalMessage();
        $englishMail = $messages[1]->getOriginalMessage();

        $this->assertSame('Pengajuan Vendor Baru: PPM Manajemen', $indonesianMail->getSubject());
        $this->assertStringContainsString('Tinjau Pengajuan', $indonesianMail->getHtmlBody());
        $this->assertStringContainsString('Halo!', $indonesianMail->getHtmlBody());
        $this->assertSame('New Vendor Application: PPM Manajemen', $englishMail->getSubject());
        $this->assertStringContainsString('Review Application', $englishMail->getHtmlBody());
    }

    public function test_password_reset_email_uses_saved_recipient_locale(): void
    {
        $user = User::factory()->create(['preferred_locale' => 'id']);

        $this->withUnencryptedCookie('vms_locale', 'en')->post('/forgot-password', [
            'email' => $user->email,
        ])->assertSessionHas('status');

        $message = Mail::mailer('array')->getSymfonyTransport()->messages()->sole()->getOriginalMessage();

        $this->assertSame('Pemberitahuan Pengaturan Ulang Kata Sandi', $message->getSubject());
        $this->assertStringContainsString('Atur Ulang Kata Sandi', $message->getHtmlBody());
        $this->assertStringContainsString('Halo!', $message->getHtmlBody());
    }

    public function test_supported_cookie_updates_only_current_users_preference(): void
    {
        $user = User::factory()->create(['preferred_locale' => 'en']);
        $other = User::factory()->create(['preferred_locale' => 'en']);

        $this->actingAs($user)->withUnencryptedCookie('vms_locale', 'id')->post('/locale')
            ->assertNoContent();

        $this->assertSame('id', $user->fresh()->preferred_locale);
        $this->assertSame('en', $other->fresh()->preferred_locale);

        $this->withUnencryptedCookie('vms_locale', 'xx')->post('/locale')->assertNoContent();
        $this->assertSame('id', $user->fresh()->preferred_locale);
    }
}
