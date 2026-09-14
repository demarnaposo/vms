<?php

namespace Tests\Feature;

// Start Update 13 September 2026, by @WNP: Exercise a rule that produces the reported score of 80.
use App\Models\ComplianceRule;
use App\Models\Role;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// Start Update 12 September 2026, by @WNP: Verify compliance evaluation alerts follow the selected language without altering status data.
class ComplianceEvaluationLocalizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_bulk_evaluation_alert_uses_indonesian_when_selected(): void
    {
        $admin = $this->operationsUser();
        Vendor::factory()->create(['status' => Vendor::STATUS_ACTIVE]);

        $this->actingAs($admin)
            // Start Update 12 September 2026, by @WNP: Reproduce the plain cookie sent by the language switcher.
            ->withUnencryptedCookie('vms_locale', 'id')
            ->post('/admin/compliance/evaluate-all')
            ->assertRedirect()
            ->assertSessionHas('success', 'Evaluasi kepatuhan selesai untuk 1 vendor.');
    }

    public function test_bulk_evaluation_alert_remains_english_by_default(): void
    {
        $admin = $this->operationsUser();

        $this->actingAs($admin)
            ->post('/admin/compliance/evaluate-all')
            ->assertRedirect()
            ->assertSessionHas('success', 'Compliance evaluation completed for 0 vendors.');
    }

    // Start Update 13 September 2026, by @WNP: Verify the alert label is Indonesian while the database status code stays unchanged.
    public function test_single_vendor_alert_localizes_status_label_without_changing_status_code(): void
    {
        $admin = $this->operationsUser();
        // Start Update 13 September 2026, by @WNP: Produce a nonblocking 20-point penalty while retaining the compliant status code.
        $vendor = Vendor::factory()->create(['performance_score' => 0]);
        ComplianceRule::create([
            'name' => 'Performance Threshold',
            'description' => 'Minimum performance score for evaluation',
            'type' => ComplianceRule::TYPE_PERFORMANCE_THRESHOLD,
            'conditions' => ['min_score' => 50],
            'severity' => ComplianceRule::SEVERITY_LOW,
            'penalty_points' => 20,
            'blocks_payment' => false,
            'blocks_activation' => false,
            'is_active' => true,
        ]);

        $this->actingAs($admin)
            // Start Update 12 September 2026, by @WNP: Verify the single-vendor alert with the real browser cookie format.
            ->withUnencryptedCookie('vms_locale', 'id')
            ->post("/admin/compliance/evaluate/{$vendor->id}")
            ->assertRedirect()
            ->assertSessionHas('success', 'Kepatuhan berhasil dievaluasi. Skor: 80, Status: Patuh');

        $this->assertSame(Vendor::COMPLIANCE_COMPLIANT, $vendor->fresh()->compliance_status);
        $this->assertSame(80, $vendor->fresh()->compliance_score);
    }

    private function operationsUser(): User
    {
        // Start Update 12 September 2026, by @WNP: Create an authorized operations user for evaluation route tests.
        $role = Role::firstOrCreate(['name' => 'ops_manager'], ['display_name' => 'Ops Manager']);
        $user = User::factory()->create();
        $user->roles()->attach($role);

        return $user;
    }
}
