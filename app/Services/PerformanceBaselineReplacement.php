<?php

namespace App\Services;

use App\Models\PerformanceMetric;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

class PerformanceBaselineReplacement
{
    public const LEGACY = ['delivery_timeliness', 'issue_frequency', 'ops_rating', 'contract_adherence'];

    public function replace(bool $apply = false): array
    {
        return PerformanceMetricService::locked(function () use ($apply): array {
            $baseline = (require database_path('data/system_master_data.php'))['performance_metrics'];
            $codes = array_column($baseline, 'name');
            $legacy = PerformanceMetric::whereIn('name', self::LEGACY)->get();
            $new = PerformanceMetric::whereIn('name', $codes)->get();
            // An already completed replacement never resets administrator changes.
            if ($legacy->where('is_active', true)->isEmpty() && $new->count() === count($baseline)) {
                return ['status' => 'already replaced', 'deleted' => [], 'retained' => []];
            }
            foreach (['vendors', 'performance_scores', 'score_history', 'vendor_applications'] as $table) {
                if (Schema::hasTable($table) && DB::table($table)->exists()) {
                    throw new RuntimeException('Replacement cancelled: '.$table.' contains records. No data was changed.');
                }
            }
            if ($new->isNotEmpty()) {
                throw new RuntimeException('Replacement cancelled: a partial new baseline exists. No data was changed.');
            }
            if (PerformanceMetric::whereNotIn('name', self::LEGACY)->where('is_active', true)->exists()) {
                throw new RuntimeException('Replacement cancelled: active custom metrics require an explicit weight allocation.');
            }
            $deleted = [];
            $retained = [];
            foreach ($legacy as $metric) {
                $audit = DB::table('audit_logs')->where('auditable_type', PerformanceMetric::class)->where('auditable_id', $metric->id)->exists();
                // Historical JSON may contain nested metric snapshots or code references.
                if (! $audit) {
                    foreach (DB::table('audit_logs')->select(['old_values', 'new_values'])->cursor() as $entry) {
                        if (self::references(json_decode($entry->old_values ?? 'null', true), $metric)
                            || self::references(json_decode($entry->new_values ?? 'null', true), $metric)) {
                            $audit = true;
                            break;
                        }
                    }
                }
                if ($audit) {
                    if (PerformanceMetricService::units($metric->weight) > 100) {
                        throw new RuntimeException('Replacement cancelled: audited legacy weights have ambiguous units. No data was changed.');
                    }
                    $retained[] = $metric->id;
                } else {
                    $deleted[] = $metric->id;
                }
            }
            if ($apply) {
                // Only explicit legacy identifiers are touched. Audit rows and all custom metrics survive.
                foreach ($legacy->whereIn('id', $retained) as $metric) {
                    // Convert the known fraction contract to percent while retaining identifiers and archived scales.
                    DB::table('performance_metrics')->where('id', $metric->id)->update([
                        'weight' => number_format(PerformanceMetricService::units($metric->weight), 2, '.', ''),
                        'is_active' => false, 'updated_at' => now(),
                    ]);
                }
                DB::table('performance_metrics')->whereIn('id', $deleted)->delete();
                foreach ($baseline as $row) {
                    PerformanceMetric::create($row);
                }
                PerformanceMetricService::assertTotal(PerformanceMetric::all()->toArray());
            }

            return ['status' => $apply ? 'replaced' : 'dry run', 'deleted' => $deleted, 'retained' => $retained];
        });
    }

    public static function references(mixed $value, PerformanceMetric $metric, string $key = ''): bool
    {
        if (! is_array($value)) {
            return $value === $metric->name
                || (in_array($key, ['metric_id', 'performance_metric_id', 'metric_ids'], true)
                    && (string) $value === (string) $metric->id);
        }
        foreach ($value as $childKey => $child) {
            if (self::references($child, $metric, is_string($childKey) ? $childKey : $key)) {
                return true;
            }
        }

        return false;
    }
}
