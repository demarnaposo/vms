<?php

namespace Tests\Feature;

// Cover IDR labels and formatting in payment CSV exports.
use App\Models\PaymentRequest;
use App\Models\Role;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_ops_manager_can_export_vendor_alias_csv(): void
    {
        $user = $this->createOpsUser();

        Vendor::factory()->create([
            'status' => Vendor::STATUS_ACTIVE,
            'compliance_status' => Vendor::COMPLIANCE_COMPLIANT,
            'compliance_score' => 92,
            'performance_score' => 87,
        ]);

        $response = $this->actingAs($user)
            ->get(route('admin.reports.export', ['type' => 'vendor']));

        $response->assertOk();
        $this->assertStringContainsString('attachment; filename="vendor_summary_', (string) $response->headers->get('Content-Disposition'));
        $this->assertStringContainsString('Company Name', $response->getContent());
    }

    public function test_ops_manager_can_export_compliance_report_alias_csv(): void
    {
        $user = $this->createOpsUser();

        Vendor::factory()->create([
            'status' => Vendor::STATUS_ACTIVE,
            'compliance_status' => Vendor::COMPLIANCE_NON_COMPLIANT,
            'compliance_score' => 42,
        ]);

        $response = $this->actingAs($user)
            ->get(route('admin.reports.export', ['type' => 'compliance_report']));

        $response->assertOk();
        $this->assertStringContainsString('attachment; filename="compliance_report_', (string) $response->headers->get('Content-Disposition'));
        $this->assertStringContainsString('Compliance Status', $response->getContent());
    }

    // Verify exported payment amounts use the configured IDR code and Indonesian separators.
    public function test_payment_csv_uses_idr_currency_format(): void
    {
        $user = $this->createOpsUser();
        $vendor = Vendor::factory()->create();

        PaymentRequest::create([
            'vendor_id' => $vendor->id,
            'requested_by' => $user->id,
            'reference_number' => 'PAY-EXPORT-IDR',
            'amount' => 1000000,
            'description' => 'IDR export verification',
            'status' => PaymentRequest::STATUS_PAID,
        ]);

        $response = $this->actingAs($user)
            ->get(route('admin.reports.export', ['type' => 'payment']));

        $response->assertOk();
        $this->assertStringContainsString('Amount (IDR)', $response->getContent());
        $this->assertStringContainsString('Rp 1.000.000', $response->getContent());
    }

    public function test_export_with_unknown_type_returns_not_found(): void
    {
        $user = $this->createOpsUser();

        $this->actingAs($user)
            ->get(route('admin.reports.export', ['type' => 'unknown_type']))
            ->assertNotFound();
    }

    public function test_vendor_csv_neutralizes_formula_prefixes_without_changing_stored_values(): void
    {
        $user = $this->createOpsUser();
        foreach (['=1+1', '+SUM(1,1)', '-SUM(1,1)', '@SUM(1,1)', "\t=1+1"] as $name) {
            Vendor::factory()->create(['company_name' => $name]);
        }

        $response = $this->actingAs($user)->get(route('admin.reports.export', ['type' => 'vendor']));
        $response->assertOk();
        $rows = array_map('str_getcsv', explode("\n", trim($response->getContent())));
        $names = array_column(array_slice($rows, 1), 1);
        foreach (['=1+1', '+SUM(1,1)', '-SUM(1,1)', '@SUM(1,1)', "\t=1+1"] as $name) {
            $this->assertContains("'".$name, $names);
            $this->assertDatabaseHas('vendors', ['company_name' => $name]);
        }
    }

    private function createOpsUser(): User
    {
        $opsRole = Role::firstOrCreate(['name' => Role::OPS_MANAGER], ['display_name' => 'Ops Manager']);

        $user = User::factory()->create();
        $user->roles()->attach($opsRole);

        return $user;
    }
}
