<?php

namespace App\Http\Requests\Vendor;

// Normalize NIB and NPWP using Indonesia's digits-only identifier format.
use App\Support\IndonesianBusinessIdentifier;
// Validate VMS contact numbers using Indonesia's mobile format.
use App\Support\IndonesianMobilePhone;
// Validate onboarding locations against the shared Indonesian region dataset.
use App\Support\IndonesiaRegions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class StoreStep1Request extends FormRequest
{
    // Normalize Indonesian company identifiers and mobile numbers before validation.
    protected function prepareForValidation(): void
    {
        // Accept formatted Indonesian identifiers and persist their canonical digits.
        $this->merge([
            'business_identification_number' => IndonesianBusinessIdentifier::normalize($this->input('business_identification_number')),
            'tax_id' => IndonesianBusinessIdentifier::normalize($this->input('tax_id')),
        ]);

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
        // Resolve valid regencies and cities from the submitted Indonesian province.
        $province = is_string($this->input('state')) ? $this->input('state') : '';

        return [
            'company_name' => 'required|string|max:255',
            // Replace legacy foreign identifiers with Indonesian NIB and NPWP rules.
            'business_identification_number' => ['required', 'string', 'regex:/^[0-9]{13}$/'],
            'tax_id' => ['required', 'string', 'regex:/^[0-9]{15,16}$/'],
            // Require the deed number as part of vendor company verification.
            'deed_number' => ['required', 'string', 'max:100'],
            'business_type' => ['bail', 'required', 'string', 'max:50', function ($attribute, $value, $fail): void {
                try {
                    $service = app(\App\Services\BusinessTypeService::class);
                    $service->validateSelection($value, $service->previousValues($this->user()));
                } catch (\Illuminate\Validation\ValidationException $e) {
                    $fail($e->errors()['business_type'][0]);
                }
            }],
            'category_id' => ['bail', 'required', 'integer', function ($attribute, $value, $fail): void {
                $service = app(\App\Services\VendorCategoryService::class);
                try {
                    $service->validateSelection($value, $service->previousValues($this->user()));
                } catch (\Illuminate\Validation\ValidationException $e) {
                    $fail($e->errors()['category_id'][0]);
                }
            }],
            'experience' => ['required', 'string', 'max:2000'],
            'contact_person' => 'required|string|max:255',
            // Accept Indonesian mobile numbers of 10 to 13 local digits.
            'contact_phone' => ['required', 'string', 'regex:'.IndonesianMobilePhone::LOCAL_REGEX],
            'address' => 'required|string|max:500',
            // Enforce valid Indonesian province, regency/city, and five-digit postal code values.
            'city' => ['required', 'string', 'max:100', Rule::in(IndonesiaRegions::citiesFor($province))],
            'state' => ['required', 'string', 'max:100', Rule::in(IndonesiaRegions::provinces())],
            'pincode' => ['required', 'string', 'regex:/^[0-9]{5}$/'],
        ];
    }

    public function messages(): array
    {
        return [
            // Return stable validation messages for every required company field.
            'company_name.required' => 'Company Name is required.',
            'company_name.max' => 'Company Name may not exceed 255 characters.',
            // Return Indonesian business-identifier validation messages.
            'business_identification_number.required' => 'Business Identification Number (NIB) is required.',
            'business_identification_number.regex' => 'Business Identification Number (NIB) must be exactly 13 digits.',
            'tax_id.required' => 'Taxpayer Identification Number (NPWP) is required.',
            'tax_id.regex' => 'Taxpayer Identification Number (NPWP) must be 15 or 16 digits.',
            // Return a specific message for the required deed number.
            'deed_number.required' => 'Deed of Establishment Number is required.',
            'deed_number.max' => 'Deed of Establishment Number may not exceed 100 characters.',
            'business_type.required' => 'Business Type is required.',
            'business_type.string' => 'Business Type must be text.',
            'business_type.max' => 'Business Type may not exceed 50 characters.',
            'contact_person.required' => 'Contact Person is required.',
            'contact_person.max' => 'Contact Person may not exceed 255 characters.',
            'category_id.required' => 'Category is required.',
            'category_id.exists' => 'Please select a valid category.',
            'experience.required' => 'Experience is required.',
            'experience.max' => 'Experience may not exceed 2000 characters.',
            'contact_phone.required' => 'WhatsApp Number is required.',
            'contact_phone.regex' => 'WhatsApp Number must start with 08 and contain digits only.',
            'address.required' => 'Address is required.',
            'address.max' => 'Address may not exceed 500 characters.',
            'state.required' => 'Province is required.',
            'city.required' => 'Regency or city is required.',
            'pincode.required' => 'Postal code is required.',
            // Return location validation messages using Indonesian address terminology.
            'state.in' => 'Please select a valid Indonesian province.',
            'city.in' => 'Please select a valid regency or city for the selected province.',
            'pincode.regex' => 'Postal code must be exactly 5 digits.',
        ];
    }
}
