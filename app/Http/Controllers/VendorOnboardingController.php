<?php

namespace App\Http\Controllers;

use App\Http\Requests\Vendor\StoreStep1Request;
use App\Http\Requests\Vendor\StoreStep2Request;
use App\Http\Requests\Vendor\StoreStep3Request;
use App\Models\DocumentType;
use App\Models\Vendor;
use App\Models\VendorCategory;
use App\Services\VendorService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class VendorOnboardingController extends Controller
{
    protected $vendorService;

    public function __construct(VendorService $vendorService)
    {
        $this->vendorService = $vendorService;
    }

    /**
     * Show the onboarding wizard.
     */
    public function show(Request $request)
    {
        $user = Auth::user();
        if (! $user instanceof \App\Models\User) {
            abort(403);
        }
        $vendor = $user->vendor;
        $step = (int) $request->query('step', 1);

        // If vendor has already submitted, redirect to dashboard
        if ($vendor && ! in_array($vendor->status, [Vendor::STATUS_DRAFT, Vendor::STATUS_REJECTED])) {
            return redirect()->route('vendor.dashboard');
        }

        $documentTypes = DocumentType::query()->ordered()->get();

        // Get draft application data from DB
        $application = $this->vendorService->getDraftApplication($user);
        $sessionData = $application->data ?? [];
        $vendorCategories = VendorCategory::query()->where('is_active', true)->ordered()->get(['id', 'code', 'display_name', 'description', 'is_active']);
        $selectedId = $sessionData['step1']['category_id'] ?? $vendor?->category_id;
        if ($selectedId && ! $vendorCategories->contains('id', (int) $selectedId)) {
            $selectedCategory = VendorCategory::find($selectedId, ['id', 'code', 'display_name', 'description', 'is_active']);
            if ($selectedCategory) {
                $vendorCategories->push($selectedCategory);
            }
        }

        // Logic: current_step in DB is the max step reached.
        if ($step > $application->current_step && $step > 1) {
            return redirect()->route('vendor.onboarding', ['step' => $application->current_step]);
        }

        if ($step === 4) {
            try {
                app(\App\Services\DraftDocumentValidator::class)->validate($application);
            } catch (\Illuminate\Validation\ValidationException $exception) {
                return redirect()->route('vendor.onboarding', ['step' => 3])->withErrors($exception->errors());
            }
        }

        return Inertia::render('Vendor/Onboarding/Wizard', [
            'currentStep' => (int) $step,
            'vendor' => $vendor,
            'documentTypes' => $documentTypes,
            'sessionData' => $sessionData,
            'vendorCategories' => $vendorCategories,
            'businessTypes' => app(\App\Services\BusinessTypeService::class)->options($sessionData['step1']['business_type'] ?? $vendor?->business_type),
        ]);
    }

    /**
     * Save Step 1 data to draft.
     */
    public function storeStep1(StoreStep1Request $request)
    {
        $validated = $request->validated();

        $this->vendorService->storeOnboardingStep1($validated);

        return redirect()->route('vendor.onboarding', ['step' => 2]);
    }

    /**
     * Save Step 2 data to draft.
     */
    public function storeStep2(StoreStep2Request $request)
    {
        $validated = $request->validated();

        // Validation check
        $application = $this->vendorService->getDraftApplication(Auth::user());
        $data = $application->data ?? [];

        if (empty($data['step1'])) {
            return redirect()->route('vendor.onboarding', ['step' => 1])
                ->withErrors(['step' => 'Please complete Step 1 first.']);
        }

        $this->vendorService->storeOnboardingStep2($validated);

        return redirect()->route('vendor.onboarding', ['step' => 3]);
    }

    /**
     * Save Step 3 documents to temp storage (draft).
     */
    public function storeStep3(StoreStep3Request $request)
    {
        $application = $this->vendorService->getDraftApplication(Auth::user());
        $data = $application->data ?? [];

        // Check if previous steps are complete
        if (empty($data['step1']) || empty($data['step2'])) {
            return redirect()->route('vendor.onboarding', ['step' => 1])
                ->withErrors(['step' => 'Please complete previous steps first.']);
        }

        $incomingDocuments = $request->validated('documents', []);
        if (! is_array($incomingDocuments)) {
            $incomingDocuments = [];
        }
        $requireComplete = $request->validated('intent', 'continue') !== 'autosave';
        try {
            $this->vendorService->storeOnboardingStep3($incomingDocuments, $request->validated('removed_document_type_ids', []), $requireComplete, $request->validated('expiry_dates', []));
        } catch (\Illuminate\Validation\ValidationException $exception) {
            throw $exception;
        } catch (\Throwable $exception) {
            \Illuminate\Support\Facades\Log::warning('Onboarding document storage failed', ['user_id' => $request->user()->id]);

            return redirect()->route('vendor.onboarding', ['step' => 3])->withErrors(['documents' => __('alerts.onboarding_document_save_failed')]);
        }

        $response = redirect()->route('vendor.onboarding', ['step' => $requireComplete ? 4 : 3]);

        if ($requireComplete) {
            return $response;
        }
        $message = ! empty($incomingDocuments) ? 'onboarding_document_uploaded'
            : ($request->validated('removed_document_type_ids', []) !== [] ? 'onboarding_document_removed' : 'onboarding_document_expiry_updated');

        return $response->with('success', __('alerts.'.$message));
    }

    /**
     * View a temporary onboarding document.
     */
    public function viewDocument($typeId)
    {
        $user = Auth::user();
        $application = $this->vendorService->getDraftApplication($user);

        $data = $application->data ?? [];
        $documents = $data['step3']['documents'] ?? [];

        // Path is now: vendor-applications/{id}/temp/filename
        $expectedPrefix = 'vendor-applications/'.$application->id.'/';

        foreach ($documents as $doc) {
            if ($doc['document_type_id'] == $typeId) {
                $path = $doc['file_path'];
                if (
                    is_string($path)
                    && str_starts_with($path, $expectedPrefix)
                    && Storage::disk('private')->exists($path)
                ) {
                    return Storage::disk('private')->response($path, $doc['file_name']);
                }
            }
        }

        abort(404);
    }

    /**
     * Submit the complete vendor application (saves ALL data to database).
     */
    public function submit(Request $request)
    {
        $user = Auth::user();
        $application = $this->vendorService->getDraftApplication($user);
        $data = $application->data ?? [];

        // Validate all steps are complete
        if (empty($data['step1']) || empty($data['step2'])) {
            return redirect()->route('vendor.onboarding', ['step' => 1])
                ->withErrors(['step' => 'Please complete all steps before submitting.']);
        }

        try {
            $this->vendorService->submitApplication($user);

            return redirect()->route('vendor.dashboard')->with('success', 'Application submitted successfully!');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return redirect()->route('vendor.onboarding', ['step' => array_intersect(array_keys($e->errors()), array_keys((new StoreStep1Request)->rules())) !== [] ? 1 : (array_intersect(array_keys($e->errors()), array_keys((new StoreStep2Request)->rules())) !== [] ? 2 : 3)])->withErrors($e->errors());
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Application submission failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return back()->withErrors(['error' => 'Failed to submit application. Please try again or contact support.']);
        }
    }
}
