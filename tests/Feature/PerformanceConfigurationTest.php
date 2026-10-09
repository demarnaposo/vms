<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\PerformanceMetric;
use App\Models\Role;
use App\Models\User;
use App\Models\Vendor;
use App\Services\PerformanceBaselineReplacement;
use App\Services\PerformanceMetricService;
use App\Services\PerformanceService;
use App\Services\SystemMasterDataService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PerformanceConfigurationTest extends TestCase
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

    private function baseline(): void
    {
        (new SystemMasterDataService)->syncPerformanceMetrics();
    }

    private function config(): array
    {
        return ['version' => PerformanceMetricService::version(), 'metrics' => PerformanceMetric::ordered()->get()->map(fn ($m) => [
            ...$m->only(['id', 'name', 'display_name', 'description', 'weight', 'max_score', 'is_active']), 'deleted' => false,
        ])->all()];
    }

    private function custom(array $overrides = []): array
    {
        return [...['id' => null, 'name' => 'custom_quality', 'display_name' => 'Manual Label', 'description' => 'Manual description', 'weight' => '5.00', 'max_score' => 4, 'is_active' => true, 'deleted' => false], ...$overrides];
    }

    private function saveConfig(array $data)
    {
        return $this->putJson('/admin/performance-metrics/configuration', $data);
    }

    public function test_baseline_order_weights_scales_and_idempotent_admin_preservation(): void
    {
        $this->assertSame(4, (new PerformanceMetric)->max_score);
        $this->baseline();
        $metrics = PerformanceMetric::ordered()->get();
        $this->assertSame(['work_quality', 'work_quantity', 'goods_services_price', 'goods_services_provision', 'payment_mechanism', 'invoice_delivery'], $metrics->pluck('name')->all());
        $this->assertSame(['25.00', '25.00', '25.00', '10.00', '5.00', '10.00'], $metrics->pluck('weight')->all());
        $this->assertSame([4], $metrics->pluck('max_score')->unique()->values()->all());
        $metrics[0]->update(['display_name' => 'Manual Label', 'description' => 'Manual prose', 'is_active' => false]);
        $before = DB::table('performance_metrics')->get()->toJson();
        $this->baseline();
        $this->assertSame($before, DB::table('performance_metrics')->get()->toJson());
    }

    public function test_atomic_add_redistribution_edit_delete_and_status_changes(): void
    {
        $this->baseline();
        $data = $this->config();
        $data['metrics'][0]['weight'] = '20.00';
        $data['metrics'][] = $this->custom();
        $this->saveConfig($data)->assertRedirect()->assertSessionHasNoErrors()->assertSessionHas('success');
        $this->assertDatabaseCount('performance_metrics', 7);
        $metric = PerformanceMetric::where('name', 'custom_quality')->firstOrFail();
        $data = $this->config();
        foreach ($data['metrics'] as &$row) {
            if ($row['id'] === $metric->id) {
                $row['is_active'] = false;
                $row['display_name'] = 'Updated Manual';
            }
        }
        unset($row);
        $data['metrics'][0]['weight'] = '25.00';
        $this->saveConfig($data)->assertSessionHasNoErrors();
        $this->assertSame('Updated Manual', $metric->fresh()->display_name);
        $this->delete('/admin/performance-metrics/'.$metric->id)->assertSessionHasNoErrors()->assertSessionHas('success');
        $this->assertDatabaseMissing('performance_metrics', ['id' => $metric->id]);
        foreach (['created', 'updated', 'deleted'] as $event) {
            $this->assertDatabaseHas('audit_logs', ['auditable_type' => PerformanceMetric::class, 'auditable_id' => $metric->id, 'event' => $event]);
        }
        // Deactivate a built-in and redistribute its full weight in the same transaction.
        $data = $this->config();
        $data['metrics'][0]['is_active'] = false;
        $data['metrics'][1]['weight'] = '50.00';
        $this->saveConfig($data)->assertSessionHasNoErrors();
    }

    public function test_invalid_totals_precision_fields_duplicate_and_stale_versions_do_not_partially_save(): void
    {
        $this->baseline();
        $before = DB::table('performance_metrics')->get()->toJson();
        foreach (['24.99', '25.01', '-1', 'not a number', '100.01', '25.001', '2.5e1'] as $weight) {
            $data = $this->config();
            $data['metrics'][0]['weight'] = $weight;
            $data['metrics'][1]['display_name'] = 'Do not save';
            $this->saveConfig($data)->assertUnprocessable();
            $this->assertSame($before, DB::table('performance_metrics')->get()->toJson());
        }
        foreach (['name' => 'renamed', 'max_score' => 5, 'display_name' => '', 'is_active' => 'bad', 'description' => str_repeat('x', 1001)] as $field => $value) {
            $data = $this->config();
            $data['metrics'][0][$field] = $value;
            $this->saveConfig($data)->assertUnprocessable();
        }
        $data = $this->config();
        $data['metrics'][] = $this->custom(['name' => $data['metrics'][0]['name'], 'is_active' => false]);
        $this->saveConfig($data)->assertUnprocessable();
        $stale = $this->config();
        $fresh = $this->config();
        $fresh['metrics'][0]['description'] = 'Changed concurrently';
        $this->saveConfig($fresh)->assertSessionHasNoErrors();
        $this->saveConfig($stale)->assertUnprocessable()->assertJsonValidationErrors('configuration');
        $this->assertDatabaseCount('audit_logs', 1);
    }

    public function test_single_row_routes_cannot_break_total_or_delete_builtins(): void
    {
        $this->baseline();
        $metric = PerformanceMetric::first();
        $data = $metric->only(['name', 'display_name', 'description', 'weight', 'max_score', 'is_active']);
        foreach ([['weight' => '24.00'], ['is_active' => false], ['max_score' => 5]] as $change) {
            $this->putJson('/admin/performance-metrics/'.$metric->id, [...$data, ...$change])->assertUnprocessable();
        }
        $this->postJson('/admin/performance-metrics', $this->custom())->assertUnprocessable();
        $this->deleteJson('/admin/performance-metrics/'.$metric->id)->assertUnprocessable();
        $this->assertDatabaseCount('performance_metrics', 6);
    }

    public function test_exact_decimal_total_and_active_deletion_with_redistribution(): void
    {
        PerformanceMetric::create(collect($this->custom(['name' => 'a', 'weight' => '33.33']))->except(['id', 'deleted'])->all());
        PerformanceMetric::create(collect($this->custom(['name' => 'b', 'weight' => '33.33']))->except(['id', 'deleted'])->all());
        PerformanceMetric::create(collect($this->custom(['name' => 'c', 'weight' => '33.34']))->except(['id', 'deleted'])->all());
        $data = $this->config();
        $this->saveConfig($data)->assertSessionHasNoErrors();
        $this->deleteJson('/admin/performance-metrics/'.$data['metrics'][0]['id'])->assertUnprocessable();
        $data['metrics'][0]['deleted'] = true;
        $data['metrics'][1]['weight'] = '50.00';
        $data['metrics'][2]['weight'] = '50.00';
        $this->saveConfig($data)->assertSessionHasNoErrors();
        $this->assertDatabaseCount('performance_metrics', 2);
    }

    public function test_rating_bounds_formula_snapshots_missing_values_and_reconfiguration_history(): void
    {
        $this->baseline();
        $vendor = Vendor::factory()->create(['performance_score' => 0]);
        $metrics = PerformanceMetric::ordered()->get();
        $ratings = ['period_start' => now()->toDateString(), 'period_end' => now()->toDateString(), 'ratings' => $metrics->map(fn ($m) => ['metric_id' => $m->id, 'score' => 4])->all()];
        $this->post('/admin/performance/'.$vendor->id.'/rate', $ratings)->assertSessionHasNoErrors();
        $this->assertSame(100, $vendor->fresh()->performance_score);
        $original = DB::table('score_history')->first();
        $this->assertCount(6, json_decode($original->metadata, true)['metrics']);
        foreach ($ratings['ratings'] as &$row) {
            $row['score'] = 2;
        }
        unset($row);
        $this->post('/admin/performance/'.$vendor->id.'/rate', $ratings)->assertSessionHasNoErrors();
        $this->assertSame(50, $vendor->fresh()->performance_score);
        foreach ([-1, 5, 2.5, 'bad'] as $score) {
            $invalid = $ratings;
            $invalid['ratings'][5]['score'] = $score;
            $this->postJson('/admin/performance/'.$vendor->id.'/rate', $invalid)->assertUnprocessable();
            $this->assertDatabaseCount('performance_scores', 12);
            $this->assertDatabaseCount('score_history', 2);
        }
        $incomplete = $ratings;
        array_pop($incomplete['ratings']);
        $this->postJson('/admin/performance/'.$vendor->id.'/rate', $incomplete)->assertUnprocessable();
        $data = $this->config();
        $data['metrics'][0]['weight'] = '20.00';
        $data['metrics'][1]['weight'] = '30.00';
        $this->saveConfig($data)->assertSessionHasNoErrors();
        $this->assertEquals($original, DB::table('score_history')->where('id', $original->id)->first());
        $this->assertSame(50, app(PerformanceService::class)->getVendorHistory($vendor)[0]['average']);
        $this->deleteJson('/admin/performance-metrics/'.$metrics[0]->id)->assertUnprocessable();
        $newVendor = Vendor::factory()->create(['performance_score' => 0]);
        app(PerformanceService::class)->recordScore($newVendor, $metrics[0], 4, $this->admin, now()->toDateString(), now()->toDateString());
        $this->assertSame(20, $newVendor->fresh()->performance_score);
        $snapshot = \App\Models\ScoreHistory::where('vendor_id', $newVendor->id)->latest('id')->first()->metadata['metrics'];
        $this->assertSame(4, $snapshot[0]['score']);
        $this->assertNull($snapshot[1]['score']);
        $this->assertNull(app(PerformanceService::class)->getMetricBreakdown($newVendor)[1]['current_score']);
    }

    public function test_search_uses_displayed_language_and_keeps_full_configuration_and_pagination(): void
    {
        $this->baseline();
        for ($i = 0; $i < 12; $i++) {
            PerformanceMetric::create(collect($this->custom(['name' => 'custom_'.$i, 'display_name' => 'Long custom '.$i, 'is_active' => false]))->except(['id', 'deleted'])->all());
        }
        $this->withUnencryptedCookie('vms_locale', 'id')->get('/admin/performance-metrics?search=Kualitas')
            ->assertInertia(fn ($page) => $page->has('metrics.data', 1)->has('configuration', 18)->where('filters.search', 'Kualitas'));
        $this->withUnencryptedCookie('vms_locale', 'en')->get('/admin/performance-metrics?search=Quality')
            ->assertInertia(fn ($page) => $page->has('metrics.data', 1));
        $this->get('/admin/performance-metrics?search=Long&page=2')
            ->assertInertia(fn ($page) => $page->has('metrics.data', 2)->where('metrics.total', 12)->where('metrics.current_page', 2)->has('configuration', 18));
        $this->get('/admin/performance-metrics?search=none')->assertInertia(fn ($page) => $page->has('metrics.data', 0)->has('configuration', 18));
        PerformanceMetric::where('name', 'work_quality')->firstOrFail()->update(['display_name' => 'Manual Quality']);
        $this->withUnencryptedCookie('vms_locale', 'id')->get('/admin/performance-metrics?search=spesifikasi')
            ->assertInertia(fn ($page) => $page->has('metrics.data', 1)->where('metrics.data.0.display_name', 'Manual Quality'));
    }

    public function test_direct_authorization_is_enforced_for_every_endpoint(): void
    {
        $this->baseline();
        $data = $this->config();
        $metric = PerformanceMetric::first();
        foreach ([Role::OPS_MANAGER, Role::FINANCE_MANAGER, Role::VENDOR] as $role) {
            $user = User::factory()->create();
            $user->assignRole($role);
            $this->actingAs($user);
            $this->get('/admin/performance-metrics')->assertForbidden();
            $this->saveConfig($data)->assertForbidden();
            $this->post('/admin/performance-metrics', $this->custom())->assertForbidden();
            $this->putJson('/admin/performance-metrics/'.$metric->id, $this->custom())->assertForbidden();
            $this->delete('/admin/performance-metrics/'.$metric->id)->assertForbidden();
        }
        $this->assertDatabaseCount('performance_metrics', 6);
    }

    public function test_guarded_replacement_is_idempotent_and_retains_audited_legacy_and_custom(): void
    {
        $old = PerformanceMetric::create(['name' => 'ops_rating', 'display_name' => 'Operations Rating', 'weight' => '.25', 'max_score' => 10, 'is_active' => true]);
        $unused = PerformanceMetric::create(['name' => 'issue_frequency', 'display_name' => 'Issue Frequency', 'weight' => '.25', 'max_score' => 10, 'is_active' => true]);
        AuditLog::log(AuditLog::EVENT_UPDATED, $old);
        $custom = PerformanceMetric::create(collect($this->custom(['is_active' => false]))->except(['id', 'deleted'])->all());
        $replacement = new PerformanceBaselineReplacement;
        $dry = $replacement->replace();
        $this->assertSame([$old->id], $dry['retained']);
        $this->assertNotNull($unused->fresh());
        $replacement->replace(true);
        $this->assertFalse($old->fresh()->is_active);
        $this->assertSame('25.00', $old->fresh()->weight);
        $this->assertDatabaseMissing('performance_metrics', ['id' => $unused->id]);
        $this->assertNotNull($custom->fresh());
        $this->assertDatabaseCount('audit_logs', 1);
        $before = DB::table('performance_metrics')->get()->toJson();
        $replacement->replace(true);
        $this->assertSame($before, DB::table('performance_metrics')->get()->toJson());
    }

    public function test_replacement_refuses_vendor_draft_scores_history_and_active_custom_without_mutation(): void
    {
        $old = PerformanceMetric::create(['name' => 'ops_rating', 'display_name' => 'Operations Rating', 'weight' => '.25', 'max_score' => 10, 'is_active' => true]);
        $vendor = Vendor::factory()->create();
        $before = DB::table('performance_metrics')->get()->toJson();
        try {
            (new PerformanceBaselineReplacement)->replace(true);
            $this->fail('Replacement allowed existing vendor');
        } catch (\RuntimeException $exception) {
            $this->assertStringContainsString('vendors', $exception->getMessage());
        }
        $this->assertSame($before, DB::table('performance_metrics')->get()->toJson());
        $this->assertNotNull($vendor->fresh());
        $this->assertNotNull($old->fresh());
    }

    public function test_late_database_failure_rolls_back_all_metrics_and_audits(): void
    {
        $this->baseline();
        $data = $this->config();
        $data['metrics'][0]['display_name'] = 'First changed';
        $data['metrics'][1]['display_name'] = 'Second changed';
        $before = DB::table('performance_metrics')->get()->toJson();
        $event = 'eloquent.creating: '.AuditLog::class;
        \Illuminate\Support\Facades\Event::listen($event, function ($audit): void {
            if (($audit->new_values['display_name'] ?? null) === 'Second changed') {
                throw new \RuntimeException('Simulated audit persistence failure');
            }
        });
        try {
            app(PerformanceMetricService::class)->saveConfiguration($data, $this->admin);
            $this->fail('Expected persistence failure');
        } catch (\RuntimeException $exception) {
            $this->assertStringContainsString('Simulated', $exception->getMessage());
        } finally {
            \Illuminate\Support\Facades\Event::forget($event);
        }
        $this->assertSame($before, DB::table('performance_metrics')->get()->toJson());
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_replacement_refuses_draft_json_and_active_custom_before_any_write(): void
    {
        $old = PerformanceMetric::create(['name' => 'ops_rating', 'display_name' => 'Operations Rating', 'weight' => '.25', 'max_score' => 10, 'is_active' => true]);
        \App\Models\VendorApplication::create(['user_id' => $this->admin->id, 'status' => 'draft', 'current_step' => 1, 'data' => ['metric_id' => $old->id]]);
        try {
            (new PerformanceBaselineReplacement)->replace(true);
            $this->fail('Draft ignored');
        } catch (\RuntimeException $exception) {
            $this->assertStringContainsString('vendor_applications', $exception->getMessage());
        }
        $this->assertDatabaseCount('performance_metrics', 1);
        DB::table('vendor_applications')->delete();
        PerformanceMetric::create(collect($this->custom())->except(['id', 'deleted'])->all());
        try {
            (new PerformanceBaselineReplacement)->replace(true);
            $this->fail('Custom active allocation overwritten');
        } catch (\RuntimeException $exception) {
            $this->assertStringContainsString('active custom', $exception->getMessage());
        }
        $this->assertDatabaseCount('performance_metrics', 2);
    }

    public function test_nested_snapshot_references_protect_deletion_even_without_score_rows(): void
    {
        $this->baseline();
        $metric = PerformanceMetric::create(collect($this->custom(['is_active' => false]))->except(['id', 'deleted'])->all());
        $vendor = Vendor::factory()->create();
        DB::table('score_history')->insert(['vendor_id' => $vendor->id, 'performance_score' => 87, 'source' => 'system', 'metadata' => json_encode(['metrics' => [['performance_metric_id' => (string) $metric->id]]]), 'recorded_at' => now()]);
        $this->deleteJson('/admin/performance-metrics/'.$metric->id)->assertUnprocessable()->assertJsonValidationErrors('metric');
        $this->assertNotNull($metric->fresh());
    }

    public function test_nonactive_legacy_scale_remains_readable_and_cannot_be_activated(): void
    {
        $this->baseline();
        $metric = PerformanceMetric::create(['name' => 'ops_rating', 'display_name' => 'Archived Operations Rating', 'weight' => '0.25', 'max_score' => 10, 'is_active' => false]);
        $data = $this->config();
        $this->saveConfig($data)->assertSessionHasNoErrors();
        $this->assertSame(10, $metric->fresh()->max_score);
        $data = $this->config();
        foreach ($data['metrics'] as &$row) {
            if ($row['id'] === $metric->id) {
                $row['is_active'] = true;
            }
        }
        unset($row);
        $this->saveConfig($data)->assertUnprocessable();
        $this->assertFalse($metric->fresh()->is_active);
    }

    public function test_new_metric_configuration_rejects_non_four_maximum_even_when_inactive(): void
    {
        $this->baseline();
        $before = PerformanceMetric::ordered()->get()->toArray();
        foreach ([0, 1, 3, 5, 4.5, 'bad'] as $maximum) {
            $data = $this->config();
            $data['metrics'][0]['display_name'] = 'Must not partially save';
            $data['metrics'][] = $this->custom(['max_score' => $maximum, 'is_active' => false]);
            $this->saveConfig($data)->assertUnprocessable()->assertJsonValidationErrors('metrics.6.max_score');
            $this->assertSame($before, PerformanceMetric::ordered()->get()->toArray());
            $this->assertDatabaseCount('score_history', 0);
        }
        $data = $this->config();
        $data['metrics'][] = $this->custom(['is_active' => false]);
        $this->saveConfig($data)->assertSessionHasNoErrors();
        $this->assertDatabaseCount('performance_metrics', 7);
    }
}
