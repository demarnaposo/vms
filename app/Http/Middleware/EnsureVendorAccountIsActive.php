<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureVendorAccountIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user->isVendor()) {
            return $next($request);
        }

        $vendor = $user->vendor;
        $error = match (true) {
            $vendor?->blocksUserAccess() => __('alerts.vendor_account_status', ['status' => __('alerts.actions.'.$vendor->status)]),
            ! $user->is_active => __('alerts.user_account_inactive'),
            default => null,
        };

        if ($error === null) {
            return $next($request);
        }

        HandleInertiaRequests::clearAuthCache($user->id);
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login')->withErrors(['email' => $error]);
    }
}
