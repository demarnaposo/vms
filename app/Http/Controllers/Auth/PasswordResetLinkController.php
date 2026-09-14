<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetLinkController extends Controller
{
    /**
     * Display the password reset link request view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/ForgotPassword', [
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming password reset link request.
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        // Block suspended/terminated vendors from resetting password
        $user = User::where('email', $request->email)->first();
        if ($user && $user->isVendor()) {
            $vendor = $user->vendor;
            if ($vendor && in_array($vendor->status, [
                Vendor::STATUS_SUSPENDED,
                Vendor::STATUS_TERMINATED,
            ], true)) {
                return back()->withErrors([
                    // Start Update 12 September 2026, by @WNP: Localize the reset restriction while preserving the vendor status code.
                    'email' => __('alerts.vendor_account_status', ['status' => $vendor->status]),
                ]);
            }
        }

        $status = Password::sendResetLink(
            $request->only('email')
        );

        return $status === Password::RESET_LINK_SENT
            ? back()->with('status', __($status))
            : back()->withErrors(['email' => __($status)]);
    }
}
