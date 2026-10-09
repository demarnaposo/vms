<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SavePerformanceMetricRequest;
use App\Models\PerformanceMetric;
use App\Services\PerformanceMetricService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PerformanceMetricController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()?->isSuperAdmin(), 403);

        return PerformanceMetricService::locked(function () use ($request): Response {
            $filters = $request->validate(['search' => ['nullable', 'string', 'max:255']]);
            $search = trim($filters['search'] ?? '');
            $history = \Illuminate\Support\Facades\DB::table('score_history')->select('metadata')->get();
            $configuration = PerformanceMetric::withCount('scores')->ordered()->get()->map(fn ($metric) => [
                ...$metric->toArray(), 'protected' => $metric->isBuiltIn(), 'referenced' => app(PerformanceMetricService::class)->protected($metric, $history),
            ]);
            $baselineByName = collect((require database_path('data/system_master_data.php'))['performance_metrics'])->keyBy('name');
            $matches = [];
            if ($search !== '') {
                foreach ($configuration as $metric) {
                    $source = $metric['display_name'].' '.$metric['description'];
                    $baseline = $baselineByName->get($metric['name']);
                    $translated = '';
                    foreach (['display_name' => 'name', 'description' => 'description'] as $field => $key) {
                        if ($baseline && $metric[$field] === $baseline[$field]) {
                            $translated .= ' '.__('performance.baseline.'.$metric['name'].'.'.$key);
                        }
                    }
                    if (mb_stripos($source, $search) !== false || mb_stripos($translated, $search) !== false) {
                        $matches[] = $metric['id'];
                    }
                }
            }
            $metrics = PerformanceMetric::withCount('scores')->ordered()
                ->when($search !== '', fn ($query) => $query->whereIn('id', $matches))->paginate(10)->withQueryString();
            $metrics->through(fn ($metric) => [...$metric->toArray(), 'protected' => $metric->isBuiltIn(), 'referenced' => app(PerformanceMetricService::class)->protected($metric, $history)]);

            return Inertia::render('Admin/PerformanceMetrics/Index', [
                'metrics' => $metrics, 'configuration' => $configuration, 'version' => PerformanceMetricService::version(),
                'filters' => ['search' => $search],
            ]);
        });
    }

    public function configuration(\App\Http\Requests\Admin\SavePerformanceConfigurationRequest $request, PerformanceMetricService $service): RedirectResponse
    {
        $service->saveConfiguration($request->validated(), $request->user());

        return back()->with('success', __('performance.configuration_updated'));
    }

    public function store(SavePerformanceMetricRequest $request, PerformanceMetricService $service): RedirectResponse
    {
        $service->save($request->validated(), $request->user());

        return back()->with('success', __('performance.metric_created'));
    }

    public function update(SavePerformanceMetricRequest $request, PerformanceMetric $performanceMetric, PerformanceMetricService $service): RedirectResponse
    {
        $service->save($request->validated(), $request->user(), $performanceMetric);

        return back()->with('success', __('performance.metric_updated'));
    }

    public function destroy(Request $request, PerformanceMetric $performanceMetric, PerformanceMetricService $service): RedirectResponse
    {
        $service->delete($performanceMetric, $request->user());

        return back()->with('success', __('performance.metric_deleted'));
    }
}
