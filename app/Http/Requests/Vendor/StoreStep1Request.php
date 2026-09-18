<?php

namespace App\Http\Requests\Vendor;

// Start Update 16 September 2026, by @WNP: Normalize NIB and NPWP using Indonesia's digits-only identifier format.
use App\Support\IndonesianBusinessIdentifier;
// Start Update 14 September 2026, by @WNP: Validate VMS contact numbers using Indonesia's mobile format.
use App\Support\IndonesianMobilePhone;
// Start Update 11 September 2026, by @WNP: Validate onboarding locations against the shared Indonesian region dataset.
use App\Support\IndonesiaRegions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class StoreStep1Request extends FormRequest
{
    // Start Update 16 September 2026, by @WNP: Normalize Indonesian company identifiers and mobile numbers before validation.
    protected function prepareForValidation(): void
    {
        // Start Update 16 September 2026, by @WNP: Accept formatted Indonesian identifiers and persist their canonical digits.
        $this->merge([
            'registration_number' => IndonesianBusinessIdentifier::normalize($this->input('registration_number')),
            'tax_id' => IndonesianBusinessIdentifier::normalize($this->input('tax_id')),
        ]);

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
        // Start Update 11 September 2026, by @WNP: Resolve valid regencies and cities from the submitted Indonesian province.
        $province = (string) $this->input('state');

        return [
            'company_name' => 'required|string|max:255',
            // Start Update 16 September 2026, by @WNP: Replace legacy foreign identifiers with Indonesian NIB and NPWP rules.
            'registration_number' => ['required', 'string', 'regex:/^[0-9]{13}$/'],
            'tax_id' => ['required', 'string', 'regex:/^[0-9]{15,16}$/'],
            // Start Update 16 September 2026, by @WNP: Require the deed number as part of vendor company verification.
            'deed_number' => ['required', 'string', 'max:100'],
            'business_type' => 'required|string|max:50',
            'contact_person' => 'required|string|max:255',
            // Start Update 14 September 2026, by @WNP: Accept Indonesian mobile numbers of 10 to 13 local digits.
            'contact_phone' => ['required', 'string', 'regex:'.IndonesianMobilePhone::LOCAL_REGEX],
            'address' => 'required|string|max:500',
            // Start Update 11 September 2026, by @WNP: Enforce valid Indonesian province, regency/city, and five-digit postal code values.
            'city' => ['required', 'string', 'max:100', Rule::in(IndonesiaRegions::citiesFor($province))],
            'state' => ['required', 'string', 'max:100', Rule::in(IndonesiaRegions::provinces())],
            'pincode' => ['required', 'string', 'regex:/^[0-9]{5}$/'],
        ];
    }

    public function messages(): array
    {
        return [
            // Start Update 16 September 2026, by @WNP: Return stable validation messages for every required company field.
            'company_name.required' => 'Company Name is required.',
            'company_name.max' => 'Company Name may not exceed 255 characters.',
            // Start Update 16 September 2026, by @WNP: Return Indonesian business-identifier validation messages.
            'registration_number.required' => 'Business Identification Number (NIB) is required.',
            'registration_number.regex' => 'Business Identification Number (NIB) must be exactly 13 digits.',
            'tax_id.required' => 'Taxpayer Identification Number (NPWP) is required.',
            'tax_id.regex' => 'Taxpayer Identification Number (NPWP) must be 15 or 16 digits.',
            // Start Update 16 September 2026, by @WNP: Return a specific message for the required deed number.
            'deed_number.required' => 'Deed of Establishment Number is required.',
            'deed_number.max' => 'Deed of Establishment Number may not exceed 100 characters.',
            'business_type.required' => 'Business Type is required.',
            'contact_person.required' => 'Contact Person is required.',
            'contact_person.max' => 'Contact Person may not exceed 255 characters.',
            'contact_phone.required' => 'Phone Number / Mobile is required.',
            // Start Update 14 September 2026, by @WNP: Keep the VMS mobile validation message concise.
            'contact_phone.regex' => 'Enter a valid mobile number (e.g. 081234567890 or +6281234567890).',
            'address.required' => 'Address is required.',
            'address.max' => 'Address may not exceed 500 characters.',
            'state.required' => 'Province is required.',
            'city.required' => 'Regency or city is required.',
            'pincode.required' => 'Postal code is required.',
            // Start Update 11 September 2026, by @WNP: Return location validation messages using Indonesian address terminology.
            'state.in' => 'Please select a valid Indonesian province.',
            'city.in' => 'Please select a valid regency or city for the selected province.',
            'pincode.regex' => 'Postal code must be exactly 5 digits.',
        ];
    }
}
