<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveStaffRoleRequest;
use App\Models\Role;
use App\Services\RbacService;
use Illuminate\Http\RedirectResponse;

class StaffRoleController extends Controller
{
    public function store(SaveStaffRoleRequest $request, RbacService $service): RedirectResponse
    {
        $service->saveRole($request->validated());

        return back()->with('success', __('alerts.rbac_role_saved'));
    }

    public function update(SaveStaffRoleRequest $request, Role $staffRole, RbacService $service): RedirectResponse
    {
        $service->saveRole($request->validated(), $staffRole);

        return back()->with('success', __('alerts.rbac_role_saved'));
    }

    public function destroy(Role $staffRole, RbacService $service): RedirectResponse
    {
        $service->deleteRole($staffRole);

        return back()->with('success', __('alerts.rbac_role_deleted'));
    }
}
