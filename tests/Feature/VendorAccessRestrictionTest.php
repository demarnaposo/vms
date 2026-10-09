<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Models\Vendor;
use App\Services\VendorLifecycleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\URL;
use PHPUnit\Framework\Attributes\DataProvider;
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

        $this->post(route('login'), [
            'email' => $this->vendorUser->email,
            'password' => 'password',
        ])->assertRedirect(route('dashboard'));
        $this->assertAuthenticatedAs($this->vendorUser);
    }

    public static function restrictedAccounts(): array
    {
        return [
            'suspended' => [Vendor::STATUS_SUSPENDED, true],
            'terminated' => [Vendor::STATUS_TERMINATED, true],
            'rejected' => [Vendor::STATUS_REJECTED, true],
            'inactive under review' => [Vendor::STATUS_UNDER_REVIEW, false],
        ];
    }

    public static function localizedBlockedStatuses(): array
    {
        return [
            'Indonesian suspended' => ['id', Vendor::STATUS_SUSPENDED, 'ditangguhkan'],
            'Indonesian terminated' => ['id', Vendor::STATUS_TERMINATED, 'dihentikan'],
            'Indonesian rejected' => ['id', Vendor::STATUS_REJECTED, 'ditolak'],
            'English suspended' => ['en', Vendor::STATUS_SUSPENDED, 'suspended'],
            'English terminated' => ['en', Vendor::STATUS_TERMINATED, 'terminated'],
            'English rejected' => ['en', Vendor::STATUS_REJECTED, 'rejected'],
        ];
    }

    #[DataProvider('localizedBlockedStatuses')]
    public function test_blocked_status_errors_are_localized_across_login_session_and_password_reset(string $locale, string $status, string $label): void
    {
        Notification::fake();
        $token = Password::createToken($this->vendorUser);
        $originalPassword = $this->vendorUser->password;
        $this->vendor->update(['status' => $status]);
        $this->vendorUser->update(['is_active' => false]);
        $this->withUnencryptedCookie('vms_locale', $locale);
        $expected = $locale === 'id'
            ? "Akun vendor Anda saat ini berstatus {$label}. Silakan hubungi dukungan."
            : "Your vendor account is currently {$label}. Please contact support.";

        $this->post(route('login'), [
            'email' => $this->vendorUser->email,
            'password' => 'password',
        ])->assertSessionHasErrors(['email' => $expected]);
        $this->assertGuest();

        $this->actingAs($this->vendorUser->fresh())->get(route('vendor.dashboard'))
            ->assertRedirect(route('login'))->assertSessionHasErrors(['email' => $expected]);
        $this->assertGuest();

        $this->post(route('password.email'), ['email' => $this->vendorUser->email])
            ->assertSessionHasErrors(['email' => $expected]);
        $this->post(route('password.store'), [
            'email' => $this->vendorUser->email,
            'token' => $token,
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertSessionHasErrors(['email' => $expected]);

        $this->assertGuest();
        $this->assertSame($status, $this->vendor->fresh()->status);
        $this->assertSame($originalPassword, $this->vendorUser->fresh()->password);
        Notification::assertNothingSent();
    }

    #[DataProvider('restrictedAccounts')]
    public function test_restricted_vendor_cannot_access_any_email_verification_endpoint(string $status, bool $active): void
    {
        Notification::fake();
        $this->vendor->update(['status' => $status]);
        $this->vendorUser->forceFill(['is_active' => $active, 'email_verified_at' => null])->save();
        $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), [
            'id' => $this->vendorUser->id,
            'hash' => sha1($this->vendorUser->email),
        ]);

        $this->actingAs($this->vendorUser->fresh())->get(route('verification.notice'))
            ->assertRedirect(route('login'))->assertSessionHasErrors('email');
        $this->assertGuest();
        $this->actingAs($this->vendorUser->fresh())->get($url)
            ->assertRedirect(route('login'))->assertSessionHasErrors('email');
        $this->assertGuest();
        $this->actingAs($this->vendorUser->fresh())->post(route('verification.send'))
            ->assertRedirect(route('login'))->assertSessionHasErrors('email');
        $this->assertGuest();

        $this->assertNull($this->vendorUser->fresh()->email_verified_at);
        Notification::assertNothingSent();
    }

    #[DataProvider('restrictedAccounts')]
    public function test_restricted_vendor_cannot_request_or_complete_password_reset(string $status, bool $active): void
    {
        Notification::fake();
        $token = Password::createToken($this->vendorUser);
        $originalPassword = $this->vendorUser->password;
        $originalRememberToken = $this->vendorUser->remember_token;
        $this->vendor->update(['status' => $status]);
        $this->vendorUser->update(['is_active' => $active]);

        $this->post(route('password.email'), ['email' => $this->vendorUser->email])
            ->assertSessionHasErrors('email');
        $this->post(route('password.store'), [
            'email' => $this->vendorUser->email,
            'token' => $token,
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertSessionHasErrors('email');

        $this->assertSame($originalPassword, $this->vendorUser->fresh()->password);
        $this->assertSame($originalRememberToken, $this->vendorUser->fresh()->remember_token);
        $this->assertTrue(Password::tokenExists($this->vendorUser->fresh(), $token));
        Notification::assertNothingSent();
    }

    public function test_enabled_vendor_under_review_can_verify_email_and_reset_password(): void
    {
        Notification::fake();
        $this->vendor->update(['status' => Vendor::STATUS_UNDER_REVIEW]);
        $this->vendorUser->forceFill(['email_verified_at' => null])->save();

        $this->actingAs($this->vendorUser)->get(route('verification.notice'))->assertOk();
        $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), [
            'id' => $this->vendorUser->id,
            'hash' => sha1($this->vendorUser->email),
        ]);
        $this->get($url)->assertRedirect(route('dashboard'));
        $this->assertNotNull($this->vendorUser->fresh()->email_verified_at);
        $this->post(route('logout'));

        $this->post(route('password.email'), ['email' => $this->vendorUser->email])->assertSessionHasNoErrors();
        $token = Password::createToken($this->vendorUser);
        $this->post(route('password.store'), [
            'email' => $this->vendorUser->email,
            'token' => $token,
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertRedirect(route('login'))->assertSessionHasNoErrors();
        $this->assertTrue(Hash::check('new-password', $this->vendorUser->fresh()->password));
    }
}
