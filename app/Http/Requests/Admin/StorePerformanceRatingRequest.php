<?php

namespace App\Http\Requests\Admin;

use App\Models\PerformanceMetric;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StorePerformanceRatingRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->staffCan('performance.rate') === true;
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
            'ratings.*.metric_id' => ['required', 'integer', 'distinct', Rule::exists('performance_metrics', 'id')->where('is_active', true)],
            'ratings.*.score' => ['bail', 'required', 'integer', 'min:'.PerformanceMetric::MIN_SCORE, 'max:'.PerformanceMetric::MAX_SCORE, function ($attribute, $value, $fail): void {
                if (! is_int($value) && (! is_string($value) || ! preg_match('/^[1-4]$/', $value))) {
                    $fail(__('performance.validation.score_range', ['max' => PerformanceMetric::MAX_SCORE]));
                }
            }],
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
    // Localize performance period and rating field names in validation feedback.
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
    // Localize the rating period ordering validation message.
    public function messages(): array
    {
        return [
            'ratings.*.score.integer' => __('performance.validation.score_range', ['max' => PerformanceMetric::MAX_SCORE]),
            'ratings.*.score.min' => __('performance.validation.score_range', ['max' => PerformanceMetric::MAX_SCORE]),
            'ratings.*.score.max' => __('performance.validation.score_range', ['max' => PerformanceMetric::MAX_SCORE]),
            'ratings.*.metric_id.exists' => __('performance.validation.metric_unavailable'),
            'period_end.after_or_equal' => __('performance.validation.end_after_start'),
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }
            $ratings = collect($this->input('ratings', []));
            if ($ratings->isEmpty()) {
                return;
            }

            $metricIds = $ratings->pluck('metric_id')->filter()->unique()->values();
            if ($metricIds->isEmpty()) {
                return;
            }

            $activeIds = PerformanceMetric::active()->pluck('id')->sort()->values()->all();
            if ($metricIds->map(fn ($id) => (int) $id)->sort()->values()->all() !== $activeIds) {
                $validator->errors()->add('ratings', __('performance.validation.complete_ratings'));

                return;
            }

            $metrics = PerformanceMetric::query()
                ->whereIn('id', $metricIds)
                ->pluck('max_score', 'id');

            foreach ($ratings as $index => $rating) {
                $metricId = (int) ($rating['metric_id'] ?? 0);
                $score = (int) $rating['score'];
                $maxScore = (int) ($metrics[$metricId] ?? 0);

                if ($maxScore !== PerformanceMetric::MAX_SCORE) {
                    $validator->errors()->add("ratings.{$index}.metric_id", __('performance.validation.maximum_four'));

                    continue;
                }

                if ($maxScore > 0 && $score > $maxScore) {
                    $validator->errors()->add(
                        "ratings.{$index}.score",
                        // Localize the custom maximum-score validation response.
                        __('performance.validation.score_max', ['max' => $maxScore])
                    );
                }
            }
        });
    }
}
