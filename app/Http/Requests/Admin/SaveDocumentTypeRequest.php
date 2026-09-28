<?php

namespace App\Http\Requests\Admin;

use App\Support\DocumentUploadRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveDocumentTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isSuperAdmin() ?? false;
    }

    public function rules(): array
    {
        $type = $this->route('documentType');

        return [
            'name' => ['required', 'string', Rule::unique('document_types', 'name')->ignore($type), ...($type ? [Rule::in([$type->name])] : ['max:100', 'regex:/^[a-z][a-z0-9_]*$/'])],
            'display_name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_mandatory' => ['required', 'boolean'],
            'has_expiry' => ['required', 'boolean'],
            'expiry_warning_days' => ['required', 'integer', 'min:0', 'max:365', ...($this->boolean('has_expiry') ? [] : [Rule::in([0])])],
            'allowed_extensions' => ['required', 'array', 'min:1', 'max:4'],
            'allowed_extensions.*' => ['required', 'string', 'distinct', Rule::in(DocumentUploadRules::EXTENSIONS)],
            'max_file_size_mb' => ['required', 'integer', 'min:1', 'max:'.DocumentUploadRules::MAX_MB],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
