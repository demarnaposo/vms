<?php

namespace App\Http\Requests\Vendor;

use App\Models\DocumentType;
use Illuminate\Foundation\Http\FormRequest;

class StoreStep3Request extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isVendor() ?? false;
    }

    public function rules(): array
    {
        $rules = ['documents' => ['nullable', 'array'], 'documents.*' => ['array'], 'documents.*.document_type_id' => ['required', 'integer', 'distinct', 'exists:document_types,id,is_active,1'], 'removed_document_type_ids' => ['nullable', 'array'], 'removed_document_type_ids.*' => ['integer', 'distinct']];
        $types = DocumentType::query()->whereIn('id', collect($this->input('documents', []))->pluck('document_type_id')->filter(fn ($id) => is_scalar($id))->all())->get()->keyBy('id');
        foreach ((array) $this->input('documents', []) as $index => $document) {
            $id = is_array($document) ? ($document['document_type_id'] ?? null) : null;
            $type = is_scalar($id) ? $types->get($id) : null;
            $rules["documents.{$index}.file"] = \App\Support\DocumentUploadRules::file($type);
            $rules["documents.{$index}.expiry_date"] = \App\Support\DocumentUploadRules::expiry($type);
        }

        return $rules;
    }
}
