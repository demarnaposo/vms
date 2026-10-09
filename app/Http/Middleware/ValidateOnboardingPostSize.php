<?php

namespace App\Http\Middleware;

use App\Models\DocumentType;
use Closure;
use Illuminate\Http\Middleware\ValidatePostSize;
use Illuminate\Validation\ValidationException;

class ValidateOnboardingPostSize extends ValidatePostSize
{
    public function handle($request, Closure $next)
    {
        if (! $request->isMethod('POST') || ! $request->is('vendor/onboarding/step3')) {
            return parent::handle($request, $next);
        }

        // Defer this endpoint's global size check until session, locale and authorization are available.
        if (! $request->route()) {
            return $next($request);
        }

        $max = $this->getPostMaxSize();
        if ($max > 0 && $request->server('CONTENT_LENGTH') > $max) {
            $id = $request->header('X-Onboarding-Document-Type');
            $type = is_string($id) && ctype_digit($id) ? DocumentType::active()->find($id) : null;
            $key = $type ? 'documents_by_type.'.$type->id : 'documents';
            throw ValidationException::withMessages([
                $key => __('alerts.onboarding_upload_too_large', ['max' => round($max / 1048576, 2)]),
            ]);
        }

        return $next($request);
    }
}
