<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class StaffPermissionMiddleware
{
    public function handle(Request $request, Closure $next, ?string $permission = null): Response
    {
        $user = $request->user();
        abort_unless($user && $user->isStaff() && (! $permission || $user->staffCan($permission)), 403);

        return $next($request);
    }
}
