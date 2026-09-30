<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Inertia\Inertia;

class DashboardController extends Controller
{
    protected DashboardService $dashboardService;

    public function __construct(DashboardService $dashboardService)
    {
        $this->dashboardService = $dashboardService;
    }

    public function index()
    {
        $this->authorize('viewDashboard');

        $data = $this->dashboardService->adminDashboardData();

        $user = request()->user();
        if (! $user->staffCan('dashboard.summary')) {
            $data['stats'] = array_intersect_key($data['stats'], array_flip([
                ...($user->staffCan('vendors.view') ? ['total_vendors', 'active_vendors', 'pending_review', 'non_compliant'] : []),
                ...($user->staffCan('payments.view') ? ['pending_payments', 'approved_payments'] : []),
            ]));
            $data['pendingVendors'] = $user->staffCan('vendors.view') ? $data['pendingVendors'] : [];
            $data['pendingDocuments'] = $user->staffCan('documents.list') ? $data['pendingDocuments'] : [];
            $data['pendingPayments'] = $user->staffCan('payments.view') ? $data['pendingPayments'] : [];
            $data['recentActivity'] = [];
        }

        return Inertia::render('Admin/Dashboard', [
            'stats' => $data['stats'],
            'pendingVendors' => $data['pendingVendors'],
            'pendingDocuments' => $data['pendingDocuments'],
            'pendingPayments' => $data['pendingPayments'],
            'recentActivity' => $data['recentActivity'],
        ]);
    }
}
