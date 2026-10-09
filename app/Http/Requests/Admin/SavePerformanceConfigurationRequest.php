<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class SavePerformanceConfigurationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isSuperAdmin() === true;
    }

    public function rules(): array
    {
        return [
            'version' => ['required', 'string', 'size:64'],
            'metrics' => ['required', 'array', 'min:1'],
            'metrics.*' => ['required', 'array:id,name,display_name,description,weight,max_score,is_active,deleted'],
            'metrics.*.id' => ['nullable', 'integer', 'distinct'],
            'metrics.*.name' => ['required', 'string', 'max:100', 'regex:/^[a-z][a-z0-9_]*$/', 'distinct:strict'],
            'metrics.*.display_name' => ['required', 'string', 'max:255'],
            'metrics.*.description' => ['nullable', 'string', 'max:1000'],
            'metrics.*.weight' => ['required', 'numeric', 'regex:/^\d{1,3}(?:\.\d{1,2})?$/', 'min:0.01', 'max:100'],
            'metrics.*.max_score' => ['required', 'integer', 'min:1', 'max:2147483647'],
            'metrics.*.is_active' => ['required', 'boolean'],
            'metrics.*.deleted' => ['required', 'boolean'],
        ];
    }

    public function attributes(): array
    {
        $attributes = [];
        foreach (['name', 'display_name', 'description', 'weight', 'max_score', 'is_active'] as $field) {
            $attributes['metrics.*.'.$field] = __('performance.fields.'.$field);
        }

        return $attributes;
    }
}
