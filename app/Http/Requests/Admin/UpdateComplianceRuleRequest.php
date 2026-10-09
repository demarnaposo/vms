<?php

namespace App\Http\Requests\Admin;

use App\Support\PaymentsModule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class UpdateComplianceRuleRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Auth::check() && Auth::user()->isSuperAdmin();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'is_active' => 'boolean',
            'penalty_points' => 'integer|min:0|max:100',
            'blocks_payment' => PaymentsModule::enabled() ? ['sometimes', 'boolean'] : ['missing'],
            'blocks_activation' => 'boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'blocks_payment.missing' => __('alerts.compliance_payment_setting_disabled'),
        ];
    }
}
