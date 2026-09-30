<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;

class DashboardRedirectController extends Controller
{
    public function __invoke(): RedirectResponse
    {
        /** @var \App\Models\User $user */
        $user = auth()->user();

        if ($user->isStaff()) {
            foreach (['dashboard.view' => 'admin.dashboard', 'vendors.view' => 'admin.vendors.index', 'documents.list' => 'admin.documents.index', 'payments.view' => 'admin.payments.index', 'compliance.access' => 'admin.compliance.dashboard', 'performance.view' => 'admin.performance.index', 'reports.view' => 'admin.reports.index', 'system.health' => 'admin.system-health.index', 'messages.manage' => 'admin.contact-messages.index', 'notifications.send' => 'admin.notifications.send'] as $permission => $route) {
                if ($user->staffCan($permission)) {
                    return redirect()->route($route);
                }
            }
            abort(403);

        }

        abort_unless($user->isVendor(), 403);

        return redirect()->route('vendor.dashboard');
    }
}
