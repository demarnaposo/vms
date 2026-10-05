<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    public function handle(Request $request, \Closure $next)
    {
        $request->user()?->unsetRelation('roles');
        $request->user()?->unsetRelation('permissions');

        return parent::handle($request, $next);
    }

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $hasFlash = $request->session()->has('success')
            || $request->session()->has('error')
            || $request->session()->has('status');

        // Use lazy evaluation to prevent unnecessary queries
        return [
            ...parent::share($request),
            'features' => ['payments' => ['enabled' => \App\Support\PaymentsModule::enabled()]],
            'auth' => fn () => $this->getAuthData($user),
            // Share the centralized currency settings with every Inertia page.
            'currency' => fn () => config('currency'),
            'flash' => [
                'id' => $hasFlash ? (string) Str::uuid() : null,
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'status' => fn () => $request->session()->get('status'),
            ],
        ];
    }

    /**
     * Get auth data with caching to prevent repeated queries.
     */
    protected function getAuthData($user): array
    {
        if (! $user) {
            return [
                'user' => null,
                'roles' => [],
                'permissions' => [],
                'can' => [],
            ];
        }

        $user->unsetRelation('roles');
        $user->unsetRelation('permissions');
        $user->load('roles.permissions');
        $can = [];
        foreach (array_keys(config('rbac.permissions')) as $permission) {
            $can[substr($permission, 6)] = $user->staffCan($permission);
        }
        $can['approve_vendors'] = $can['vendors.approve'];
        $can['reject_vendors'] = $can['vendors.reject'];
        $can['activate_vendors'] = $can['vendors.activate'];
        $can['suspend_vendors'] = $can['vendors.suspend'];
        $can['terminate_vendors'] = $can['vendors.terminate'];
        $can['edit_vendor_notes'] = $can['vendors.notes'];
        $can['verify_documents'] = $can['documents.verify'];
        $can['reject_documents'] = $can['documents.reject'];
        $can['validate_payments'] = $can['payments.validate'];
        $can['approve_payments'] = $can['payments.approve'];
        $can['mark_paid'] = $can['payments.disburse'];
        $can['rate_vendors'] = $can['performance.rate'];
        $can['run_compliance'] = $can['compliance.evaluate'];
        $can['view_messages'] = $can['messages.manage'];
        $can['send_notifications'] = $can['notifications.send'];
        $can['view_reports'] = $can['reports.view'];
        $can['is_staff'] = $user->isStaff();
        $can['view_audit'] = $user->isSuperAdmin();
        $can['edit_rules'] = $user->isSuperAdmin();
        $can['audit.view'] = $user->isSuperAdmin();
        $can['compliance.view'] = $can['compliance.access'];

        return [
            'user' => $user->only(['id', 'name', 'email', 'phone']),
            'roles' => $user->roles->pluck('name')->values()->all(),
            'role_items' => $user->roles->map->only(['name', 'display_name'])->values()->all(),
            'permissions' => $user->getAllPermissions()->pluck('name')->values()->all(),
            'can' => $can,
        ];
    }

    /**
     * Clear auth cache when user logs out or permissions change.
     */
    public static function clearAuthCache($userId): void
    {
        Cache::forget("user_{$userId}_auth_data_v2");
    }
}
