<?php

namespace App\Http\Requests\Admin;

use App\Models\PerformanceMetric;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SavePerformanceMetricRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isSuperAdmin() === true;
    }

    public function rules(): array
    {
        return $this->metricRules($this->route('performanceMetric'));
    }

    public function metricRules(?PerformanceMetric $metric): array
    {
        return [
            'name' => ['required', 'string', 'max:100', 'regex:/^[a-z][a-z0-9_]*$/', $metric ? Rule::in([$metric->name]) : Rule::unique('performance_metrics', 'name')],
            'display_name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'weight' => ['required', 'numeric', 'regex:/^\d{1,3}(?:\.\d{1,2})?$/', 'min:0.01', 'max:100'],
            'max_score' => ['required', 'integer', Rule::in([4]), ...($metric?->scores()->exists() ? [Rule::in([$metric->max_score])] : [])],
            'is_active' => ['required', 'boolean'],
        ];
    }

    public function attributes(): array
    {
        return collect(['name', 'display_name', 'description', 'weight', 'max_score', 'is_active'])
            ->mapWithKeys(fn ($field) => [$field => __('performance.fields.'.$field)])->all();
    }

    public function messages(): array
    {
        return ['name.in' => __('performance.validation.code_immutable'), 'max_score.in' => __('performance.validation.maximum_four')];
    }
}
