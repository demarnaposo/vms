<?php

namespace Tests\Feature;

use App\Models\ComplianceFlag;
use App\Models\ComplianceRule;
use App\Models\DocumentType;
use App\Models\Role;
use App\Models\User;
use App\Models\Vendor;
use App\Models\VendorDocument;
use App\Services\ComplianceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ComplianceEngineTest extends TestCase
{
    use RefreshDatabase;

    public function test_vendor_becomes_blocked_with_more_than_two_open_flags(): void
    {
        Role::firstOrCreate(['name' => 'vendor'], ['display_name' => 'Vendor']);

        $user = User::factory()->create();
        $user->roles()->attach(Role::where('name', 'vendor')->first());

        $vendor = Vendor::create([
            'user_id' => $user->id,
            'company_name' => 'Compliance Test Vendor',
            'contact_person' => 'Compliance Owner',
            'contact_email' => $user->email,
            'contact_phone' => '9876543210',
            'status' => Vendor::STATUS_ACTIVE,
            'compliance_status' => Vendor::COMPLIANCE_COMPLIANT,
            'compliance_score' => 95,
            'deed_number' => 'DEED-000001',
            'address' => '123 St',
            // Gunakan fixture lokasi Indonesia.
            'city' => 'Kota Bandung',
            'state' => 'Jawa Barat',
            'pincode' => '40115',
        ]);

        foreach ([1, 2, 3] as $i) {
            ComplianceFlag::create([
                'vendor_id' => $vendor->id,
                'severity' => 'high',
                'status' => 'open',
                'reason' => "Unresolved issue {$i}",
                'flagged_at' => now(),
            ]);
        }

        $result = app(ComplianceService::class)->evaluateVendor($vendor);

        $this->assertSame(Vendor::COMPLIANCE_BLOCKED, $result['status']);
        $this->assertSame(3, $result['open_flags']);

        $this->assertDatabaseHas('vendors', [
            'id' => $vendor->id,
            'compliance_status' => Vendor::COMPLIANCE_BLOCKED,
        ]);
    }

    public function test_inactive_rule_flags_remain_in_history_without_blocking_current_compliance(): void
    {
        $vendor = Vendor::factory()->create(['status' => Vendor::STATUS_ACTIVE]);
        $rule = ComplianceRule::create([
            'name' => 'inactive_test_rule',
            'description' => 'Historical rule',
            'type' => ComplianceRule::TYPE_CUSTOM,
            'conditions' => [],
            'severity' => ComplianceRule::SEVERITY_HIGH,
            'penalty_points' => 20,
            'is_active' => false,
        ]);

        for ($index = 0; $index < 3; $index++) {
            ComplianceFlag::create([
                'vendor_id' => $vendor->id,
                'compliance_rule_id' => $rule->id,
                'severity' => ComplianceRule::SEVERITY_HIGH,
                'status' => 'open',
                'reason' => 'Historical flag',
                'flagged_at' => now(),
            ]);
        }

        $result = app(ComplianceService::class)->evaluateVendor($vendor);

        $this->assertSame(Vendor::COMPLIANCE_COMPLIANT, $result['status']);
        $this->assertSame(0, $result['open_flags']);
        $this->assertDatabaseCount('compliance_flags', 3);
    }

    public function test_expired_document_still_blocks_compliance_until_a_valid_replacement_exists(): void
    {
        $vendor = Vendor::factory()->create(['status' => Vendor::STATUS_ACTIVE]);
        $type = DocumentType::create([
            'name' => 'optional_insurance',
            'display_name' => 'Optional Insurance',
            'is_mandatory' => false,
            'has_expiry' => true,
            'is_active' => true,
        ]);
        ComplianceRule::create([
            'name' => 'expiry_test_rule',
            'description' => 'Expiry check',
            'type' => ComplianceRule::TYPE_DOCUMENT_EXPIRY,
            'conditions' => ['warning_days' => 15],
            'severity' => ComplianceRule::SEVERITY_HIGH,
            'penalty_points' => 20,
            'blocks_payment' => true,
            'is_active' => true,
        ]);
        $expired = VendorDocument::create([
            'vendor_id' => $vendor->id,
            'document_type_id' => $type->id,
            'file_name' => 'old.pdf',
            'file_path' => 'test/old.pdf',
            'file_hash' => str_repeat('a', 64),
            'file_size' => 10,
            'mime_type' => 'application/pdf',
            'version' => 1,
            'is_current' => true,
            'verification_status' => VendorDocument::STATUS_EXPIRED,
            'expiry_date' => today()->subDay(),
        ]);

        $this->assertSame(Vendor::COMPLIANCE_BLOCKED, app(ComplianceService::class)->evaluateVendor($vendor)['status']);

        $expired->update(['is_current' => false]);
        VendorDocument::create([
            'vendor_id' => $vendor->id,
            'document_type_id' => $type->id,
            'file_name' => 'replacement.pdf',
            'file_path' => 'test/replacement.pdf',
            'file_hash' => str_repeat('b', 64),
            'file_size' => 10,
            'mime_type' => 'application/pdf',
            'version' => 2,
            'is_current' => true,
            'verification_status' => VendorDocument::STATUS_VERIFIED,
            'expiry_date' => today()->addMonths(2),
        ]);

        $this->assertSame(Vendor::COMPLIANCE_COMPLIANT, app(ComplianceService::class)->evaluateVendor($vendor)['status']);
    }
}
