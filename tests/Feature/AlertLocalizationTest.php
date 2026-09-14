<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
// Start Update 12 September 2026, by @WNP: Include vendor status data in localized lifecycle alert coverage.
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

// Start Update 12 September 2026, by @WNP: Exercise dynamic alerts with the same plain locale cookie sent by the browser.
class AlertLocalizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_notification_delivery_alert_uses_indonesian_count(): void
    {
        Notification::fake();
        $role = Role::firstOrCreate(['name' => 'ops_manager'], ['display_name' => 'Ops Manager']);
        $admin = User::factory()->create();
        $admin->roles()->attach($role);

        $this->actingAs($admin)
            ->withUnencryptedCookie('vms_locale', 'id')
            ->post('/admin/notifications/send', [
                'title' => 'Reminder',
                'message' => 'Please check your account.',
                'severity' => 'info',
                'target' => 'all_vendors',
            ])
            ->assertRedirect()
            ->assertSessionHas('success', 'Notifikasi berhasil dikirim kepada 0 penerima.');
    }

    public function test_password_reset_feedback_uses_indonesian(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $this->withUnencryptedCookie('vms_locale', 'id')
            ->post('/forgot-password', ['email' => $user->email])
            ->assertRedirect()
            ->assertSessionHas('status', 'Tautan pengaturan ulang kata sandi telah dikirim melalui email.');
    }

    // Start Update 12 September 2026, by @WNP: Check lifecycle errors translate static copy but keep persisted status codes.
    public function test_vendor_lifecycle_error_preserves_raw_status_in_indonesian_alert(): void
    {
        $role = Role::firstOrCreate(['name' => 'ops_manager'], ['display_name' => 'Ops Manager']);
        $admin = User::factory()->create();
        $admin->roles()->attach($role);
        $vendor = Vendor::factory()->create(['status' => Vendor::STATUS_DRAFT]);

        $this->actingAs($admin)
            ->withUnencryptedCookie('vms_locale', 'id')
            ->post("/admin/vendors/{$vendor->id}/approve")
            ->assertRedirect()
            ->assertSessionHasErrors(['status']);

        $this->assertSame('Vendor tidak dapat disetujui dari status draft.', session('errors')->get('status')[0]);
    }
}
