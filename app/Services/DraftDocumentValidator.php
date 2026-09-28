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
    public function validate(VendorApplication $application): void
    {
        $documents = $application->data['step3']['documents'] ?? [];
        $types = DocumentType::active()->get()->keyBy('id');
        $missing = $types->where('is_mandatory', true)->keys()->diff(collect($documents)->pluck('document_type_id'));
        $errors = [];
        if ($missing->isNotEmpty()) {
            $errors['documents'] = 'Please upload all mandatory documents before submitting.';
        }
        $disk = Storage::disk('private');
        $root = realpath($disk->path('vendor-applications/'.$application->id));
        foreach ($documents as $index => $document) {
            $type = $types->get($document['document_type_id'] ?? null);
            $path = realpath($disk->path($document['file_path'] ?? ''));
            if (! $type || ! $root || ! $path || ! str_starts_with($path, $root.DIRECTORY_SEPARATOR) || ! is_file($path)) {
                $errors['documents'] = 'A saved document is unavailable or its type is inactive. Replace or remove it in the document step.';

                continue;
            }
            $validator = Validator::make([
                'file' => new UploadedFile($path, $document['file_name'] ?? basename($path), null, null, true),
                'expiry_date' => $document['expiry_date'] ?? null,
            ], ['file' => DocumentUploadRules::file($type), 'expiry_date' => DocumentUploadRules::expiry($type)]);
            if ($validator->fails()) {
                $errors['documents'] = 'Document requirements have changed. Replace the affected documents using the current requirements.';
                foreach ($validator->errors()->messages() as $field => $messages) {
                    $errors["documents.{$index}.{$field}"] = $messages;
                }
            }
        }
        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }
}
