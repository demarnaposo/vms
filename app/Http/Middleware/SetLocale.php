<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    // Start Update 11 September 2026, by @WNP: Apply only supported language cookies to every web request.
    public function handle(Request $request, Closure $next): Response
    {
        $locale = (string) $request->cookie('vms_locale', config('app.locale'));
        $supportedLocales = config('app.supported_locales', ['en']);

        App::setLocale(in_array($locale, $supportedLocales, true) ? $locale : config('app.locale'));

        return $next($request);
    }
}
