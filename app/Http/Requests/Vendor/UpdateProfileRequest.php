<?php

namespace App\Http\Requests\Vendor;

use App\Models\Vendor;
// Start Update 14 September 2026, by @WNP: Reuse Indonesian mobile-number rules for VMS profile edits.
use App\Support\IndonesianMobilePhone;
// Start Update 11 September 2026, by @WNP: Validate profile locations against the shared Indonesian region dataset.
use App\Support\IndonesiaRegions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    // Start Update 14 September 2026, by @WNP: Keep profile contact numbers in the same 08 format as onboarding.
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('contact_phone'))) {
            $this->merge(['contact_phone' => IndonesianMobilePhone::normalize($this->input('contact_phone'))]);
        }
    }

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
        /** @var \App\Models\User|null $user */
        $user = Auth::user();
        $vendor = $user?->vendor;
        // Start Update 11 September 2026, by @WNP: Resolve valid regencies and cities from the submitted Indonesian province.
        $province = (string) $this->input('state');

        if ($vendor && $vendor->status !== Vendor::STATUS_DRAFT) {
            // After submission, contact + bank fields are editable (not company details).
            return [
                'contact_person' => 'required|string|max:255',
                // Start Update 14 September 2026, by @WNP: Validate submitted vendor contact numbers in Indonesian mobile format.
                'contact_phone' => ['required', 'string', 'regex:'.IndonesianMobilePhone::LOCAL_REGEX],
                'address' => 'required|string|max:500',
                // Start Update 11 September 2026, by @WNP: Enforce Indonesian location values for submitted vendor profiles.
                'city' => ['required', 'string', 'max:100', Rule::in(IndonesiaRegions::citiesFor($province))],
                'state' => ['required', 'string', 'max:100', Rule::in(IndonesiaRegions::provinces())],
                'pincode' => ['required', 'string', 'regex:/^[0-9]{5}$/'],
                'bank_name' => 'required|string|max:255',
                'bank_account_number' => ['required', 'string', 'regex:/^[0-9]{9,18}$/'],
                // Start Update 11 September 2026, by @WNP: Validate Indonesian bank code for submitted vendor profiles.
                'bank_ifsc' => ['required', 'string', 'regex:/^[0-9]{3}$/'],
                'bank_branch' => 'required|string|max:255',
            ];
        }

        return [
            'company_name' => 'required|string|max:255',
            'registration_number' => 'nullable|string|max:50',
            'tax_id' => 'nullable|string|max:50',
            'pan_number' => 'required|string|max:20',
            'business_type' => 'nullable|string|max:50',
            'contact_person' => 'required|string|max:255',
            // Start Update 14 September 2026, by @WNP: Apply the same Indonesian mobile rule to draft profiles.
            'contact_phone' => ['required', 'string', 'regex:'.IndonesianMobilePhone::LOCAL_REGEX],
            'address' => 'required|string|max:500',
            // Start Update 11 September 2026, by @WNP: Enforce Indonesian location values for draft vendor profiles.
            'city' => ['required', 'string', 'max:100', Rule::in(IndonesiaRegions::citiesFor($province))],
            'state' => ['required', 'string', 'max:100', Rule::in(IndonesiaRegions::provinces())],
            'pincode' => ['required', 'string', 'regex:/^[0-9]{5}$/'],
            'bank_name' => 'required|string|max:255',
            'bank_account_number' => ['required', 'string', 'regex:/^[0-9]{9,18}$/'],
            // Start Update 11 September 2026, by @WNP: Validate Indonesian bank code for draft vendor profiles.
            'bank_ifsc' => ['required', 'string', 'regex:/^[0-9]{3}$/'],
            'bank_branch' => 'required|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            // Start Update 14 September 2026, by @WNP: Keep the VMS mobile validation message concise.
            'contact_phone.regex' => 'Enter a valid mobile number (e.g. 081234567890 or +6281234567890).',
            // Start Update 11 September 2026, by @WNP: Return location validation messages using Indonesian address terminology.
            'state.in' => 'Please select a valid Indonesian province.',
            'city.in' => 'Please select a valid regency or city for the selected province.',
            'pincode.regex' => 'Postal code must be exactly 5 digits.',
            'bank_account_number.regex' => 'Account number must be 9 to 18 digits.',
            // Start Update 11 September 2026, by @WNP: Return Indonesian bank code terminology in validation errors.
            'bank_ifsc.regex' => 'Bank Code must be exactly 3 digits.',
        ];
    }
}
