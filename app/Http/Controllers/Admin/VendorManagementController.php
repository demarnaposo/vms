<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ComplianceResult;
use App\Models\DocumentType;
use App\Models\User;
use App\Models\Vendor;
use App\Services\VendorLifecycleService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class VendorManagementController extends Controller
{
    public function __construct(protected VendorLifecycleService $lifecycleService) {}

    public function index(Request $request): Response
    {
        $status = (string) $request->query('status', 'all');
        $search = (string) $request->query('search', '');

        $query = Vendor::select([
            'id',
            'company_name',
            'contact_person',
            'contact_email',
            'status',
            'performance_score',
            'compliance_status',
            'created_at',
        ])->latest();

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        if ($search !== '') {
            $escapedSearch = str_replace(['%', '_'], ['\\%', '\\_'], $search);
            $query->where(function ($q) use ($escapedSearch) {
                $q->where('company_name', 'like', "%{$escapedSearch}%")
                    ->orWhere('contact_person', 'like', "%{$escapedSearch}%")
                    ->orWhere('contact_email', 'like', "%{$escapedSearch}%");
            });
        }

        $vendors = $query->paginate(15);

        return Inertia::render('Admin/Vendors/Index', [
            'vendors' => $vendors,
            'currentStatus' => $status,
            'search' => $search,
        ]);
    }

    public function show(Vendor $vendor): Response
    {
        $this->authorize('view', $vendor);

        // Start Update 16 September 2026, by @WNP: Explicitly expose Indonesian tax and bank identifiers on the authorized staff summary.
        // Start Update 16 September 2026, by @WNP: Expose the protected deed number on the authorized staff summary.
        $vendor->makeVisible(['tax_id', 'deed_number', 'bank_account_number', 'bank_ifsc']);

        $vendor->load([
            'documents:id,vendor_id,document_type_id,file_name,verification_status,verification_notes,expiry_date,is_current,created_at' => [
                'documentType:id,name,display_name',
            ],
            // Start Update 13 September 2026, by @WNP: Include reason and provenance metadata for selective timeline comment localization.
            'stateLogs:id,vendor_id,user_id,from_status,to_status,comment,reason_code,metadata,created_at' => [
                'user:id,name',
            ],
        ]);

        if (in_array($vendor->status, [
            Vendor::STATUS_APPROVED,
            Vendor::STATUS_ACTIVE,
            Vendor::STATUS_SUSPENDED,
            Vendor::STATUS_TERMINATED,
        ], true)) {
            $latestComplianceResults = ComplianceResult::with('rule:id,name,description')
                ->select('id', 'vendor_id', 'compliance_rule_id', 'status', 'details', 'evaluated_at')
                ->where('vendor_id', $vendor->id)
                ->whereIn('id', ComplianceResult::latestResultIdsQuery($vendor->id))
                ->orderByDesc('evaluated_at')
                ->get();

            $vendor->setRelation('complianceResults', $latestComplianceResults);

            $vendor->load([
                'performanceScores:id,vendor_id,performance_metric_id,score,period_start,period_end' => [
                    'metric:id,name,display_name',
                ],
            ]);
        }

        // Compute mandatory document verification readiness (Feature 3)
        $mandatoryDocTypes = DocumentType::where('is_mandatory', true)
            ->where('is_active', true)
            ->get(['id', 'name', 'display_name']);

        $currentDocs = $vendor->documents->where('is_current', true);

        $docVerificationStatus = $mandatoryDocTypes->map(function ($docType) use ($currentDocs) {
            $doc = $currentDocs->where('document_type_id', $docType->id)->first();

            $isVerified = $doc?->verification_status === 'verified';
            if ($isVerified && $doc->expiry_date && \Carbon\Carbon::parse($doc->expiry_date)->startOfDay()->isPast()) {
                $isVerified = false;
            }

            return [
                // Start Update 15 September 2026, by @WNP: Expose the stable master key so the UI translates only system document types.
                'document_type' => $docType->only(['name', 'display_name']),
                'is_uploaded' => $doc !== null,
                'verification_status' => $doc === null ? 'missing' : $doc->verification_status,
                'is_verified' => $isVerified,
            ];
        });

        $allMandatoryDocsVerified = $docVerificationStatus->every(fn ($d) => $d['is_verified']);

        return Inertia::render('Admin/Vendors/Show', [
            'vendor' => $vendor,
            'docVerificationStatus' => $docVerificationStatus->values(),
            'allMandatoryDocsVerified' => $allMandatoryDocsVerified,
        ]);
    }

    public function approve(Request $request, Vendor $vendor): RedirectResponse
    {
        $this->authorize('approve', $vendor);

        $request->validate([
            'comment' => 'nullable|string|max:1000',
        ]);

        /** @var User $actor */
        $actor = $request->user();

        try {
            $this->lifecycleService->approve($vendor, $actor, $request->string('comment')->toString());

            return back()->with('success', 'Vendor approved! The vendor can be activated once compliance requirements are met.');
        } catch (\Throwable $e) {
            Log::error('Vendor approval failed', ['vendor_id' => $vendor->id, 'error' => $e->getMessage()]);

            return back()->withErrors(['status' => $e->getMessage()]);
        }
    }

    public function reject(Request $request, Vendor $vendor): RedirectResponse
    {
        $this->authorize('reject', $vendor);

        /** @var User $actor */
        $actor = $request->user();

        $validated = $request->validate([
            'comment' => 'required|string|max:1000',
        ]);

        try {
            $this->lifecycleService->reject($vendor, $actor, $validated['comment']);

            return back()->with('success', 'Vendor rejected.');
        } catch (\Throwable $e) {
            Log::error('Vendor rejection failed', ['vendor_id' => $vendor->id, 'error' => $e->getMessage()]);

            return back()->withErrors(['status' => $e->getMessage()]);
        }
    }

    public function activate(Request $request, Vendor $vendor): RedirectResponse
    {
        $this->authorize('activate', $vendor);

        $request->validate([
            'comment' => 'nullable|string|max:1000',
        ]);

        /** @var User $actor */
        $actor = $request->user();

        try {
            $this->lifecycleService->activate($vendor, $actor, $request->string('comment')->toString());

            return back()->with('success', 'Vendor activated!');
        } catch (\Throwable $e) {
            Log::error('Vendor activation failed', ['vendor_id' => $vendor->id, 'error' => $e->getMessage()]);

            return back()->withErrors(['status' => $e->getMessage()]);
        }
    }

    public function suspend(Request $request, Vendor $vendor): RedirectResponse
    {
        $this->authorize('suspend', $vendor);

        /** @var User $actor */
        $actor = $request->user();

        $validated = $request->validate([
            'comment' => 'required|string|max:1000',
        ]);

        try {
            $this->lifecycleService->suspend($vendor, $actor, $validated['comment']);

            return back()->with('success', 'Vendor suspended.');
        } catch (\Throwable $e) {
            Log::error('Vendor suspension failed', ['vendor_id' => $vendor->id, 'error' => $e->getMessage()]);

            return back()->withErrors(['status' => $e->getMessage()]);
        }
    }

    public function terminate(Request $request, Vendor $vendor): RedirectResponse
    {
        $this->authorize('terminate', $vendor);

        /** @var User $actor */
        $actor = $request->user();

        $validated = $request->validate([
            'comment' => 'required|string|max:1000',
        ]);

        try {
            $this->lifecycleService->terminate($vendor, $actor, $validated['comment']);

            return back()->with('success', 'Vendor terminated.');
        } catch (\Throwable $e) {
            Log::error('Vendor termination failed', ['vendor_id' => $vendor->id, 'error' => $e->getMessage()]);

            return back()->withErrors(['status' => $e->getMessage()]);
        }
    }

    public function reactivate(Request $request, Vendor $vendor): RedirectResponse
    {
        // Require same authorization as terminate (or special one if wanted)
        $this->authorize('terminate', $vendor);

        /** @var User $actor */
        $actor = $request->user();

        $validated = $request->validate([
            'comment' => 'required|string|max:1000',
        ]);

        try {
            $this->lifecycleService->reactivate($vendor, $actor, $validated['comment']);

            return back()->with('success', 'Vendor reactivated successfully. They are now under review.');
        } catch (\Throwable $e) {
            Log::error('Vendor reactivation failed', ['vendor_id' => $vendor->id, 'error' => $e->getMessage()]);

            return back()->withErrors(['status' => $e->getMessage()]);
        }
    }

    public function notes(Request $request, Vendor $vendor): RedirectResponse
    {
        $this->authorize('updateNotes', $vendor);

        $validated = $request->validate([
            'internal_notes' => 'nullable|string|max:5000',
        ]);

        $vendor->internal_notes = $validated['internal_notes'] ?? null;
        $vendor->save();

        return back()->with('success', 'Notes saved.');
    }
}
