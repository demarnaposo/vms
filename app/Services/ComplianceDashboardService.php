<?php

namespace App\Services;

use App\Models\ComplianceResult;
use App\Models\ComplianceRule;
use App\Models\Vendor;

class ComplianceDashboardService
{
    /**
     * @return array<string, mixed>
     */
    public function dashboardData(): array
    {
        $statusCounts = Vendor::query()
            ->whereIn('compliance_status', [
                Vendor::COMPLIANCE_COMPLIANT,
                Vendor::COMPLIANCE_AT_RISK,
                Vendor::COMPLIANCE_NON_COMPLIANT,
                Vendor::COMPLIANCE_BLOCKED,
            ])
            ->selectRaw('compliance_status, COUNT(*) as count')
            ->groupBy('compliance_status')
            ->pluck('count', 'compliance_status');

        $stats = [
            'compliant' => (int) ($statusCounts[Vendor::COMPLIANCE_COMPLIANT] ?? 0),
            'at_risk' => (int) ($statusCounts[Vendor::COMPLIANCE_AT_RISK] ?? 0),
            'non_compliant' => (int) ($statusCounts[Vendor::COMPLIANCE_NON_COMPLIANT] ?? 0),
            'blocked' => (int) ($statusCounts[Vendor::COMPLIANCE_BLOCKED] ?? 0),
        ];

        $atRiskVendors = Vendor::whereIn('compliance_status', [
            Vendor::COMPLIANCE_AT_RISK,
            Vendor::COMPLIANCE_NON_COMPLIANT,
            Vendor::COMPLIANCE_BLOCKED,
        ])
            ->select(['id', 'company_name', 'compliance_status', 'compliance_score', 'user_id'])
            ->with('user:id,name,email')
            ->orderBy('compliance_score', 'asc')
            ->take(10)
            ->get();

        $recentResults = ComplianceResult::with(['vendor', 'rule'])
            ->whereIn('id', ComplianceResult::latestResultIdsQuery())
            ->where('status', ComplianceResult::STATUS_FAIL)
            ->orderByDesc('evaluated_at')
            ->take(10)
            ->get();

        $rules = ComplianceRule::withCount([
            'results as failures_count' => fn ($q) => $q
                ->whereIn('compliance_results.id', ComplianceResult::latestResultIdsQuery())
                ->where('status', ComplianceResult::STATUS_FAIL),
        ])->get();

        return [
            'stats' => $stats,
            'atRiskVendors' => $atRiskVendors,
            'recentResults' => $recentResults,
            'rules' => $rules,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function vendorDetailData(Vendor $vendor): array
    {
        $results = ComplianceResult::with('rule')
            ->where('vendor_id', $vendor->id)
            ->whereIn('id', ComplianceResult::latestResultIdsQuery($vendor->id))
            ->orderByDesc('evaluated_at')
            ->get();

        $grouped = $results->groupBy('status');

        return [
            'vendor' => $vendor->load('user:id,name,email'),
            'results' => $results,
            'summary' => [
                'passing' => $grouped->get(ComplianceResult::STATUS_PASS, collect())->count(),
                'failing' => $grouped->get(ComplianceResult::STATUS_FAIL, collect())->count(),
                'warnings' => $grouped->get(ComplianceResult::STATUS_WARNING, collect())->count(),
            ],
        ];
    }
}
