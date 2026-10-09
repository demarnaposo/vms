<?php

namespace App\Services;

use App\Models\PerformanceMetric;
use App\Models\PerformanceScore;
use App\Models\ScoreHistory;
use App\Models\User;
use App\Models\Vendor;

class PerformanceService
{
    /**
     * Record a performance score for a vendor.
     * Scores are immutable once created.
     */
    public function recordScore(
        Vendor $vendor,
        PerformanceMetric $metric,
        mixed $score,
        User $scoredBy,
        string $periodStart,
        string $periodEnd,
        ?string $notes = null,
        bool $recalculate = true
    ): PerformanceScore {
        return PerformanceMetricService::locked(function () use ($vendor, $metric, $score, $scoredBy, $periodStart, $periodEnd, $notes, $recalculate) {
            $metric = PerformanceMetric::find($metric->id);
            if (! $metric || ! $metric->is_active) {
                throw \Illuminate\Validation\ValidationException::withMessages(['metric_id' => __('performance.validation.metric_unavailable')]);
            }
            if ((int) $metric->max_score !== PerformanceMetric::MAX_SCORE) {
                throw \Illuminate\Validation\ValidationException::withMessages(['metric_id' => __('performance.validation.maximum_four')]);
            }
            if (! is_int($score) || $score < PerformanceMetric::MIN_SCORE || $score > PerformanceMetric::MAX_SCORE) {
                throw \Illuminate\Validation\ValidationException::withMessages(['score' => __('performance.validation.score_range', ['max' => PerformanceMetric::MAX_SCORE])]);
            }
            $performanceScore = PerformanceScore::create([
                'vendor_id' => $vendor->id, 'performance_metric_id' => $metric->id,
                'scored_by' => $scoredBy->id, 'score' => $score, 'notes' => $notes,
                'period_start' => $periodStart, 'period_end' => $periodEnd,
            ]);
            if ($recalculate) {
                $this->recalculateVendorScore($vendor, $scoredBy, [
                    'metric_id' => $metric->id, 'period_start' => $periodStart, 'period_end' => $periodEnd,
                ]);
            }

            return $performanceScore;
        });
    }

    public function recordRatings(Vendor $vendor, array $data, User $actor): void
    {
        abort_unless($actor->staffCan('performance.rate'), 403);
        PerformanceMetricService::locked(function () use ($vendor, $data, $actor): void {
            // Validate again under the same locks as metric edits, including forms opened before deactivation.
            $request = new \App\Http\Requests\Admin\StorePerformanceRatingRequest;
            $request->replace($data);
            $validator = \Illuminate\Support\Facades\Validator::make($data, $request->rules(), $request->messages(), $request->attributes());
            $request->withValidator($validator);
            $data = $validator->validate();
            $metrics = PerformanceMetric::whereIn('id', array_column($data['ratings'], 'metric_id'))->get()->keyBy('id');
            foreach ($data['ratings'] as $rating) {
                $this->recordScore($vendor, $metrics[$rating['metric_id']], (int) $rating['score'], $actor,
                    $data['period_start'], $data['period_end'], $rating['notes'] ?? null, false);
            }
            $this->recalculateVendorScore($vendor, $actor, [
                'source' => 'rating_batch', 'period_start' => $data['period_start'],
                'period_end' => $data['period_end'], 'metric_count' => count($data['ratings']),
            ]);
        });
    }

    /**
     * Recalculate using the most recent score per active metric and current weights.
     */
    public function recalculateVendorScore(Vendor $vendor, ?User $actor = null, array $metadata = []): int
    {
        return PerformanceMetricService::locked(function () use ($vendor, $actor, $metadata) {
            $currentVendor = Vendor::withTrashed()->lockForUpdate()->findOrFail($vendor->id);
            $metrics = PerformanceMetric::active()->ordered()->get();
            $latestScores = PerformanceScore::where('vendor_id', $vendor->id)
                ->whereIn('performance_metric_id', $metrics->pluck('id'))
                ->orderByDesc('period_end')->orderByDesc('id')->get()
                ->groupBy('performance_metric_id')->map(fn ($scores) => $scores->first());
            PerformanceMetricService::assertTotal($metrics->toArray());
            $weightedUnits = 0;
            $snapshot = [];
            foreach ($metrics as $metric) {
                $score = $latestScores->get($metric->id)?->score;
                $score = $score === null ? null : (int) $score;
                $weightedUnits += ($score ?? 0) * PerformanceMetricService::units($metric->weight);
                $snapshot[] = ['metric_id' => $metric->id, 'name' => $metric->name,
                    'display_name' => $metric->display_name, 'description' => $metric->description,
                    'weight' => $metric->weight, 'max_score' => $metric->max_score, 'score' => $score];
            }
            // Basis points avoid floating-point totals: scale 4 / 4 * 100, rounded half up.
            // Missing scores contribute zero; their weights are never silently redistributed.
            $overallScore = intdiv($weightedUnits + 200, 400);
            $metadata = [...$metadata, 'metric_ids' => $metrics->pluck('id')->all(),
                'metrics' => $snapshot, 'weight_unit' => 'percent', 'output_scale' => 100];
            $configurationChange = ($metadata['source'] ?? null) === 'metric_configuration';
            if ($configurationChange && (int) $currentVendor->performance_score === $overallScore) {
                $vendor->performance_score = $overallScore;

                return $overallScore;
            }
            $currentVendor->update(['performance_score' => $overallScore]);
            $vendor->performance_score = $overallScore;
            ScoreHistory::create([
                'vendor_id' => $vendor->id, 'user_id' => $actor?->id, 'performance_score' => $overallScore,
                'source' => $configurationChange ? 'metric_configuration' : ($actor ? 'manual_rating' : 'system'),
                'metadata' => $metadata, 'recorded_at' => now(),
            ]);

            return $overallScore;
        });
    }

    /**
     * Get performance history for a vendor.
     */
    public function getVendorHistory(Vendor $vendor, int $months = 12): array
    {
        return ScoreHistory::where('vendor_id', $vendor->id)
            ->where('recorded_at', '>=', now()->subMonths($months))
            ->orderBy('recorded_at')->orderBy('id')->get()
            ->groupBy(fn ($history) => $history->recorded_at->format('Y-m'))
            ->map(fn ($entries, $month) => [
                'month' => $month,
                'average' => (int) $entries->last()->performance_score,
                'scores' => $entries->last()->metadata['metrics'] ?? [],
            ])->values()->toArray();
    }

    /**
     * Get performance breakdown by metric.
     */
    public function getMetricBreakdown(Vendor $vendor): array
    {
        $metrics = PerformanceMetric::active()->ordered()->get();
        $scoresByMetric = PerformanceScore::query()
            ->where('vendor_id', $vendor->id)
            ->whereIn('performance_metric_id', $metrics->pluck('id'))
            ->orderByDesc('period_end')
            ->orderByDesc('id')
            ->get()
            ->groupBy('performance_metric_id');

        $breakdown = [];

        foreach ($metrics as $metric) {
            $metricScores = $scoresByMetric->get($metric->id, collect());
            $latestScore = $metricScores->first();
            $allScores = $metricScores->pluck('score');

            $breakdown[] = [
                'metric_id' => $metric->id,
                // Include the stable metric key for selective frontend localization.
                'metric' => $metric->only(['name', 'display_name']),
                'metric_name' => $metric->display_name,
                'weight' => $metric->weight,
                'current_score' => optional($latestScore)->score,
                'max_score' => $metric->max_score,
                'average_score' => $allScores->isNotEmpty()
                    ? round($allScores->average())
                    : null,
                'score_count' => $allScores->count(),
            ];
        }

        return $breakdown;
    }
}
