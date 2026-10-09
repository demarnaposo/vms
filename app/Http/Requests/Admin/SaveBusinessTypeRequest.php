<?php

namespace App\Http\Requests\Admin;

use App\Models\BusinessType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveBusinessTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isSuperAdmin() ?? false;
    }

    public function rules(): array
    {
        return $this->typeRules($this->route('businessType'));
    }

    public function typeRules(?BusinessType $type = null): array
    {
        return [
            'code' => ['required', 'string', 'max:50', 'regex:/^[a-z][a-z0-9_]*$/', Rule::unique('business_types', 'code')->ignore($type), ...($type ? [Rule::in([$type->code])] : [])],
            'display_name' => ['required', 'string', 'max:255'],
            'is_active' => ['required', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'code.required' => 'Business Type Code is required.',
            'code.string' => 'Business Type Code must be text.',
            'code.max' => 'Business Type Code may not exceed 50 characters.',
            'code.regex' => 'Business Type Code must start with a lowercase letter and contain only lowercase letters, digits and underscores.',
            'code.unique' => 'Business Type Code has already been used.',
            'code.in' => 'Business type codes cannot be changed after creation.',
            'display_name.required' => 'Business Type Name is required.',
            'display_name.string' => 'Business Type Name must be text.',
            'display_name.max' => 'Business Type Name may not exceed 255 characters.',
            'is_active.required' => 'Business type status is required.',
            'is_active.boolean' => 'Business type status must be active or inactive.',
        ];
    }
}
