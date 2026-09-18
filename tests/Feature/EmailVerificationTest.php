<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Notifications\VendorEmailVerification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => Role::VENDOR], ['display_name' => 'Vendor']);
        Role::firstOrCreate(['name' => Role::SUPER_ADMIN], ['display_name' => 'Super Admin']);
    }

    public function test_registration_sends_verification_email_and_opens_notice(): void
    {
        Notification::fake();

        $this->post('/register', [
            'name' => 'New Vendor',
            'email' => 'new.vendor@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertRedirect(route('verification.notice'))
            ->assertSessionMissing('status');

        $vendor = User::where('email', 'new.vendor@example.com')->firstOrFail();

        $this->assertAuthenticatedAs($vendor);
        $this->assertNull($vendor->email_verified_at);
        $this->assertTrue($vendor->isVendor());
        Notification::assertSentTo($vendor, VendorEmailVerification::class);
    }

    public function test_verification_email_follows_selected_language(): void
    {
        Notification::fake();

        $this->withUnencryptedCookie('vms_locale', 'id')->post('/register', [
            'name' => 'New Vendor',
            'email' => 'localized.vendor@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertRedirect(route('verification.notice'));

        $vendor = User::where('email', 'localized.vendor@example.com')->firstOrFail();

        Notification::assertSentTo($vendor, VendorEmailVerification::class, function ($notification) use ($vendor) {
            $message = $notification->toMail($vendor);

            return $message->subject === 'Verifikasi alamat email VMS Anda'
                && $message->actionText === 'Verifikasi Alamat Email';
        });
    }

    public function test_unverified_vendor_cannot_open_vendor_pages(): void
    {
        $vendor = $this->vendor();

        $this->actingAs($vendor)
            ->get(route('vendor.dashboard'))
            ->assertRedirect(route('verification.notice'));

        $this->actingAs($vendor)
            ->get('/vendor/onboarding')
            ->assertRedirect(route('verification.notice'));

        $this->actingAs($vendor)
            ->get(route('notifications.index'))
            ->assertRedirect(route('verification.notice'));

        $this->actingAs($vendor)
            ->get(route('profile.edit'))
            ->assertRedirect(route('verification.notice'));

        $this->actingAs($vendor)
            ->get(route('verification.notice'))
            ->assertInertia(fn ($page) => $page
                ->component('Auth/VerifyEmail')
                ->where('email', $vendor->email));
    }

    public function test_existing_unverified_vendor_goes_directly_to_verification_after_login(): void
    {
        Notification::fake();
        $vendor = $this->vendor();

        $this->post('/login', [
            'email' => $vendor->email,
            'password' => 'password',
        ])->assertRedirect(route('verification.notice'))
            ->assertSessionMissing('status');

        $this->assertAuthenticatedAs($vendor);
        $this->assertNull($vendor->fresh()->email_verified_at);
        Notification::assertSentToTimes($vendor, VendorEmailVerification::class, 1);

        $this->get(route('verification.notice'))
            ->assertInertia(fn ($page) => $page
                ->component('Auth/VerifyEmail')
                ->where('status', null));
    }

    public function test_repeated_login_does_not_send_verification_email_again_immediately(): void
    {
        Notification::fake();
        $vendor = $this->vendor();

        for ($attempt = 1; $attempt <= 2; $attempt++) {
            $this->post('/login', [
                'email' => $vendor->email,
                'password' => 'password',
            ])->assertRedirect(route('verification.notice'));

            $this->post(route('logout'))->assertRedirect('/');
        }

        Notification::assertSentToTimes($vendor, VendorEmailVerification::class, 1);

        $this->post('/login', [
            'email' => $vendor->email,
            'password' => 'password',
        ])->assertRedirect(route('verification.notice'));

        $this->from(route('verification.notice'))
            ->post(route('verification.send'))
            ->assertSessionHas('status', 'verification-link-sent');

        Notification::assertSentToTimes($vendor, VendorEmailVerification::class, 2);
    }

    public function test_verification_link_opened_in_another_browser_resumes_after_login(): void
    {
        $vendor = $this->vendor();
        $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), [
            'id' => $vendor->id,
            'hash' => sha1($vendor->email),
        ]);

        $this->get($url)->assertRedirect(route('login'));

        $this->post('/login', [
            'email' => $vendor->email,
            'password' => 'password',
        ])->assertRedirect($url);

        $this->get($url)->assertRedirect(route('dashboard'));
        $this->assertNotNull($vendor->fresh()->email_verified_at);
    }

    public function test_verification_link_cannot_verify_a_different_logged_in_vendor(): void
    {
        $vendor = $this->vendor();
        $otherVendor = $this->vendor();
        $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), [
            'id' => $vendor->id,
            'hash' => sha1($vendor->email),
        ]);

        $this->get($url)->assertRedirect(route('login'));

        $this->post('/login', [
            'email' => $otherVendor->email,
            'password' => 'password',
        ])->assertRedirect($url);

        $this->get($url)->assertForbidden();
        $this->assertNull($vendor->fresh()->email_verified_at);
        $this->assertNull($otherVendor->fresh()->email_verified_at);
    }

    public function test_valid_signed_link_verifies_vendor_and_unlocks_dashboard(): void
    {
        $vendor = $this->vendor();
        $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), [
            'id' => $vendor->id,
            'hash' => sha1($vendor->email),
        ]);

        $this->actingAs($vendor)
            ->get($url)
            ->assertRedirect(route('dashboard'))
            ->assertSessionHas('success', 'Email address verified successfully.');

        $this->assertNotNull($vendor->fresh()->email_verified_at);
        $this->actingAs($vendor)
            ->get(route('vendor.dashboard'))
            ->assertRedirect(route('vendor.onboarding'));
    }

    public function test_invalid_or_expired_link_does_not_verify_vendor(): void
    {
        $vendor = $this->vendor();
        $url = URL::temporarySignedRoute('verification.verify', now()->subMinute(), [
            'id' => $vendor->id,
            'hash' => sha1($vendor->email),
        ]);

        $this->actingAs($vendor)->get($url)->assertForbidden();
        $this->assertNull($vendor->fresh()->email_verified_at);
    }

    public function test_link_for_an_old_email_cannot_verify_a_changed_address(): void
    {
        $vendor = $this->vendor();
        $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), [
            'id' => $vendor->id,
            'hash' => sha1($vendor->email),
        ]);
        $vendor->update(['email' => 'new.address@example.com']);

        $this->actingAs($vendor)->get($url)->assertForbidden();
        $this->assertNull($vendor->fresh()->email_verified_at);
    }

    public function test_vendor_can_resend_link_but_requests_are_throttled(): void
    {
        Notification::fake();
        $vendor = $this->vendor();

        for ($attempt = 1; $attempt <= 6; $attempt++) {
            $this->actingAs($vendor)
                ->from(route('verification.notice'))
                ->post(route('verification.send'))
                ->assertSessionHas('status', 'verification-link-sent');
        }

        $this->actingAs($vendor)
            ->post(route('verification.send'))
            ->assertStatus(429);

        Notification::assertSentToTimes($vendor, VendorEmailVerification::class, 6);
    }

    public function test_verified_vendor_cannot_send_another_verification_email(): void
    {
        Notification::fake();
        $vendor = $this->vendor(verified: true);

        $this->actingAs($vendor)
            ->post(route('verification.send'))
            ->assertRedirect(route('dashboard'));

        Notification::assertNothingSent();
    }

    public function test_changing_vendor_email_requires_verification_again(): void
    {
        Notification::fake();
        $vendor = $this->vendor(verified: true);

        $this->actingAs($vendor)
            ->patch(route('profile.update'), [
                'name' => $vendor->name,
                'email' => 'changed.vendor@example.com',
            ])
            ->assertRedirect(route('verification.notice'));

        $this->assertNull($vendor->fresh()->email_verified_at);
        Notification::assertSentTo($vendor, VendorEmailVerification::class);
    }

    public function test_unverified_staff_access_is_unchanged(): void
    {
        $staff = User::factory()->unverified()->create();
        $staff->assignRole(Role::SUPER_ADMIN);

        $this->actingAs($staff)
            ->get(route('dashboard'))
            ->assertRedirect(route('admin.dashboard'));

        $this->actingAs($staff)
            ->get(route('profile.edit'))
            ->assertOk();

        $this->actingAs($staff)
            ->get(route('verification.notice'))
            ->assertForbidden();
    }

    private function vendor(bool $verified = false): User
    {
        $vendor = User::factory()->create([
            'email_verified_at' => $verified ? now() : null,
        ]);
        $vendor->assignRole(Role::VENDOR);

        return $vendor;
    }
}
