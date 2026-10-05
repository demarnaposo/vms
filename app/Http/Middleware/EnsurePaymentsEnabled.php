<?php

namespace App\Http\Middleware;

use App\Support\PaymentsModule;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePaymentsEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        // [VMS_PAYMENTS_DISABLED] External payments: config/features.php gates every role before auth, binding and handlers.
        abort_if(! PaymentsModule::enabled() && PaymentsModule::isPaymentPath($request->decodedPath()), 404);

        return $next($request);
    }
}
