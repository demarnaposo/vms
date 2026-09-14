<?php

namespace Tests\Feature;

// Start Update 14 September 2026, by @WNP: Cover VMS activation feedback when compliance flags block the action.
use App\Models\ComplianceFlag;
use App\Models\Role;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VendorManagementTest extends TestCase
{
    use RefreshDatabase;

    protected $adminUser;

    protected $vendor;

    protected function setUp(): void
    {
        parent::setUp();
        // Disable CSRF protection for tests
        $this->withoutMiddleware([
            \Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class,
            \Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
        ]);

        // Seed roles
        Role::firstOrCreate(['name' => 'vendor'], ['display_name' => 'Vendor']);
        Role::firstOrCreate(['name' => 'super_admin'], ['display_name' => 'Super Admin']);

        // Create Admin
        $this->adminUser = User::factory()->create();
        $this->adminUser->roles()->attach(Role::where('name', 'super_admin')->first());

        // Create Vendor in submitted state
        $vendorUser = User::factory()->create();
        $vendorUser->roles()->attach(Role::where('name', 'vendor')->first());

        $this->vendor = Vendor::create([
            'user_id' => $vendorUser->id,
            'company_name' => 'Test Vendor Co',
            'contact_person' => 'Contact Person',
            'contact_email' => $vendorUser->email,
            'contact_phone' => '9876543210',
            'status' => Vendor::STATUS_SUBMITTED,
            'compliance_status' => Vendor::COMPLIANCE_COMPLIANT,
            'compliance_score' => 90,
            'submitted_at' => now(),
            // Minimum required fields based on model/migrations
            'pan_number' => 'ABCDE1234F',
            'address' => '123 St',
            // Start Update 11 September 2026, by @WNP: Gunakan fixture lokasi Indonesia.
            'city' => 'Kota Bandung',
            'state' => 'Jawa Barat',
            'pincode' => '40115',
        ]);
    }

    public function test_admin_can_view_vendors_list()
    {
        $response = $this->actingAs($this->adminUser)
            ->get(route('admin.vendors.index'));

        $response->assertStatus(200);
        $response->assertInertia(
            fn ($page) => $page
                ->component('Admin/Vendors/Index')
                ->has('vendors.data', 1)
        );
    }

    public function test_admin_can_view_vendor_details()
    {
        $response = $this->actingAs($this->adminUser)
            ->get(route('admin.vendors.show', $this->vendor));

        $response->assertStatus(200);
        $response->assertInertia(
            fn ($page) => $page
                ->component('Admin/Vendors/Show')
                ->where('vendor.id', $this->vendor->id)
        );
    }

    // Start Update 13 September 2026, by @WNP: Ensure timeline payload preserves raw comments and exposes reason codes for selective localization.
    public function test_vendor_detail_keeps_raw_timeline_comments_and_reason_codes()
    {
        $this->vendor->stateLogs()->create([
            'user_id' => $this->adminUser->id,
            'from_status' => Vendor::STATUS_TERMINATED,
            'to_status' => Vendor::STATUS_UNDER_REVIEW,
            'comment' => 'Admin reviewed termination appeal and restored access.',
            'reason_code' => 'APPEAL_APPROVED',
            // Start Update 13 September 2026, by @WNP: Preserve explicit system provenance in the timeline response.
            'metadata' => ['comment_source' => 'system'],
        ]);

        $this->actingAs($this->adminUser)
            ->get(route('admin.vendors.show', $this->vendor))
            ->assertInertia(
                fn ($page) => $page
                    ->component('Admin/Vendors/Show')
                    ->where('vendor.state_logs.0.comment', 'Admin reviewed termination appeal and restored access.')
                    ->where('vendor.state_logs.0.reason_code', 'APPEAL_APPROVED')
                    ->where('vendor.state_logs.0.metadata.comment_source', 'system')
            );
    }

    // Start Update 13 September 2026, by @WNP: Confirm new automatic timeline comments carry a source marker.
    public function test_default_approval_comment_is_marked_as_system_generated()
    {
        $this->actingAs($this->adminUser)
            ->post(route('admin.vendors.approve', $this->vendor))
            ->assertRedirect();

        $logs = $this->vendor->stateLogs()->get();
        $this->assertCount(2, $logs);
        foreach ($logs as $log) {
            $this->assertSame('Vendor approved', $log->comment);
            $this->assertSame('system', $log->metadata['comment_source']);
        }
    }

    // Start Update 13 September 2026, by @WNP: A matching comment typed by a user must remain identifiable as user-authored.
    public function test_user_approval_comment_matching_default_is_marked_as_user_authored()
    {
        $this->actingAs($this->adminUser)
            ->post(route('admin.vendors.approve', $this->vendor), ['comment' => 'Vendor approved'])
            ->assertRedirect();

        $logs = $this->vendor->stateLogs()->get();
        $this->assertCount(2, $logs);
        foreach ($logs as $log) {
            $this->assertSame('Vendor approved', $log->comment);
            $this->assertSame('user', $log->metadata['comment_source']);
        }
    }

    public function test_admin_can_approve_vendor()
    {
        $response = $this->actingAs($this->adminUser)
            ->post(route('admin.vendors.approve', $this->vendor), [
                'comment' => 'Approved for testing',
            ]);

        $response->assertRedirect(); // Back

        // Approve now transitions to approved state (activation is a separate step)
        $this->assertDatabaseHas('vendors', [
            'id' => $this->vendor->id,
            'status' => Vendor::STATUS_APPROVED,
        ]);

        $this->assertDatabaseHas('vendor_state_logs', [
            'vendor_id' => $this->vendor->id,
            'to_status' => Vendor::STATUS_APPROVED,
            'comment' => 'Approved for testing',
        ]);
    }

    public function test_admin_can_reject_vendor()
    {
        $response = $this->actingAs($this->adminUser)
            ->post(route('admin.vendors.reject', $this->vendor), [
                'comment' => 'Rejected for testing',
            ]);

        $response->assertRedirect(); // Back

        $this->assertDatabaseHas('vendors', [
            'id' => $this->vendor->id,
            'status' => Vendor::STATUS_REJECTED,
        ]);
    }

    public function test_admin_can_activate_approved_vendor()
    {
        $this->vendor->update([
            'status' => Vendor::STATUS_APPROVED,
        ]);

        $response = $this->actingAs($this->adminUser)
            ->post(route('admin.vendors.activate', $this->vendor), [
                'comment' => 'Activating vendor',
            ]);

        $response->assertRedirect();
        // Start Update 14 September 2026, by @WNP: Keep successful VMS activation visible through the admin flash alert.
        $response->assertSessionHas('success', 'Vendor activated!');

        $this->assertDatabaseHas('vendors', [
            'id' => $this->vendor->id,
            'status' => Vendor::STATUS_ACTIVE,
        ]);

        $this->assertDatabaseHas('vendor_state_logs', [
            'vendor_id' => $this->vendor->id,
            'from_status' => Vendor::STATUS_APPROVED,
            'to_status' => Vendor::STATUS_ACTIVE,
            'comment' => 'Activating vendor',
        ]);
    }

    public function test_admin_cannot_reactivate_suspended_vendor_without_compliance()
    {
        $this->vendor->update([
            'status' => Vendor::STATUS_SUSPENDED,
            'compliance_status' => Vendor::COMPLIANCE_AT_RISK,
            'compliance_score' => 60,
        ]);

        $response = $this->actingAs($this->adminUser)
            ->post(route('admin.vendors.activate', $this->vendor), [
                'comment' => 'Trying reactivation',
            ]);

        $response->assertRedirect();
        $response->assertSessionHasErrors('status');

        $this->assertDatabaseHas('vendors', [
            'id' => $this->vendor->id,
            'status' => Vendor::STATUS_SUSPENDED,
        ]);
    }

    // Start Update 14 September 2026, by @WNP: Return a visible error when an approved vendor still has an open compliance flag.
    public function test_activation_returns_status_error_for_open_compliance_flag(): void
    {
        $this->vendor->update(['status' => Vendor::STATUS_APPROVED]);
        ComplianceFlag::create([
            'vendor_id' => $this->vendor->id,
            'severity' => 'medium',
            'status' => 'open',
            'reason' => 'Performance score below threshold.',
            'flagged_at' => now(),
        ]);

        $this->actingAs($this->adminUser)
            ->post(route('admin.vendors.activate', $this->vendor), ['comment' => 'Activate'])
            ->assertSessionHasErrors(['status' => __('alerts.flags_block_activation')]);

        $this->assertSame(Vendor::STATUS_APPROVED, $this->vendor->fresh()->status);
    }

    // Start Update 14 September 2026, by @WNP: Keep VMS suspension feedback and required-comment errors observable.
    public function test_suspension_returns_success_or_comment_error(): void
    {
        $this->vendor->update(['status' => Vendor::STATUS_ACTIVE]);

        $this->actingAs($this->adminUser)
            ->post(route('admin.vendors.suspend', $this->vendor), [])
            ->assertSessionHasErrors('comment');

        $this->actingAs($this->adminUser)
            ->post(route('admin.vendors.suspend', $this->vendor), ['comment' => 'Pending review'])
            ->assertSessionHas('success', 'Vendor suspended.');

        $this->assertSame(Vendor::STATUS_SUSPENDED, $this->vendor->fresh()->status);
    }

    public function test_admin_can_terminate_active_vendor()
    {
        $this->vendor->update([
            'status' => Vendor::STATUS_ACTIVE,
            'activated_at' => now(),
        ]);

        $response = $this->actingAs($this->adminUser)
            ->post(route('admin.vendors.terminate', $this->vendor), [
                'comment' => 'Material compliance breach',
            ]);

        $response->assertRedirect();
        // Start Update 14 September 2026, by @WNP: Keep successful VMS termination visible through the admin flash alert.
        $response->assertSessionHas('success', 'Vendor terminated.');

        $this->assertDatabaseHas('vendors', [
            'id' => $this->vendor->id,
            'status' => Vendor::STATUS_TERMINATED,
        ]);

        $this->assertDatabaseHas('vendor_state_logs', [
            'vendor_id' => $this->vendor->id,
            'from_status' => Vendor::STATUS_ACTIVE,
            'to_status' => Vendor::STATUS_TERMINATED,
            'comment' => 'Material compliance breach',
        ]);
    }

    // Start Update 14 September 2026, by @WNP: Return a field error if a VMS termination reason is missing.
    public function test_termination_returns_comment_error_when_reason_is_missing(): void
    {
        $this->vendor->update(['status' => Vendor::STATUS_ACTIVE]);

        $this->actingAs($this->adminUser)
            ->post(route('admin.vendors.terminate', $this->vendor), [])
            ->assertSessionHasErrors('comment');

        $this->assertSame(Vendor::STATUS_ACTIVE, $this->vendor->fresh()->status);
    }
}
