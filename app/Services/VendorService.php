<?php

namespace App\Services;

use App\Interfaces\VendorRepositoryInterface;
use App\Models\DocumentVersion;
use App\Models\User;
use App\Models\Vendor;
use App\Models\VendorCategory;
// Persist the Indonesian country value with onboarding location data.
use App\Support\IndonesiaRegions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class VendorService
{
    protected VendorRepositoryInterface $vendorRepository;

    public function __construct(VendorRepositoryInterface $vendorRepository)
    {
        $this->vendorRepository = $vendorRepository;
    }

    /**
     * Handle Step 1 of onboarding (Company Info).
     *
     * @param  array<string, mixed>  $data  Validated company information.
     * @return void
     *
     * @throws \RuntimeException If user is not authenticated.
     */
    /**
     * Get or create a draft application for the user.
     */
    public function getDraftApplication(User $user): \App\Models\VendorApplication
    {
        $application = \App\Models\VendorApplication::firstOrCreate(
            ['user_id' => $user->id, 'status' => 'draft'],
            ['current_step' => 1, 'data' => []]
        );

        $data = $application->data ?? [];
        $step1 = $data['step1'] ?? null;

        if (is_array($step1) && ! isset($step1['category_id']) && filled($step1['category'] ?? null)) {
            $category = VendorCategory::query()->where('code', $step1['category'])->first()
                ?? VendorCategory::query()->where('code', 'legacy_'.hash('sha256', $step1['category']))->first();
            if ($category) {
                $step1['category_id'] = $category->id;
                $data['step1'] = $step1;
                $application->setAttribute('data', $data);
            }
        }

        if (is_array($step1) && array_key_exists('registration_number', $step1)) {
            // Read historical drafts through the current NIB key without rewriting them until the next save.
            if (! array_key_exists('business_identification_number', $step1)) {
                $step1['business_identification_number'] = $step1['registration_number'];
            }

            unset($step1['registration_number']);
            $data['step1'] = $step1;
            $application->setAttribute('data', $data);
        }

        $step2 = $data['step2'] ?? null;

        if (is_array($step2) && array_key_exists('bank_ifsc', $step2)) {
            // Read historical drafts through the current bank-code key until the draft is saved again.
            if (! array_key_exists('code_bank', $step2)) {
                $step2['code_bank'] = $step2['bank_ifsc'];
            }

            unset($step2['bank_ifsc']);
            $data['step2'] = $step2;
            $application->setAttribute('data', $data);
        }

        return $application;
    }

    /**
     * Handle Step 1 of onboarding (Company Info).
     */
    public function storeOnboardingStep1(array $data)
    {
        return BusinessTypeService::locked(fn () => VendorCategoryService::locked(function () use ($data) {
            $user = Auth::user();
            $types = app(BusinessTypeService::class);
            $types->validateSelection($data['business_type'] ?? null, $types->previousValues($user));
            $categories = app(VendorCategoryService::class);
            $categories->validateSelection($data['category_id'] ?? null, $categories->previousValues($user));
            unset($data['category_description'], $data['description']);
            $application = $this->getDraftApplication($user);

            $currentData = $application->data ?? [];
            $currentData['step1'] = $data;
            $currentData['step1']['contact_email'] = $user->email;

            $application->update([
                'data' => $currentData,
                'current_step' => max($application->current_step, 2),
            ]);

            return $application;
        }));
    }

    /**
     * Handle Step 2 of onboarding (Bank Details).
     */
    public function storeOnboardingStep2(array $data)
    {
        return BusinessTypeService::locked(fn () => VendorCategoryService::locked(function () use ($data) {
            $user = Auth::user();
            $application = $this->getDraftApplication($user);

            $currentData = $application->data ?? [];
            $currentData['step2'] = $data;

            $application->update([
                'data' => $currentData,
                'current_step' => max($application->current_step, 3),
            ]);

            return $application;
        }));
    }

    /**
     * Handle Step 3 of onboarding (Document Uploads to Temp).
     */
    public function storeOnboardingStep3(array $documentsData, array $removedTypeIds = [], bool $requireComplete = true, array $expiryDates = [])
    {
        $newPaths = [];
        try {
            return BusinessTypeService::locked(function () use ($documentsData, $removedTypeIds, $requireComplete, $expiryDates, &$newPaths) {
                return VendorCategoryService::locked(function () use ($documentsData, $removedTypeIds, $requireComplete, $expiryDates, &$newPaths) {
                    $user = Auth::user();
                    $application = $this->getDraftApplication($user);

                    $application = \App\Models\VendorApplication::query()->lockForUpdate()->findOrFail($application->id);

                    // Store files in application-specific folder
                    $tempFolder = 'vendor-applications/'.$application->id.'/temp';
                    $processedDocuments = [];

                    $currentData = $application->data ?? [];

                    $savedDocuments = $currentData['step3']['documents'] ?? [];
                    if (! is_array($savedDocuments) || collect($savedDocuments)->contains(fn ($doc) => ! is_array($doc))) {
                        throw \Illuminate\Validation\ValidationException::withMessages(['documents' => __('alerts.onboarding_documents_invalid')]);
                    }

                    $removedTypeIds = [...$removedTypeIds, ...(array) ($currentData['step3']['removed_document_type_ids'] ?? [])];

                    // Check for existing documents in draft
                    $existingDocuments = array_map(function ($doc) {
                        $doc['document_type_id'] = (int) ($doc['document_type_id'] ?? 0);

                        return $doc;
                    }, $savedDocuments);

                    $existingDocuments = array_values(array_filter($existingDocuments, fn ($doc) => ! in_array($doc['document_type_id'], array_map('intval', $removedTypeIds), true)));

                    foreach ($expiryDates as $typeId => $expiryDate) {
                        $found = false;
                        foreach ($existingDocuments as &$document) {
                            if ($document['document_type_id'] === (int) $typeId) {
                                $document['expiry_date'] = $expiryDate;
                                $found = true;
                            }
                        }
                        unset($document);
                        if (! $found) {
                            throw \Illuminate\Validation\ValidationException::withMessages(["documents_by_type.{$typeId}" => __('alerts.onboarding_document_unavailable')]);
                        }
                    }

                    $incomingTypeIds = array_map(fn ($doc) => (int) ($doc['document_type_id'] ?? 0), $documentsData);
                    $candidateDocuments = array_values(array_filter($existingDocuments, fn ($doc) => ! in_array($doc['document_type_id'], $incomingTypeIds, true)));
                    $changedTypeIds = [...$incomingTypeIds, ...array_map('intval', array_keys($expiryDates))];
                    $changedExistingDocuments = array_values(array_filter($existingDocuments, fn ($doc) => in_array($doc['document_type_id'], $changedTypeIds, true) && ! in_array($doc['document_type_id'], $incomingTypeIds, true)));
                    app(DraftDocumentValidator::class)->validate($application, $requireComplete ? [...$candidateDocuments, ...$documentsData] : [...$changedExistingDocuments, ...$documentsData], $requireComplete, $incomingTypeIds);

                    foreach ($documentsData as $doc) {
                        $documentTypeId = (int) ($doc['document_type_id'] ?? 0);
                        /** @var UploadedFile $file */
                        $file = $doc['file'];
                        \App\Support\DocumentUploadRules::validate($documentTypeId, $file, $doc['expiry_date'] ?? null, ! $requireComplete);
                        $path = $file->store($tempFolder, 'private');
                        if (! $path) {
                            throw new \RuntimeException('Document storage failed.');
                        }

                        $newPaths[] = $path;
                        $processedDocuments[] = [
                            'document_type_id' => $documentTypeId,
                            'file_name' => $this->sanitizeFileName($file->getClientOriginalName()),
                            'file_path' => $path,
                            'file_size' => $file->getSize(),
                            'mime_type' => $file->getMimeType(),
                            'file_hash' => hash_file('sha256', $file->getRealPath()),
                            'expiry_date' => $doc['expiry_date'] ?? null,
                        ];
                    }

                    // Merge logic
                    $finalDocuments = $existingDocuments;

                    foreach ($processedDocuments as $newDoc) {
                        $replaced = false;
                        foreach ($finalDocuments as $key => $existingDoc) {
                            if ((int) ($existingDoc['document_type_id'] ?? 0) === $newDoc['document_type_id']) {
                                $finalDocuments[$key] = $newDoc;
                                $replaced = true;
                                break;
                            }
                        }
                        if (! $replaced) {
                            $finalDocuments[] = $newDoc;
                        }
                    }

                    $documentsToValidate = $requireComplete ? $finalDocuments : array_values(array_filter($finalDocuments, fn ($doc) => in_array($doc['document_type_id'], $changedTypeIds, true)));
                    app(DraftDocumentValidator::class)->validate($application, $documentsToValidate, $requireComplete, $incomingTypeIds);
                    $currentData['step3'] = ['documents' => $finalDocuments];

                    $application->update([
                        'data' => $currentData,
                        'current_step' => $requireComplete ? max($application->current_step, 4) : 3,
                    ]);

                    $retainedPaths = array_column($finalDocuments, 'file_path');
                    foreach ($savedDocuments as $saved) {
                        $path = $saved['file_path'] ?? null;
                        $disk = Storage::disk('private');
                        $root = realpath($disk->path($tempFolder));
                        $resolved = is_string($path) ? realpath($disk->path($path)) : false;
                        if ($root && $resolved && str_starts_with($resolved, $root.DIRECTORY_SEPARATOR) && ! in_array($path, $retainedPaths, true)) {
                            DB::afterCommit(fn () => Storage::disk('private')->delete($path));
                        }
                    }

                    return $application;
                });
            });
        } catch (\Throwable $exception) {
            Storage::disk('private')->delete($newPaths);
            throw $exception;
        }
    }

    /**
     * Submit the final application.
     *
     * @param  \App\Models\User  $user  The authenticated user submitting the application.
     * @return \App\Models\Vendor The created or updated vendor instance.
     *
     * @throws \Exception If database transaction fails.
     */
    public function submitApplication(User $user)
    {
        return BusinessTypeService::locked(fn () => VendorCategoryService::locked(function () use ($user) {
            $application = $this->getDraftApplication($user);
            \App\Models\VendorApplication::query()->lockForUpdate()->findOrFail($application->id);
            $application = $this->getDraftApplication($user);
            $data = $application->data ?? [];
            if (empty($data['step1']) || empty($data['step2'])) {
                throw \Illuminate\Validation\ValidationException::withMessages(['step' => 'Please complete all steps before submitting.']);
            }

            \App\Models\DocumentType::query()->whereIn('id', collect($data['step3']['documents'] ?? [])->pluck('document_type_id'))->lockForUpdate()->get();
            app(DraftDocumentValidator::class)->validate($application);
            // Revalidate persisted drafts with the same rules used by each step before any final writes.
            foreach ([1 => \App\Http\Requests\Vendor\StoreStep1Request::class, 2 => \App\Http\Requests\Vendor\StoreStep2Request::class] as $step => $requestClass) {
                $payload = $data['step'.$step];
                $request = $requestClass::create('/', 'POST', is_array($payload) ? $payload : []);
                $request->setUserResolver(fn () => $user);
                \Illuminate\Support\Facades\Validator::make(is_array($payload) ? $payload : [], $request->rules(), $request->messages())->validate();
            }

            $removedIds = array_map('intval', (array) ($data['step3']['removed_document_type_ids'] ?? []));
            $data['step3']['documents'] = array_values(array_filter($data['step3']['documents'] ?? [], fn ($doc) => ! in_array((int) ($doc['document_type_id'] ?? 0), $removedIds, true)));
            // 1. Create or Update Vendor (Ensure it exists first)
            $vendorData = array_merge(
                $data['step1'] ?? [],
                $data['step2'] ?? []
            );
            unset($vendorData['category'], $vendorData['category_description'], $vendorData['description']);
            // Keep new and resubmitted vendor profiles aligned with Indonesian regions.
            $vendorData['country'] = IndonesiaRegions::country();

            // If vendor doesn't exist, create as DRAFT first.
            // If exists, keep current status (should be DRAFT or REJECTED) to allow transition.
            $vendor = $this->vendorRepository->updateOrCreate(
                ['user_id' => $user->id],
                $vendorData
            );

            if (blank($vendor->getAttribute('status'))) {
                $vendor->status = Vendor::STATUS_DRAFT;
                $vendor->save();
            }

            // Sync contact_phone
            if (! empty($data['step1']['contact_phone'])) {
                $user->phone = $data['step1']['contact_phone'];
                $user->save();
            }

            // 2. Keep history immutable by deactivating current versions.
            $vendor->documents()->where('is_current', true)->update(['is_current' => false]);

            // 3. Move files and create records
            if (! empty($data['step3']['documents'])) {
                foreach ($data['step3']['documents'] as $doc) {
                    $documentTypeId = (int) ($doc['document_type_id'] ?? 0);
                    $tempPath = $doc['file_path'];
                    $newPath = 'vendor-documents/'.$vendor->id.'/'.basename($tempPath);

                    if (Storage::disk('private')->exists($tempPath)) {
                        if ($tempPath !== $newPath && ! Storage::disk('private')->move($tempPath, $newPath)) {
                            throw new \RuntimeException('Document storage failed.');
                        }
                    } else {
                        // If file not found in temp, check if it's already in final path (re-submission case)
                        if (! Storage::disk('private')->exists($newPath)) {
                            // CRITICAL: Fail the transaction if a document is missing
                            // Localize the upload error without translating the provided filename.
                            throw new \Exception(__('alerts.document_upload_missing', ['file' => $doc['file_name']]));
                        }
                    }

                    $nextVersion = (int) $vendor->documents()
                        ->where('document_type_id', $documentTypeId)
                        ->max('version') + 1;

                    $document = $this->vendorRepository->createDocument($vendor, [
                        'document_type_id' => $documentTypeId,
                        'file_name' => $doc['file_name'],
                        'file_path' => $newPath,
                        'file_hash' => $doc['file_hash'],
                        'file_size' => $doc['file_size'],
                        'mime_type' => $doc['mime_type'],
                        'expiry_date' => $doc['expiry_date'] ?? null,
                        'version' => max(1, $nextVersion),
                        'is_current' => true,
                        'verification_status' => 'pending',
                    ]);

                    DocumentVersion::create([
                        'vendor_document_id' => $document->id,
                        'version' => $document->version,
                        'file_path' => $document->file_path,
                        'file_hash' => $document->file_hash,
                        'uploaded_by' => $user->id,
                        'notes' => 'Uploaded via onboarding submission',
                    ]);
                }
            }

            // 4. Perform State Transition (Logs & Audit included)
            // This sets status to SUBMITTED, sets submitted_at, logs change, etc.
            if ($vendor->status !== Vendor::STATUS_SUBMITTED) {
                // Mark the fixed onboarding timeline comment as application-generated.
                $vendor->transitionTo(Vendor::STATUS_SUBMITTED, $user, 'Vendor application submitted for review', automaticComment: true);
            }

            // Cleanup: Mark application as submitted
            $application->update(['status' => 'submitted']);

            $tempFolder = 'vendor-applications/'.$application->id;
            Storage::disk('private')->deleteDirectory($tempFolder);

            // Notify Ops Managers
            $opsManagers = User::role(\App\Models\Role::OPS_MANAGER)->get();
            foreach ($opsManagers as $manager) {
                $manager->notify(new \App\Notifications\VendorApplicationSubmitted($vendor));
            }

            return $vendor;
        }));
    }

    /**
     * Upload a single document for an active vendor.
     *
     * @return \App\Models\VendorDocument
     */
    public function uploadDocument(Vendor $vendor, UploadedFile $file, int $documentTypeId, ?string $expiryDate)
    {
        \App\Support\DocumentUploadRules::validate($documentTypeId, $file, $expiryDate);
        $path = $file->store('vendor-documents/'.$vendor->id, 'private');
        if (! $path) {
            throw new \RuntimeException('Document storage failed.');
        }

        try {
            return DB::transaction(function () use ($vendor, $file, $documentTypeId, $expiryDate, $path) {
                \App\Support\DocumentUploadRules::validate($documentTypeId, $file, $expiryDate);
                $lockedVendor = Vendor::query()->lockForUpdate()->findOrFail($vendor->getKey());
                $hash = hash_file('sha256', $file->getRealPath());
                $actorId = Auth::id() ?? $lockedVendor->user_id;

                // Keep old version immutable, mark it as no longer current.
                $existing = $lockedVendor->documents()
                    ->where('document_type_id', $documentTypeId)
                    ->where('is_current', true)
                    ->latest('version')
                    ->first();

                $nextVersion = (int) $lockedVendor->documents()
                    ->where('document_type_id', $documentTypeId)
                    ->max('version') + 1;
                if ($existing) {
                    $existing->update(['is_current' => false]);
                }

                $document = $this->vendorRepository->createDocument($lockedVendor, [
                    'document_type_id' => $documentTypeId,
                    'file_name' => $this->sanitizeFileName($file->getClientOriginalName()),
                    'file_path' => $path,
                    'file_hash' => $hash,
                    'file_size' => $file->getSize(),
                    'mime_type' => $file->getMimeType(),
                    'expiry_date' => $expiryDate,
                    'version' => $nextVersion,
                    'is_current' => true,
                    'verification_status' => 'pending',
                ]);

                DocumentVersion::create([
                    'vendor_document_id' => $document->id,
                    'version' => $document->version,
                    'file_path' => $document->file_path,
                    'file_hash' => $document->file_hash,
                    'uploaded_by' => $actorId,
                    'notes' => 'Re-uploaded document version',
                ]);

                return $document;
            });
        } catch (\Throwable $exception) {
            Storage::disk('private')->delete($path);

            throw $exception;
        }
    }

    /**
     * Update vendor profile.
     */
    public function updateProfile(Vendor $vendor, array $data)
    {
        return BusinessTypeService::locked(function () use ($vendor, $data) {
            $vendor = Vendor::query()->lockForUpdate()->findOrFail($vendor->id);
            if (filled($data['business_type'] ?? null)) {
                app(BusinessTypeService::class)->validateSelection($data['business_type'], [$vendor->business_type]);
            }
            $vendor->update($data);

            // Sync contact_phone to user's phone field
            if (! empty($data['contact_phone'])) {
                $user = $vendor->user;
                $user->phone = $data['contact_phone'];
                $user->save();
            }

            return $vendor;
        });
    }

    protected function sanitizeFileName(string $fileName): string
    {
        $name = pathinfo($fileName, PATHINFO_FILENAME);
        $extension = pathinfo($fileName, PATHINFO_EXTENSION);
        $name = preg_replace('/[^\w\-. ]/', '_', $name);
        $name = substr($name, 0, 200);

        $allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
        if ($extension && ! in_array(strtolower($extension), $allowedExtensions, true)) {
            $extension = 'bin';
        }

        return $extension ? "{$name}.{$extension}" : $name;
    }
}
