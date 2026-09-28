<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    // Keep the signed-in recipient's language available to notifications sent outside a web request.
    public function handle(Request $request, Closure $next): Response
    {
        $selectedLocale = $request->cookie('vms_locale');
        $supportedLocales = config('app.supported_locales', ['en']);

        $locale = in_array($selectedLocale, $supportedLocales, true) ? $selectedLocale : config('app.locale');
        App::setLocale($locale);

        if (in_array($selectedLocale, $supportedLocales, true)
            && $request->user()
            && $request->user()->preferred_locale !== $locale) {
            $request->user()->update(['preferred_locale' => $locale]);
        }

        return $next($request);
    }
}
