<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Role;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'string', Rules\Password::defaults()],
            'password_confirmation' => ['required', 'string', 'same:password'],
            'role' => 'nullable|in:vendor',
        ], [
            'password_confirmation.same' => __('validation.confirmed', ['attribute' => app()->getLocale() === 'id' ? __('validation.attributes.password') : 'password']),
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'preferred_locale' => app()->getLocale(),
        ]);

        // Public registration is restricted to vendor role only.
        $roleName = Role::VENDOR;
        $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web'], ['display_name' => 'Vendor']);
        $user->assignRole($role);
        HandleInertiaRequests::clearAuthCache($user->id);

        event(new Registered($user));

        // Refresh user to ensure relations are loaded if needed (though authenticatable usually reloads)
        $user = $user->fresh();

        Auth::login($user);

        return redirect()->route('verification.notice');
    }
}
