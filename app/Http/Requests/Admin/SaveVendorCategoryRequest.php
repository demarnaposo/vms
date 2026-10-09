<?php

namespace App\Http\Requests\Admin;

use App\Models\VendorCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveVendorCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isSuperAdmin() ?? false;
    }

    public function rules(): array
    {
        return $this->categoryRules($this->route('vendorCategory'));
    }

    public function categoryRules(?VendorCategory $category): array
    {
        return [
            'code' => ['required', 'string', 'max:100', 'regex:/^[a-z][a-z0-9_]*$/', Rule::unique('vendor_categories', 'code')->ignore($category), ...($category ? [Rule::in([$category->code])] : [])],
            'display_name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['required', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'code.in' => 'Category codes cannot be changed after creation.',
            'description.string' => 'Category Description must be text.',
            'description.max' => 'Category Description may not exceed 1000 characters.',
        ];
    }
}
