<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\Vendor;
use Illuminate\Database\Eloquent\Factories\Factory;

class VendorFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Vendor::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'company_name' => $this->faker->company(),
            // Start Update 16 September 2026, by @WNP: Generate Indonesian NIB and NPWP fixture values for new vendors.
            'registration_number' => $this->faker->numerify('#############'),
            'tax_id' => $this->faker->numerify('################'),
            // Start Update 16 September 2026, by @WNP: Generate a deed number for complete vendor fixtures.
            'deed_number' => 'DEED-'.$this->faker->unique()->numerify('######'),
            'business_type' => $this->faker->randomElement(['proprietorship', 'partnership', 'private_limited']),
            'contact_person' => $this->faker->name(),
            'contact_email' => $this->faker->companyEmail(),
            // Start Update 14 September 2026, by @WNP: Generate valid Indonesian VMS mobile numbers for new vendor fixtures.
            'contact_phone' => $this->faker->numerify('0812########'),
            'address' => $this->faker->address(),
            // Start Update 11 September 2026, by @WNP: Generate internally consistent Indonesian location fixtures.
            'city' => 'Kota Bandung',
            'state' => 'Jawa Barat',
            'country' => 'Indonesia',
            'pincode' => $this->faker->numerify('40###'),
            // Start Update 16 September 2026, by @WNP: Use a recognized Indonesian bank in generated vendor fixtures.
            'bank_name' => 'Bank Mandiri',
            'bank_account_number' => $this->faker->numerify('#############'),
            // Start Update 11 September 2026, by @WNP: Generate an Indonesian three-digit bank code fixture.
            'bank_ifsc' => '008',
            'status' => Vendor::STATUS_DRAFT,
            'compliance_status' => Vendor::COMPLIANCE_PENDING,
            'compliance_score' => $this->faker->numberBetween(0, 100),
            'performance_score' => $this->faker->numberBetween(0, 100),
        ];
    }
}
