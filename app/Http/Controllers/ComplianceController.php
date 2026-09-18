<?php

namespace App\Http\Controllers;

use App\Http\Requests\Admin\UpdateComplianceRuleRequest;
use App\Models\ComplianceRule;
use App\Models\Vendor;
use App\Services\ComplianceDashboardService;
use App\Services\ComplianceService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class ComplianceController extends Controller
{
    protected ComplianceService $complianceService;

    protected ComplianceDashboardService $dashboardService;

    public function __construct(ComplianceService $complianceService, ComplianceDashboardService $dashboardService)
    {
        $this->complianceService = $complianceService;
        $this->dashboardService = $dashboardService;
    }

    /**
     * Display compliance dashboard.
     */
    public function dashboard()
    {
        $this->authorize('viewCompliance');

        $data = $this->dashboardService->dashboardData();

        return Inertia::render('Admin/Compliance/Dashboard', [
            'stats' => $data['stats'],
            'atRiskVendors' => $data['atRiskVendors'],
            'recentResults' => $data['recentResults'],
            'rules' => $data['rules'],
        ]);
    }

    /**
     * Show compliance details for a vendor.
     */
    public function vendorCompliance(Vendor $vendor)
    {
        $this->authorize('viewCompliance');

        $data = $this->dashboardService->vendorDetailData($vendor);

        return Inertia::render('Admin/Compliance/VendorDetail', [
            'vendor' => $data['vendor'],
            'results' => $data['results'],
            'summary' => $data['summary'],
        ]);
    }

    /**
     * Run compliance evaluation for a vendor.
     */
    public function evaluate(Vendor $vendor): RedirectResponse
    {
        $this->authorize('runCompliance');

        try {
            $result = $this->complianceService->evaluateVendor($vendor);

            // Start Update 13 September 2026, by @WNP: Localize the system status label in the alert without changing the stored status code.
            return back()->with('success', __('compliance.evaluated', [
                'score' => $result['score'],
                'status' => __('compliance.statuses.'.$result['status']),
            ]));
        } catch (\Throwable $e) {
            // Start Update 16 September 2026, by @WNP: Keep evaluation failures on the vendor page with visible feedback.
            Log::error('Compliance evaluation failed', [
                'vendor_id' => $vendor->id,
                'error' => $e->getMessage(),
            ]);

            return back()->with('error', __('compliance.evaluation_failed'));
        }
    }

    /**
     * Run compliance evaluation for all vendors.
     */
    public function evaluateAll()
    {
        $this->authorize('runCompliance');

        $results = $this->complianceService->evaluateAllVendors();

        // Start Update 12 September 2026, by @WNP: Localize the bulk evaluation alert using the active request locale.
        return back()->with('success', __('compliance.evaluation_completed', [
            'count' => count($results),
        ]));
    }

    /**
     * Manage compliance rules.
     */
    public function rules()
    {
        $this->authorize('viewCompliance');

        $rules = ComplianceRule::all();

        return Inertia::render('Admin/Compliance/Rules', [
            'rules' => $rules,
        ]);
    }

    /**
     * Update a compliance rule.
     */
    public function updateRule(UpdateComplianceRuleRequest $request, ComplianceRule $rule)
    {
        $this->authorize('manageComplianceRules');

        $validated = $request->validated();

        $rule->update($validated);

        return back()->with('success', 'Rule updated successfully.');
    }
}
