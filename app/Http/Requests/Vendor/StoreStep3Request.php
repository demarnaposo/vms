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
        $rules = ['intent' => ['sometimes', 'in:autosave,continue'], 'expiry_dates' => ['sometimes', 'array'], 'documents' => ['nullable', 'array'], 'documents.*' => ['array'], 'documents.*.document_type_id' => ['required', 'integer', 'distinct', 'exists:document_types,id,is_active,1'], 'removed_document_type_ids' => ['nullable', 'array'], 'removed_document_type_ids.*' => ['integer', 'distinct']];
        $types = DocumentType::query()->whereIn('id', collect($this->input('documents', []))->pluck('document_type_id')->filter(fn ($id) => is_scalar($id))->all())->get()->keyBy('id');
        foreach ((array) $this->input('documents', []) as $index => $document) {
            $id = is_array($document) ? ($document['document_type_id'] ?? null) : null;
            $type = is_scalar($id) ? $types->get($id) : null;
            $rules["documents.{$index}.file"] = \App\Support\DocumentUploadRules::file($type);
            $rules["documents.{$index}.expiry_date"] = \App\Support\DocumentUploadRules::expiry($type, $this->input('intent') === 'autosave');
        }

        foreach ((array) $this->input('expiry_dates', []) as $id => $date) {
            $type = ctype_digit((string) $id) ? DocumentType::active()->find($id) : null;
            $rules["expiry_dates.{$id}"] = $type?->has_expiry
                ? \App\Support\DocumentUploadRules::expiry($type)
                : ['prohibited'];
        }

        return $rules;
    }

    public function messages(): array
    {
        $messages = [];
        foreach ((array) $this->input('documents', []) as $index => $document) {
            $id = is_array($document) ? ($document['document_type_id'] ?? null) : null;
            $type = is_scalar($id) ? DocumentType::active()->find($id) : null;
            foreach (\App\Support\DocumentUploadRules::messages($type) as $rule => $message) {
                $messages["documents.{$index}.{$rule}"] = $message;
            }
        }

        return $messages;
    }
}
