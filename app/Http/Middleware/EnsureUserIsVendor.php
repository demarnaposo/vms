<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsVendor
{
    public function handle(Request $request, Closure $next): Response
    {
        // Onboarding requires the vendor role even when staff have global role bypasses.
        abort_unless($request->user()?->isVendor(), 403, 'Unauthorized access.');

        return $next($request);
    }
}
