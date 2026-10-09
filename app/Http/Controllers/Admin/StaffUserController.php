<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveStaffUserRequest;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\RbacService;
use App\Support\PaymentsModule;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class StaffUserController extends Controller
{
    public function index(): Response
    {
        abort_unless(request()->user()?->isSuperAdmin(), 403);
        $roles = Role::where('guard_name', 'web')->where('is_staff', true)->with('permissions')->withCount('users')->orderBy('id')->get();

        $paymentsEnabled = PaymentsModule::enabled();
        $visiblePermission = fn (Permission $permission) => $paymentsEnabled || ! PaymentsModule::isPaymentPermission($permission->name, $permission->group);

        return Inertia::render('Admin/Staff/Index', [
            'staffUsers' => User::whereHas('roles', fn ($q) => $q->where('is_staff', true)->where('guard_name', 'web'))
                ->with('roles')->select('id', 'name', 'email', 'created_at')->latest()->get()->map(fn (User $user) => $this->present($user)),
            'availableRoles' => $roles->map(fn (Role $role) => ['id' => $role->id, 'value' => $role->name, 'label' => $role->display_name]),
            'staffRoles' => $roles->filter(fn (Role $role) => $paymentsEnabled || $role->name !== Role::FINANCE_MANAGER)->values()->map(fn (Role $role) => [
                ...$role->only(['id', 'name', 'display_name', 'description']), 'users_count' => $role->users_count,
                'protected' => in_array($role->name, Role::builtInNames(), true),
                'permission_ids' => $role->permissions->filter($visiblePermission)->whereIn('name', array_keys(config('rbac.permissions')))->pluck('id')->values(),
                'legacy_permissions' => $role->permissions->filter($visiblePermission)->whereNotIn('name', array_keys(config('rbac.permissions')))->pluck('name')->values(),
            ]),
            'permissions' => Permission::where('guard_name', 'web')->orderBy('group')->orderBy('name')->get()->filter($visiblePermission)->values()->map(fn (Permission $permission) => [
                ...$permission->only(['id', 'name', 'display_name', 'group']),
                'operational' => array_key_exists($permission->name, config('rbac.permissions')),
                'usage' => config('rbac.permissions')[$permission->name]['usage'] ?? null,
            ]),
            'legacyRoles' => Role::where('guard_name', 'web')->where('is_staff', false)->where('name', '!=', Role::VENDOR)->get(['id', 'name', 'display_name']),
        ]);
    }

    private function present(User $user): array
    {
        return [
            ...$user->only(['id', 'name', 'email', 'created_at']),
            'roles' => $user->roles->pluck('name')->values(), 'role_ids' => $user->roles->pluck('id')->values(),
            'role_labels' => $user->roles->pluck('display_name')->values(),
            'role_items' => $user->roles->map->only(['name', 'display_name'])->values(),
            'manageable' => ! $user->isVendor(),
        ];
    }

    public function show(User $staffUser): Response
    {
        abort_unless(request()->user()?->isSuperAdmin() && $staffUser->isStaff() && ! $staffUser->isVendor(), 404);

        return Inertia::render('Admin/Staff/Show', ['staffUser' => $this->present($staffUser->load('roles'))]);
    }

    public function store(SaveStaffUserRequest $request, RbacService $service): RedirectResponse
    {
        $service->saveUser($request->validated());

        return back()->with('success', __('alerts.rbac_user_saved'));
    }

    public function update(SaveStaffUserRequest $request, User $staffUser, RbacService $service): RedirectResponse
    {
        $service->saveUser($request->validated(), $staffUser);

        return back()->with('success', __($request->filled('password') ? 'alerts.rbac_user_password_updated' : 'alerts.rbac_user_updated'));
    }

    public function destroy(User $staffUser, RbacService $service): RedirectResponse
    {
        $service->deleteUser($staffUser);

        return back()->with('success', __('alerts.rbac_user_deleted'));
    }
}
