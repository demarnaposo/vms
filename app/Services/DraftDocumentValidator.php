<?php

namespace App\Services;

use App\Models\DocumentType;
use App\Models\VendorApplication;
use App\Support\DocumentUploadRules;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class DraftDocumentValidator
{
    public function validate(VendorApplication $application, ?array $documents = null, bool $requireComplete = true, array $initialUploadTypeIds = []): void
    {
        if ($documents === null) {
            $documents = $application->data['step3']['documents'] ?? [];
            $removedIds = array_map('intval', (array) ($application->data['step3']['removed_document_type_ids'] ?? []));
            if (is_array($documents)) {
                $documents = array_values(array_filter($documents, fn ($doc) => ! is_array($doc) || ! in_array((int) ($doc['document_type_id'] ?? 0), $removedIds, true)));
            }
        }
        if (! is_array($documents)) {
            throw ValidationException::withMessages(['documents' => __('alerts.onboarding_documents_invalid')]);
        }
        $types = DocumentType::active()->get()->keyBy('id');
        $errors = [];
        if ($requireComplete) {
            foreach ($types->where('is_mandatory', true) as $type) {
                if (! collect($documents)->contains(fn ($document) => is_array($document) && (int) ($document['document_type_id'] ?? 0) === $type->id)) {
                    $errors["documents_by_type.{$type->id}"] = __('alerts.onboarding_document_required');
                }
            }
        }
        $disk = Storage::disk('private');
        $root = realpath($disk->path('vendor-applications/'.$application->id));
        $vendor = $application->user->vendor;
        $currentDocuments = $vendor?->documents()->where('is_current', true)->get() ?? collect();
        $vendorRoot = $vendor ? realpath($disk->path('vendor-documents/'.$vendor->id)) : false;
        foreach ($documents as $index => $document) {
            if (! is_array($document)) {
                $errors['documents'] = __('alerts.onboarding_documents_invalid');

                continue;
            }
            $typeId = (int) ($document['document_type_id'] ?? 0);
            $type = $types->get($typeId);
            $file = $document['file'] ?? null;
            if (! $file instanceof UploadedFile) {
                $storedPath = $document['file_path'] ?? null;
                $path = is_string($storedPath) ? realpath($disk->path($storedPath)) : false;
                $owned = $root && $path && str_starts_with($path, $root.DIRECTORY_SEPARATOR);
                if (! $owned && $vendorRoot && $path && str_starts_with($path, $vendorRoot.DIRECTORY_SEPARATOR)) {
                    $owned = $currentDocuments->contains(fn ($saved) => $saved->document_type_id === $typeId && $saved->file_path === $storedPath);
                }
                if (! $owned || ! $path || ! is_file($path)) {
                    $errors["documents_by_type.{$typeId}"] = __('alerts.onboarding_document_unavailable');

                    continue;
                }
                $file = new UploadedFile($path, $document['file_name'] ?? basename($path), null, null, true);
            }
            if (! $type) {
                $errors["documents_by_type.{$typeId}"] = __('alerts.onboarding_document_unavailable');

                continue;
            }
            $validator = Validator::make([
                'file' => $file,
                'expiry_date' => $document['expiry_date'] ?? null,
            ], ['file' => DocumentUploadRules::file($type), 'expiry_date' => DocumentUploadRules::expiry($type, ! $requireComplete && in_array($typeId, $initialUploadTypeIds, true))], DocumentUploadRules::messages($type));
            if ($validator->fails()) {
                $errors["documents_by_type.{$typeId}"] = $validator->errors()->first();
            }
        }
        if ($errors !== []) {
            $errors['documents'] ??= __('alerts.onboarding_documents_invalid');
            throw ValidationException::withMessages($errors);
        }
    }
}
