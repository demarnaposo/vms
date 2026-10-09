<?php

namespace App\Http\Controllers;

use App\Http\Requests\Admin\StorePerformanceRatingRequest;
use App\Models\PerformanceMetric;
use App\Models\Vendor;
use App\Services\PerformanceService;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class PerformanceController extends Controller
{
    protected PerformanceService $performanceService;

    public function __construct(PerformanceService $performanceService)
    {
        $this->performanceService = $performanceService;
    }

    /**
     * Show performance dashboard.
     */
    public function index()
    {
        $this->authorize('viewPerformance');

        $vendors = Vendor::whereIn('status', [Vendor::STATUS_ACTIVE, Vendor::STATUS_APPROVED])
            ->select(['id', 'company_name', 'performance_score', 'compliance_status'])
            ->orderBy('performance_score', 'desc')
            ->get();

        $metrics = PerformanceMetric::active()->ordered()->get();

        $topPerformers = $vendors->take(5);
        $lowPerformers = $vendors->sortBy('performance_score')->take(5);

        return Inertia::render('Admin/Performance/Index', [
            'vendors' => $vendors,
            'metrics' => $metrics,
            'topPerformers' => $topPerformers,
            'lowPerformers' => $lowPerformers->values(),
        ]);
    }

    /**
     * Show vendor performance details.
     */
    public function show(Vendor $vendor)
    {
        $this->authorize('viewPerformance');

        $breakdown = $this->performanceService->getMetricBreakdown($vendor);
        $history = $this->performanceService->getVendorHistory($vendor);

        return Inertia::render('Admin/Performance/Show', [
            'vendor' => $vendor,
            'breakdown' => $breakdown,
            'history' => $history,
        ]);
    }

    /**
     * Show form to rate a vendor.
     */
    public function rateForm(Vendor $vendor)
    {
        $this->authorize('ratePerformance');

        $metrics = PerformanceMetric::active()->ordered()->get();

        return Inertia::render('Admin/Performance/Rate', [
            'vendor' => $vendor,
            'metrics' => $metrics,
        ]);
    }

    /**
     * Store performance ratings.
     */
    public function rate(StorePerformanceRatingRequest $request, Vendor $vendor)
    {
        $this->authorize('ratePerformance');

        $this->performanceService->recordRatings($vendor, $request->validated(), Auth::user());

        return redirect()->route('admin.performance.index')
            ->with('success', __('performance.ratings_recorded'));
    }
}
