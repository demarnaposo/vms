<?php

namespace App\Http\Requests\Vendor;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class StoreStep2Request extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Auth::check() && Auth::user()->isVendor();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'bank_name' => 'required|string|max:255',
            'bank_account_number' => ['required', 'string', 'regex:/^[0-9]{9,18}$/'],
            // Start Update 11 September 2026, by @WNP: Validate Indonesia's three-digit bank transfer code.
            'bank_ifsc' => ['required', 'string', 'regex:/^[0-9]{3}$/'],
            'bank_branch' => 'required|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'bank_account_number.regex' => 'Account number must be 9 to 18 digits.',
            // Start Update 11 September 2026, by @WNP: Return Indonesian bank code terminology in validation errors.
            'bank_ifsc.regex' => 'Bank Code must be exactly 3 digits.',
        ];
    }
}
