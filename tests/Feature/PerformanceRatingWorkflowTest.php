<?php

namespace Tests\Feature;

use App\Models\PerformanceMetric;
use App\Models\Role;
use App\Models\ScoreHistory;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PerformanceRatingWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected User $opsUser;

    protected Vendor $vendor;

    protected function setUp(): void
    {
        parent::setUp();

        (new \App\Services\SystemMasterDataService)->syncRolesAndPermissions();
        Role::firstOrCreate(['name' => 'ops_manager'], ['display_name' => 'Ops Manager']);

        $this->opsUser = User::factory()->create();
        $this->opsUser->roles()->attach(Role::where('name', 'ops_manager')->first());

        $vendorUser = User::factory()->create();
        $this->vendor = Vendor::factory()->create([
            'user_id' => $vendorUser->id,
            'status' => Vendor::STATUS_ACTIVE,
            'compliance_status' => Vendor::COMPLIANCE_COMPLIANT,
            'performance_score' => 0,
        ]);
    }

    public function test_ops_rating_creates_scores_and_single_history_entry(): void
    {
        $metricA = PerformanceMetric::create([
            'name' => 'delivery_timeliness',
            'display_name' => 'Delivery Timeliness',
            'weight' => 60,
            'max_score' => 4,
            'is_active' => true,
        ]);

        $metricB = PerformanceMetric::create([
            'name' => 'contract_adherence',
            'display_name' => 'Contract Adherence',
            'weight' => 40,
            'max_score' => 4,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->opsUser)->post(
            route('admin.performance.rate', $this->vendor),
            [
                'period_start' => now()->startOfMonth()->toDateString(),
                'period_end' => now()->endOfMonth()->toDateString(),
                'ratings' => [
                    ['metric_id' => $metricA->id, 'score' => 3, 'notes' => 'Good timing'],
                    ['metric_id' => $metricB->id, 'score' => 2, 'notes' => 'Needs stricter adherence'],
                ],
            ]
        );

        $response->assertRedirect(route('admin.performance.index'));
        $response->assertSessionHas('success', 'Performance ratings recorded successfully.');

        $this->assertDatabaseCount('performance_scores', 2);

        $this->vendor->refresh();
        $this->assertSame(65, (int) $this->vendor->performance_score);

        $this->assertDatabaseCount('score_history', 1);
        $history = ScoreHistory::query()->where('vendor_id', $this->vendor->id)->latest('id')->first();
        $this->assertNotNull($history);
        $this->assertSame('manual_rating', $history->source);
        $this->assertSame('rating_batch', $history->metadata['source'] ?? null);
        $this->assertSame(2, $history->metadata['metric_count'] ?? null);
    }

    public function test_rating_validation_uses_metric_max_score(): void
    {
        $metric = PerformanceMetric::create([
            'name' => 'issue_frequency',
            'display_name' => 'Issue Frequency',
            'weight' => 100,
            'max_score' => 4,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->opsUser)
            ->from(route('admin.performance.rate-form', $this->vendor))
            ->post(route('admin.performance.rate', $this->vendor), [
                'period_start' => now()->startOfMonth()->toDateString(),
                'period_end' => now()->endOfMonth()->toDateString(),
                'ratings' => [
                    ['metric_id' => $metric->id, 'score' => 8],
                ],
            ]);

        $response->assertRedirect(route('admin.performance.rate-form', $this->vendor));
        $response->assertSessionHasErrors(['ratings.0.score']);
        $this->assertDatabaseCount('performance_scores', 0);
        $this->assertDatabaseCount('score_history', 0);
    }

    public function test_performance_dashboard_includes_approved_vendor_for_ops(): void
    {
        $response = $this->actingAs($this->opsUser)->get(route('admin.performance.index'));

        $response->assertStatus(200);
        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Admin/Performance/Index')
                ->has('vendors', 1)
                ->where('vendors.0.id', $this->vendor->id)
                ->where('vendors.0.company_name', $this->vendor->company_name)
        );
    }

    public function test_one_to_four_scale_formula_invalid_requests_and_history_preservation(): void
    {
        \Illuminate\Support\Facades\Notification::fake();
        $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);
        app(\App\Services\SystemMasterDataService::class)->syncPerformanceMetrics();
        $metrics = PerformanceMetric::active()->ordered()->get();
        $this->assertSame(['25.00', '25.00', '25.00', '10.00', '5.00', '10.00'], $metrics->pluck('weight')->all());
        $payload = ['period_start' => now()->toDateString(), 'period_end' => now()->toDateString(), 'ratings' => $metrics->map(fn ($m) => ['metric_id' => $m->id, 'score' => 1])->all()];
        foreach ([[1, 1, 1, 1, 1, 1], [4, 4, 4, 4, 4, 4], [1, 2, 3, 4, 1, 2]] as $scores) {
            foreach ($scores as $i => $score) {
                $payload['ratings'][$i]['score'] = $score;
            }
            $this->actingAs($this->opsUser)->post(route('admin.performance.rate', $this->vendor), $payload)->assertSessionHasNoErrors();
            // Independent weighted mean / 4; no subtraction of the minimum.
            $expected = (int) round(array_sum(array_map(fn ($score, $weight) => $score * $weight / 4, $scores, [25, 25, 25, 10, 5, 10])), 0, PHP_ROUND_HALF_UP);
            $this->assertSame($expected, $this->vendor->fresh()->performance_score);
        }
        $before = ScoreHistory::orderBy('id')->get()->toArray();
        foreach ([0, -1, 5, 1.5, true, '1.0', '', null, 'missing'] as $invalid) {
            $data = $payload;
            if ($invalid === 'missing') {
                unset($data['ratings'][5]['score']);
            } else {
                $data['ratings'][5]['score'] = $invalid;
            }
            $this->postJson(route('admin.performance.rate', $this->vendor), $data)->assertUnprocessable()->assertJsonValidationErrors('ratings.5.score');
            $this->assertDatabaseCount('performance_scores', 18);
            $this->assertSame($before, ScoreHistory::orderBy('id')->get()->toArray());
            $this->assertSame(54, $this->vendor->fresh()->performance_score);
        }
        \Illuminate\Support\Facades\Notification::assertNothingSent();
    }

    public function test_legacy_zero_and_its_snapshot_remain_unchanged_after_a_new_rating(): void
    {
        app(\App\Services\SystemMasterDataService::class)->syncPerformanceMetrics();
        $metrics = PerformanceMetric::active()->ordered()->get();
        $legacy = \App\Models\PerformanceScore::create(['vendor_id' => $this->vendor->id, 'performance_metric_id' => $metrics[0]->id, 'scored_by' => $this->opsUser->id, 'score' => 0, 'period_start' => now()->subMonth()->toDateString(), 'period_end' => now()->subMonth()->toDateString()]);
        $snapshot = ScoreHistory::create(['vendor_id' => $this->vendor->id, 'performance_score' => 0, 'source' => 'system', 'metadata' => ['metrics' => [['metric_id' => $metrics[0]->id, 'score' => 0, 'max_score' => 4, 'weight' => 25]]], 'recorded_at' => now()->subMonth()]);
        $original = $snapshot->fresh()->getAttributes();
        $payload = ['period_start' => now()->toDateString(), 'period_end' => now()->toDateString(), 'ratings' => $metrics->map(fn ($m) => ['metric_id' => $m->id, 'score' => 1])->all()];
        $this->actingAs($this->opsUser)->post(route('admin.performance.rate', $this->vendor), $payload)->assertSessionHasNoErrors();
        $this->assertSame(0, $legacy->fresh()->score);
        $this->assertSame($original, $snapshot->fresh()->getAttributes());
        $this->assertSame(25, $this->vendor->fresh()->performance_score);
    }

    public function test_active_legacy_maximum_is_rejected_without_converting_configuration(): void
    {
        $metric = PerformanceMetric::create(['name' => 'legacy_scale', 'display_name' => 'Legacy scale', 'weight' => 100, 'max_score' => 10, 'is_active' => true]);
        $this->actingAs($this->opsUser)->postJson(route('admin.performance.rate', $this->vendor), [
            'period_start' => now()->toDateString(), 'period_end' => now()->toDateString(),
            'ratings' => [['metric_id' => $metric->id, 'score' => 1]],
        ])->assertUnprocessable()->assertJsonValidationErrors('ratings.0.metric_id');
        $this->assertSame(10, $metric->fresh()->max_score);
        $this->assertDatabaseCount('performance_scores', 0);
        $this->assertDatabaseCount('score_history', 0);
    }
}
