<?php

namespace App\Services;

use App\Http\Requests\Admin\SavePerformanceConfigurationRequest;
use App\Http\Requests\Admin\SavePerformanceMetricRequest;
use App\Models\AuditLog;
use App\Models\PerformanceMetric;
use App\Models\Role;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class PerformanceMetricService
{
    public static function locked(callable $action): mixed
    {
        return DB::transaction(function () use ($action) {
            // A protected row serializes empty catalogues, configuration writes and evaluation writes.
            $adminRole = DB::table('roles')->where('name', Role::SUPER_ADMIN);
            if (Schema::hasColumn('roles', 'guard_name')) {
                $adminRole->where('guard_name', 'web');
            }
            $adminRole->lockForUpdate()->firstOrFail();
            PerformanceMetric::orderBy('id')->lockForUpdate()->get();

            return $action();
        }, 3);
    }

    public static function units(mixed $weight): int
    {
        if (! preg_match('/^\d{1,3}(?:\.\d{1,2})?$/', (string) $weight)) {
            throw ValidationException::withMessages(['configuration' => __('performance.validation.precision')]);
        }
        [$whole, $fraction] = array_pad(explode('.', (string) $weight), 2, '');

        return (int) $whole * 100 + (int) str_pad($fraction, 2, '0');
    }

    public static function assertTotal(iterable $metrics): void
    {
        $total = 0;
        foreach ($metrics as $metric) {
            if ($metric['is_active'] && ! ($metric['deleted'] ?? false)) {
                $total += self::units($metric['weight']);
                if ((int) $metric['max_score'] !== 4) {
                    throw ValidationException::withMessages(['configuration' => __('performance.validation.maximum_four')]);
                }
            }
        }
        if ($total !== 10000) {
            throw ValidationException::withMessages(['configuration' => __('performance.validation.total', ['total' => number_format($total / 100, 2, '.', '')])]);
        }
    }

    public static function version(): string
    {
        return hash('sha256', PerformanceMetric::orderBy('id')->get()->toJson());
    }

    public function saveConfiguration(array $data, User $actor): void
    {
        abort_unless($actor->isSuperAdmin(), 403);
        self::locked(function () use ($data, $actor): void {
            $request = new SavePerformanceConfigurationRequest;
            $data = Validator::make($data, $request->rules(), [], $request->attributes())->validate();
            if (! hash_equals(self::version(), $data['version'])) {
                throw ValidationException::withMessages(['configuration' => __('performance.validation.stale')]);
            }
            $existing = PerformanceMetric::all()->keyBy('id');
            $ids = collect($data['metrics'])->pluck('id')->filter()->map(fn ($id) => (int) $id)->sort()->values()->all();
            if ($ids !== $existing->keys()->sort()->values()->all()) {
                throw ValidationException::withMessages(['configuration' => __('performance.validation.stale')]);
            }
            // Validate every row and the final total before any model or audit is written.
            foreach ($data['metrics'] as $index => $row) {
                $metric = isset($row['id']) ? $existing->get($row['id']) : null;
                if ($metric && $row['name'] !== $metric->name) {
                    throw ValidationException::withMessages(["metrics.$index.name" => __('performance.validation.code_immutable')]);
                }
                if (! $metric && PerformanceMetric::where('name', $row['name'])->exists()) {
                    throw ValidationException::withMessages(["metrics.$index.name" => __('validation.unique', ['attribute' => __('performance.fields.name')])]);
                }
                if ($row['deleted'] && $metric && $this->protected($metric)) {
                    throw ValidationException::withMessages(["metrics.$index.deleted" => __('performance.validation.metric_in_use')]);
                }
                // Archived scales remain readable. New metrics and every active metric use four.
                $archived = $metric && ! $row['is_active'] && (int) $row['max_score'] === (int) $metric->max_score;
                if (! $archived && (int) $row['max_score'] !== 4) {
                    throw ValidationException::withMessages(["metrics.$index.max_score" => __('performance.validation.maximum_four')]);
                }
                if ($metric && (int) $metric->max_score !== (int) $row['max_score'] && $metric->scores()->exists()) {
                    throw ValidationException::withMessages(["metrics.$index.max_score" => __('performance.validation.scale_locked')]);
                }
            }
            self::assertTotal($data['metrics']);
            $recalculate = false;
            foreach ($data['metrics'] as $row) {
                $metric = isset($row['id']) ? $existing->get($row['id']) : new PerformanceMetric;
                if ($row['deleted']) {
                    if ($metric->exists) {
                        $this->remove($metric);
                        $recalculate = true;
                    }

                    continue;
                }
                $old = $metric->exists ? $metric->getAttributes() : null;
                $metric->fill(collect($row)->except(['id', 'deleted'])->all());
                if (! $metric->isDirty()) {
                    continue;
                }
                $recalculate = $recalculate || ! $metric->exists || $metric->isDirty(['weight', 'max_score', 'is_active']);
                $this->persist($metric, $old);
            }
            if ($recalculate) {
                $this->refreshVendorScores($actor);
            }
        });
    }

    public function save(array $data, User $actor, ?PerformanceMetric $target = null): PerformanceMetric
    {
        abort_unless($actor->isSuperAdmin(), 403);

        return self::locked(function () use ($data, $actor, $target) {
            $metric = $target ? PerformanceMetric::findOrFail($target->id) : new PerformanceMetric;
            $request = new SavePerformanceMetricRequest;
            $data = Validator::make($data, $request->metricRules($target ? $metric : null), $request->messages(), $request->attributes())->validate();
            $old = $metric->exists ? $metric->getAttributes() : null;
            $metric->fill($data);
            $projected = PerformanceMetric::where('id', '!=', $metric->id ?? 0)->get()->toArray();
            $projected[] = $metric->toArray();
            self::assertTotal($projected);
            $recalculate = ! $metric->exists || $metric->isDirty(['weight', 'max_score', 'is_active']);
            $this->persist($metric, $old);
            if ($recalculate) {
                $this->refreshVendorScores($actor);
            }

            return $metric;
        });
    }

    public function protected(PerformanceMetric $metric, ?iterable $history = null): bool
    {
        if ($metric->isBuiltIn() || (isset($metric->scores_count) ? $metric->scores_count > 0 : $metric->scores()->exists())) {
            return true;
        }
        foreach ($history ?? DB::table('score_history')->select('metadata')->cursor() as $entry) {
            if (PerformanceBaselineReplacement::references(json_decode($entry->metadata ?? 'null', true), $metric)) {
                return true;
            }
        }

        return false;
    }

    public function delete(PerformanceMetric $target, User $actor): void
    {
        abort_unless($actor->isSuperAdmin(), 403);
        self::locked(function () use ($target, $actor): void {
            $metric = PerformanceMetric::findOrFail($target->id);
            if ($this->protected($metric)) {
                throw ValidationException::withMessages(['metric' => __('performance.validation.metric_in_use')]);
            }
            self::assertTotal(PerformanceMetric::where('id', '!=', $metric->id)->get()->toArray());
            $this->remove($metric);
            $this->refreshVendorScores($actor);
        });
    }

    private function persist(PerformanceMetric $metric, ?array $old): void
    {
        $created = ! $metric->exists;
        $metric->save();
        AuditLog::log($created ? AuditLog::EVENT_CREATED : AuditLog::EVENT_UPDATED, $metric, $old,
            $metric->only(['name', 'display_name', 'description', 'weight', 'max_score', 'is_active']), 'Performance metric '.($created ? 'created' : 'updated'));
    }

    private function remove(PerformanceMetric $metric): void
    {
        AuditLog::log(AuditLog::EVENT_DELETED, $metric, $metric->getAttributes(), null, 'Unused performance metric deleted');
        $metric->delete();
    }

    private function refreshVendorScores(User $actor): void
    {
        Vendor::withTrashed()->orderBy('id')->chunkById(100, function ($vendors) use ($actor): void {
            foreach ($vendors as $vendor) {
                app(PerformanceService::class)->recalculateVendorScore($vendor, $actor, ['source' => 'metric_configuration']);
            }
        });
    }
}
