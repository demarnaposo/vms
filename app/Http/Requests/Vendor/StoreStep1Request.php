<?php

namespace App\Http\Requests\Vendor;

// Start Update 14 September 2026, by @WNP: Validate VMS contact numbers using Indonesia's mobile format.
use App\Support\IndonesianMobilePhone;
// Start Update 11 September 2026, by @WNP: Validate onboarding locations against the shared Indonesian region dataset.
use App\Support\IndonesiaRegions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class StoreStep1Request extends FormRequest
{
    // Start Update 14 September 2026, by @WNP: Store accepted +62 contact numbers consistently as 08 numbers.
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
        // Start Update 11 September 2026, by @WNP: Resolve valid regencies and cities from the submitted Indonesian province.
        $province = (string) $this->input('state');

        return [
            'company_name' => 'required|string|max:255',
            'registration_number' => [
                'required',
                'string',
                'max:21',
                'regex:/^([UL][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}|[A-Z]{3}-[0-9]{4})$/',
            ],
            'tax_id' => [
                'required',
                'string',
                'size:15',
                'regex:/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/',
            ],
            'pan_number' => ['required', 'string', 'regex:/^[A-Z]{5}[0-9]{4}[A-Z]$/'],
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
            'registration_number.required' => 'Registration Number (CIN / LLPIN) is required.',
            'registration_number.regex' => 'Enter a valid CIN (e.g. U12345MH2020PTC123456) or LLPIN (e.g. AAA-1234).',
            'tax_id.required' => 'GST Number is required.',
            'tax_id.size' => 'GST Number must be exactly 15 characters.',
            'tax_id.regex' => 'Enter a valid GSTIN (e.g. 22AAAAA0000A1Z5).',
            'pan_number.regex' => 'PAN must be in the format ABCDE1234F (5 letters, 4 digits, 1 letter).',
            // Start Update 14 September 2026, by @WNP: Keep the VMS mobile validation message concise.
            'contact_phone.regex' => 'Enter a valid mobile number (e.g. 081234567890 or +6281234567890).',
            // Start Update 11 September 2026, by @WNP: Return location validation messages using Indonesian address terminology.
            'state.in' => 'Please select a valid Indonesian province.',
            'city.in' => 'Please select a valid regency or city for the selected province.',
            'pincode.regex' => 'Postal code must be exactly 5 digits.',
        ];
    }
}
