<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        /** @var \App\Models\User $user */
        $user = $request->user();

        // Guard vendor access for restricted lifecycle states.
        if ($user->isVendor()) {
            $vendor = $user->vendor;
            $error = match (true) {
                $vendor?->blocksUserAccess() => __('alerts.vendor_account_status', ['status' => $vendor->status]),
                ! $user->is_active => __('alerts.user_account_inactive'),
                default => null,
            };

            if ($error !== null) {
                HandleInertiaRequests::clearAuthCache($user->id);
                Auth::guard('web')->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return back()->withErrors([
                    'email' => $error,
                ])->onlyInput('email');
            }
        }

        HandleInertiaRequests::clearAuthCache($user->id);
        $request->session()->regenerate();

        if ($user->isVendor() && ! $user->hasVerifiedEmail()) {
            RateLimiter::attempt(
                "vendor-verification-login:{$user->id}",
                1,
                fn () => $user->sendEmailVerificationNotification(),
                300
            );

            return redirect()->intended(route('verification.notice'));
        }

        return redirect()->intended(route('dashboard'));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        /** @var \App\Models\User|null $user */
        $user = $request->user();
        if ($user) {
            HandleInertiaRequests::clearAuthCache($user->id);
        }

        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }
}
