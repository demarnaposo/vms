<?php

namespace App\Http\Requests\Vendor;

use App\Models\DocumentType;
use Illuminate\Foundation\Http\FormRequest;

class UploadDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isVendor() ?? false;
    }

    public function rules(): array
    {
        $id = $this->input('document_type_id');
        $type = is_scalar($id) ? DocumentType::query()->find($id) : null;

        return [
            'document_type_id' => ['required', 'integer', 'exists:document_types,id,is_active,1'],
            'file' => \App\Support\DocumentUploadRules::file($type),
            'expiry_date' => \App\Support\DocumentUploadRules::expiry($type),
        ];
    }
}
