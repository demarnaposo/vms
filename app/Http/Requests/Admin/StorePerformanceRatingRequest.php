<?php

namespace App\Http\Requests\Admin;

use App\Models\PerformanceMetric;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StorePerformanceRatingRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasAnyRole(['ops_manager', 'super_admin']) === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'ratings' => 'required|array|min:1',
            'ratings.*.metric_id' => 'required|integer|distinct|exists:performance_metrics,id',
            'ratings.*.score' => 'required|integer|min:0',
            'ratings.*.notes' => 'nullable|string|max:500',
            'period_start' => 'required|date',
            'period_end' => 'required|date|after_or_equal:period_start',
        ];
    }

    /**
     * Get localized display names for performance rating fields.
     *
     * @return array<string, string>
     */
    // Start Update 16 September 2026, by @WNP: Localize performance period and rating field names in validation feedback.
    public function attributes(): array
    {
        return [
            'ratings' => __('performance.fields.ratings'),
            'ratings.*.metric_id' => __('performance.fields.metric'),
            'ratings.*.score' => __('performance.fields.score'),
            'ratings.*.notes' => __('performance.fields.notes'),
            'period_start' => __('performance.fields.start_date'),
            'period_end' => __('performance.fields.end_date'),
        ];
    }

    /**
     * Get localized validation messages for date relationships.
     *
     * @return array<string, string>
     */
    // Start Update 16 September 2026, by @WNP: Localize the rating period ordering validation message.
    public function messages(): array
    {
        return [
            'period_end.after_or_equal' => __('performance.validation.end_after_start'),
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $ratings = collect($this->input('ratings', []));
            if ($ratings->isEmpty()) {
                return;
            }

            $metricIds = $ratings->pluck('metric_id')->filter()->unique()->values();
            if ($metricIds->isEmpty()) {
                return;
            }

            $metrics = PerformanceMetric::query()
                ->whereIn('id', $metricIds)
                ->pluck('max_score', 'id');

            foreach ($ratings as $index => $rating) {
                $metricId = (int) ($rating['metric_id'] ?? 0);
                $score = (int) ($rating['score'] ?? 0);
                $maxScore = (int) ($metrics[$metricId] ?? 0);

                if ($maxScore > 0 && $score > $maxScore) {
                    $validator->errors()->add(
                        "ratings.{$index}.score",
                        // Start Update 16 September 2026, by @WNP: Localize the custom maximum-score validation response.
                        __('performance.validation.score_max', ['max' => $maxScore])
                    );
                }
            }
        });
    }
}
