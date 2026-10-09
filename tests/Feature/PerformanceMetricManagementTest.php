<?php

namespace Tests\Feature;

use App\Models\ComplianceRule;
use App\Models\PerformanceMetric;
use App\Models\Role;
use App\Models\User;
use App\Models\Vendor;
use App\Services\ComplianceService;
use App\Services\PerformanceMetricService;
use App\Services\PerformanceService;
use App\Services\ReportService;
use App\Services\SystemMasterDataService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class PerformanceMetricManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        (new SystemMasterDataService)->syncRolesAndPermissions();
        $this->admin = User::factory()->create();
        $this->admin->assignRole(Role::SUPER_ADMIN);
        $this->actingAs($this->admin);
        $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);
    }

    private function metric(array $overrides = []): PerformanceMetric
    {
        return PerformanceMetric::create([...['name' => 'custom_quality', 'display_name' => 'Custom Quality', 'description' => 'Manual description', 'weight' => '100.00', 'max_score' => 4, 'is_active' => true], ...$overrides]);
    }

    private function score(Vendor $vendor, PerformanceMetric $metric, int $score): void
    {
        app(PerformanceService::class)->recordScore($vendor, $metric, $score, $this->admin, now()->startOfMonth()->toDateString(), now()->toDateString());
    }

    public function test_custom_metric_reaches_rating_dashboard_detail_reports_export_and_compliance(): void
    {
        $metric = $this->metric();
        $vendor = Vendor::factory()->create(['performance_score' => 0, 'status' => Vendor::STATUS_ACTIVE]);
        $this->get('/admin/performance/'.$vendor->id.'/rate')->assertInertia(fn ($page) => $page->where('metrics.0.name', $metric->name)->where('metrics.0.max_score', 4));
        $this->score($vendor, $metric, 3);
        $this->get('/admin/performance')->assertInertia(fn ($page) => $page->where('vendors.0.performance_score', 75));
        $this->get('/admin/performance/'.$vendor->id)->assertInertia(fn ($page) => $page->where('breakdown.0.metric.display_name', 'Custom Quality')->where('history.0.average', 75));
        $report = app(ReportService::class)->performanceReportData(new Request);
        $this->assertSame(75, (int) $report['vendors']->first()->performance_score);
        $csv = app(ReportService::class)->exportPerformanceCsv(new Request);
        $this->assertStringContainsString('75', $csv->getContent());
        $rule = ComplianceRule::create(['name' => 'threshold', 'description' => 'Performance threshold', 'type' => 'performance_threshold', 'conditions' => ['min_score' => 50], 'severity' => 'low', 'penalty_points' => 0, 'is_active' => true, 'blocks_payment' => false, 'blocks_activation' => false]);
        app(ComplianceService::class)->evaluateVendor($vendor->fresh());
        $this->assertDatabaseHas('compliance_results', ['vendor_id' => $vendor->id, 'compliance_rule_id' => $rule->id, 'status' => 'pass']);
        $this->score($vendor, $metric, 1);
        app(ComplianceService::class)->evaluateVendor($vendor->fresh());
        $this->assertDatabaseHas('compliance_results', ['vendor_id' => $vendor->id, 'compliance_rule_id' => $rule->id, 'status' => 'fail']);
    }

    public function test_latest_period_then_id_controls_score_and_breakdown_and_direct_service_rejects_bad_scores(): void
    {
        $metric = $this->metric();
        $vendor = Vendor::factory()->create();
        $this->score($vendor, $metric, 4);
        app(PerformanceService::class)->recordScore($vendor, $metric, 1, $this->admin, now()->subMonth()->startOfMonth()->toDateString(), now()->subMonth()->endOfMonth()->toDateString());
        $this->assertSame(100, $vendor->fresh()->performance_score);
        $this->score($vendor, $metric, 2);
        $this->assertSame(50, $vendor->fresh()->performance_score);
        $this->assertSame(2, app(PerformanceService::class)->getMetricBreakdown($vendor)[0]['current_score']);
        foreach ([0, -1, 5, 1.5, 1.0, null, ''] as $invalid) {
            try {
                app(PerformanceService::class)->recordScore($vendor, $metric, $invalid, $this->admin, now()->toDateString(), now()->toDateString());
                $this->fail('Invalid score accepted');
            } catch (ValidationException $exception) {
                $this->assertArrayHasKey('score', $exception->errors());
            }
        }
        $this->assertDatabaseCount('performance_scores', 3);
    }

    public function test_rated_scale_and_model_identity_are_immutable_and_history_survives_failed_edits(): void
    {
        $metric = $this->metric();
        $vendor = Vendor::factory()->create();
        $this->score($vendor, $metric, 4);
        $before = DB::table('score_history')->get()->toJson();
        foreach (['en', 'id'] as $locale) {
            $this->withUnencryptedCookie('vms_locale', $locale);
            $data = $metric->only(['name', 'display_name', 'description', 'weight', 'max_score', 'is_active']);
            $this->put('/admin/performance-metrics/'.$metric->id, [...$data, 'max_score' => 5])->assertSessionHasErrors('max_score');
            $this->delete('/admin/performance-metrics/'.$metric->id)->assertSessionHasErrors('metric');
        }
        $this->assertSame($before, DB::table('score_history')->get()->toJson());
        $this->expectException(ValidationException::class);
        $metric->update(['name' => 'renamed']);
    }

    public function test_old_snapshot_is_read_without_reinterpreting_its_scale_or_current_configuration(): void
    {
        $vendor = Vendor::factory()->create();
        DB::table('score_history')->insert(['vendor_id' => $vendor->id, 'performance_score' => 87, 'source' => 'system', 'metadata' => json_encode(['old_scale' => 10]), 'recorded_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        $this->assertSame(87, app(PerformanceService::class)->getVendorHistory($vendor)[0]['average']);
        $this->assertDatabaseCount('score_history', 1);
    }

    public function test_invalid_empty_configuration_does_not_clear_existing_score(): void
    {
        $vendor = Vendor::factory()->create(['performance_score' => 90]);
        try {
            app(PerformanceService::class)->recalculateVendorScore($vendor);
            $this->fail('Empty configuration accepted');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('configuration', $exception->errors());
        }
        $this->assertSame(90, $vendor->fresh()->performance_score);
        $this->assertDatabaseCount('score_history', 0);
    }

    public function test_direct_service_authorization_and_field_validation(): void
    {
        $metric = $this->metric();
        $user = User::factory()->create();
        $user->assignRole(Role::OPS_MANAGER);
        try {
            app(PerformanceMetricService::class)->delete($metric, $user);
            $this->fail('Unauthorized delete accepted');
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $exception) {
            $this->assertSame(403, $exception->getStatusCode());
        }
        $this->expectException(ValidationException::class);
        app(PerformanceMetricService::class)->save(['name' => 'bad code'], $this->admin);
    }
}
