<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PerformanceMetric extends Model
{
    use HasFactory;

    public const MIN_SCORE = 1;

    public const MAX_SCORE = 4;

    protected $attributes = ['max_score' => 4];

    protected $fillable = [
        'name',
        'display_name',
        'description',
        'weight',
        'max_score',
        'is_active',
    ];

    protected $casts = [
        'weight' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    // Metric constants
    const DELIVERY_TIMELINESS = 'delivery_timeliness';

    const ISSUE_FREQUENCY = 'issue_frequency';

    const OPS_RATING = 'ops_rating';

    const CONTRACT_ADHERENCE = 'contract_adherence';

    /**
     * @return HasMany<PerformanceScore, $this>
     */
    public function scores(): HasMany
    {
        return $this->hasMany(PerformanceScore::class);
    }

    public function isBuiltIn(): bool
    {
        $baseline = require database_path('data/system_master_data.php');

        return in_array($this->name, array_merge(array_column($baseline['performance_metrics'] ?? [], 'name'), \App\Services\PerformanceBaselineReplacement::LEGACY), true);
    }

    protected static function booted(): void
    {
        static::updating(function (self $metric): void {
            if ($metric->isDirty('name')) {
                throw \Illuminate\Validation\ValidationException::withMessages(['name' => __('performance.validation.code_immutable')]);
            }
            if ($metric->isDirty('max_score') && $metric->scores()->exists()) {
                throw \Illuminate\Validation\ValidationException::withMessages(['max_score' => __('performance.validation.scale_locked')]);
            }
        });
        static::deleting(function (self $metric): void {
            if ($metric->isBuiltIn() || $metric->scores()->exists()) {
                throw \Illuminate\Validation\ValidationException::withMessages(['metric' => __('performance.validation.metric_in_use')]);
            }
        });
    }

    public function scopeOrdered($query)
    {
        $baseline = require database_path('data/system_master_data.php');
        $codes = array_column($baseline['performance_metrics'], 'name');
        $cases = implode(' ', array_map(fn ($index) => 'WHEN ? THEN '.$index, array_keys($codes)));

        return $query->orderByRaw('CASE name '.$cases.' ELSE '.count($codes).' END', $codes)->orderBy('id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
