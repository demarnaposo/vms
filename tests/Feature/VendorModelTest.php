<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;
use Tests\TestCase;

class VendorModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_vendor_schema_factory_and_sensitive_casts_use_current_fields(): void
    {
        $vendor = Vendor::factory()->create();

        $this->assertTrue(Schema::hasColumn('vendors', 'business_identification_number'));
        $this->assertFalse(Schema::hasColumn('vendors', 'registration_number'));
        $this->assertMatchesRegularExpression(
            '/^[0-9]{13}$/',
            $vendor->business_identification_number
        );
        $this->assertTrue(Schema::hasColumn('vendors', 'code_bank'));
        $this->assertFalse(Schema::hasColumn('vendors', 'bank_ifsc'));
        $this->assertSame('008', $vendor->code_bank);
        $this->assertSame(
            '008',
            DB::table('vendors')->where('id', $vendor->id)->value('code_bank')
        );
        $this->assertArrayNotHasKey('code_bank', $vendor->toArray());

        $auditLog = AuditLog::where('auditable_type', Vendor::class)
            ->where('auditable_id', $vendor->id)
            ->where('event', AuditLog::EVENT_CREATED)
            ->firstOrFail();
        $this->assertArrayNotHasKey('business_identification_number', $auditLog->new_values);
        $this->assertArrayNotHasKey('code_bank', $auditLog->new_values);
    }

    /**
     * Test vendor status helper methods.
     */
    public function test_vendor_status_helpers()
    {
        $vendor = Vendor::factory()->make([
            'status' => Vendor::STATUS_ACTIVE,
            'compliance_status' => Vendor::COMPLIANCE_COMPLIANT,
        ]);

        $this->assertTrue($vendor->isActive());
        $this->assertTrue($vendor->isCompliant());
        $this->assertTrue($vendor->canRequestPayment());

        $suspendedVendor = Vendor::factory()->make([
            'status' => Vendor::STATUS_SUSPENDED,
        ]);

        $this->assertFalse($suspendedVendor->isActive());
        $this->assertFalse($suspendedVendor->canRequestPayment());
    }

    /**
     * Test valid state transitions.
     */
    public function test_vendor_state_transitions()
    {
        $vendor = Vendor::factory()->create([
            'status' => Vendor::STATUS_SUBMITTED,
        ]);

        // Submitted -> Under Review (Valid)
        $this->assertTrue($vendor->canTransitionTo(Vendor::STATUS_UNDER_REVIEW));

        // Submitted -> Active (Invalid - must go through approval)
        $this->assertFalse($vendor->canTransitionTo(Vendor::STATUS_ACTIVE));

        // Perform valid transition
        $admin = User::factory()->create();
        $success = $vendor->transitionTo(Vendor::STATUS_UNDER_REVIEW, $admin, 'Reviewing application');

        $this->assertTrue($success);
        $this->assertEquals(Vendor::STATUS_UNDER_REVIEW, $vendor->fresh()->status);

        // Verify Audit Log (VendorStateLog)
        $this->assertDatabaseHas('vendor_state_logs', [
            'vendor_id' => $vendor->id,
            'from_status' => Vendor::STATUS_SUBMITTED,
            'to_status' => Vendor::STATUS_UNDER_REVIEW,
            'comment' => 'Reviewing application',
        ]);
    }

    public function test_stale_vendor_instance_cannot_overwrite_a_terminated_status(): void
    {
        $vendor = Vendor::factory()->create(['status' => Vendor::STATUS_ACTIVE]);
        $stale = Vendor::findOrFail($vendor->id);
        $admin = User::factory()->create();

        $vendor->transitionTo(Vendor::STATUS_TERMINATED, $admin, 'Contract ended');

        try {
            $stale->transitionTo(Vendor::STATUS_SUSPENDED, $admin, 'Outdated action');
            $this->fail('A stale transition must be rejected.');
        } catch (InvalidArgumentException $exception) {
            $this->assertSame('Invalid vendor status transition: terminated -> suspended', $exception->getMessage());
        }

        $this->assertSame(Vendor::STATUS_TERMINATED, $vendor->fresh()->status);
        $this->assertDatabaseMissing('vendor_state_logs', [
            'vendor_id' => $vendor->id,
            'to_status' => Vendor::STATUS_SUSPENDED,
        ]);
    }

    /**
     * Test badge class generation.
     */
    public function test_status_badge_classes()
    {
        $vendor = new Vendor;

        $vendor->status = Vendor::STATUS_ACTIVE;
        $this->assertEquals('badge-active', $vendor->getStatusBadgeClass());

        $vendor->status = Vendor::STATUS_REJECTED;
        $this->assertEquals('badge-rejected', $vendor->getStatusBadgeClass());

        $vendor->status = 'unknown_status';
        $this->assertEquals('badge-draft', $vendor->getStatusBadgeClass());
    }
}
