<?php

namespace Tests\Feature;

use App\Models\DocumentType;
use App\Models\Role;
use App\Models\User;
use App\Models\Vendor;
use App\Models\VendorApplication;
use App\Models\VendorCategory;
use App\Notifications\VendorApplicationSubmitted;
// Verifikasi snapshot wilayah Indonesia yang digunakan frontend dan backend.
use App\Support\IndonesiaRegions;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class VendorOnboardingTest extends TestCase
{
    use RefreshDatabase;

    protected $vendorUser;

    protected $opsUser;

    protected $documentType;

    protected $categoryId;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed roles
        Role::firstOrCreate(['name' => 'vendor'], ['display_name' => 'Vendor']);
        Role::firstOrCreate(['name' => 'ops_manager'], ['display_name' => 'Ops Manager']);

        // Create Vendor User
        $this->vendorUser = User::factory()->create();
        $this->vendorUser->roles()->attach(Role::where('name', 'vendor')->first());

        // Create Ops User for onboarding notifications
        $this->opsUser = User::factory()->create();
        $this->opsUser->roles()->attach(Role::where('name', 'ops_manager')->first());

        // Create Document Type
        $this->documentType = DocumentType::create([
            'name' => 'pan_card',
            // Use the NIB document label for onboarding coverage.
            'display_name' => 'Business Identification Number (NIB) Document',
            'is_mandatory' => true,
            'is_active' => true,
        ]);

        $this->categoryId = VendorCategory::create([
            'code' => 'test_services',
            'display_name' => 'Test Services',
            'is_active' => true,
        ])->id;

        Storage::fake('private');
    }

    public function test_vendor_can_save_step_1_company_info()
    {
        // Gunakan pasangan provinsi, kota, dan kode pos Indonesia yang valid.
        $response = $this->actingAs($this->vendorUser)
            ->post(route('vendor.onboarding.step1'), [
                'company_name' => 'Test Company',
                // Exercise Indonesian NIB and NPWP onboarding values.
                'business_identification_number' => '1234567890123',
                'tax_id' => '0123456789012345',
                'deed_number' => 'DEED-000001',
                'business_type' => 'pvt_ltd',
                'category_id' => $this->categoryId,
                'experience' => 'Software procurement for PT Example in 2025.',
                'vendor_number' => 'V999',
                'contact_person' => 'Test Person',
                // Submit an Indonesian mobile number during VMS onboarding.
                'contact_phone' => '081234567890',
                'address' => '123 Test St',
                'city' => 'Kota Bandung',
                'state' => 'Jawa Barat',
                'pincode' => '40115',
            ]);

        $response->assertRedirect(route('vendor.onboarding', ['step' => 2]));

        $this->assertDatabaseHas('vendor_applications', [
            'user_id' => $this->vendorUser->id,
            'current_step' => 2,
        ]);

        $application = \App\Models\VendorApplication::where('user_id', $this->vendorUser->id)->first();
        $this->assertEquals('Test Company', $application->data['step1']['company_name']);
        $this->assertSame('1234567890123', $application->data['step1']['business_identification_number']);
        $this->assertSame('0123456789012345', $application->data['step1']['tax_id']);
        $this->assertSame('DEED-000001', $application->data['step1']['deed_number']);
        $this->assertSame('081234567890', $application->data['step1']['contact_phone']);
        $this->assertSame($this->categoryId, $application->data['step1']['category_id']);
        $this->assertSame(
            'Software procurement for PT Example in 2025.',
            $application->data['step1']['experience']
        );
        $this->assertArrayNotHasKey('vendor_number', $application->data['step1']);
    }

    // Keep backend required-field messages aligned with the onboarding form.
    public function test_step_1_returns_specific_errors_for_all_required_company_fields(): void
    {
        $this->actingAs($this->vendorUser)
            ->post(route('vendor.onboarding.step1'), [])
            ->assertSessionHasErrors([
                'company_name' => 'Company Name is required.',
                'business_identification_number' => 'Business Identification Number (NIB) is required.',
                'tax_id' => 'Taxpayer Identification Number (NPWP) is required.',
                'deed_number' => 'Deed of Establishment Number is required.',
                'business_type' => 'Business Type is required.',
                'category_id' => 'Category is required.',
                'experience' => 'Experience is required.',
                'contact_person' => 'Contact Person is required.',
                'contact_phone' => 'WhatsApp Number is required.',
                'address' => 'Address is required.',
                'state' => 'Province is required.',
                'city' => 'Regency or city is required.',
                'pincode' => 'Postal code is required.',
            ]);
    }

    public function test_step_1_rejects_the_legacy_registration_number_request_key(): void
    {
        $this->actingAs($this->vendorUser)
            ->post(route('vendor.onboarding.step1'), [
                'company_name' => 'Test Company',
                'registration_number' => '1234567890123',
                'tax_id' => '0123456789012345',
                'deed_number' => 'DEED-000001',
                'business_type' => 'pvt_ltd',
                'category_id' => $this->categoryId,
                'experience' => 'Software procurement for PPM Manajemen in 2025.',
                'contact_person' => 'Test Person',
                'contact_phone' => '081234567890',
                'address' => '123 Test St',
                'city' => 'Kota Bandung',
                'state' => 'Jawa Barat',
                'pincode' => '40115',
            ])
            ->assertSessionHasErrors([
                'business_identification_number' => 'Business Identification Number (NIB) is required.',
            ]);

        $this->assertDatabaseMissing('vendor_applications', [
            'user_id' => $this->vendorUser->id,
        ]);
    }

    public function test_legacy_draft_nib_key_is_mapped_and_rewritten_on_the_next_save(): void
    {
        $application = VendorApplication::create([
            'user_id' => $this->vendorUser->id,
            'current_step' => 2,
            'status' => 'draft',
            'data' => [
                'step1' => [
                    'company_name' => 'Legacy Draft Company',
                    'registration_number' => '1234567890123',
                ],
            ],
        ]);

        $this->actingAs($this->vendorUser)
            ->get(route('vendor.onboarding', ['step' => 1]))
            ->assertInertia(fn ($page) => $page
                ->where('sessionData.step1.business_identification_number', '1234567890123')
                ->missing('sessionData.step1.registration_number'));

        $this->actingAs($this->vendorUser)
            ->post(route('vendor.onboarding.step2'), [
                'bank_name' => 'Bank Mandiri',
                'bank_account_number' => '1234567890',
                'code_bank' => '008',
                'bank_branch' => 'KCP Jakarta Menteng',
            ])
            ->assertRedirect(route('vendor.onboarding', ['step' => 3]));

        $step1 = $application->fresh()->data['step1'];
        $this->assertSame('1234567890123', $step1['business_identification_number']);
        $this->assertArrayNotHasKey('registration_number', $step1);
    }

    // Accept formatted identifiers and reject invalid NIB or NPWP lengths.
    public function test_vendor_company_identifiers_follow_indonesian_formats(): void
    {
        $validPayload = [
            'company_name' => 'Test Company',
            'business_identification_number' => '1234-5678-90123',
            'tax_id' => '01.234.567.8-901.234',
            'deed_number' => 'DEED-000001',
            'business_type' => 'pvt_ltd',
            'category_id' => $this->categoryId,
            'experience' => 'Software procurement for PT Example in 2025.',
            'contact_person' => 'Test Person',
            'contact_phone' => '081234567890',
            'address' => '123 Test St',
            'city' => 'Kota Bandung',
            'state' => 'Jawa Barat',
            'pincode' => '40115',
        ];

        $this->actingAs($this->vendorUser)
            ->post(route('vendor.onboarding.step1'), $validPayload)
            ->assertSessionHasNoErrors();

        $application = \App\Models\VendorApplication::where('user_id', $this->vendorUser->id)->firstOrFail();
        $this->assertSame('1234567890123', $application->data['step1']['business_identification_number']);
        $this->assertSame('012345678901234', $application->data['step1']['tax_id']);

        $this->actingAs($this->vendorUser)
            ->post(route('vendor.onboarding.step1'), array_merge($validPayload, [
                'business_identification_number' => '123456789012',
                'tax_id' => '12345678901234',
            ]))
            ->assertSessionHasErrors(['business_identification_number', 'tax_id'])
            ->assertSessionHasInput('business_identification_number', '123456789012');

        // Reject an application without the required deed number.
        $this->actingAs($this->vendorUser)
            ->post(route('vendor.onboarding.step1'), array_merge($validPayload, [
                'deed_number' => '',
            ]))
            ->assertSessionHasErrors(['deed_number']);
    }

    public function test_vendor_category_and_experience_are_validated(): void
    {
        $payload = [
            'company_name' => 'Test Company',
            'business_identification_number' => '1234567890123',
            'tax_id' => '0123456789012345',
            'deed_number' => 'DEED-000001',
            'business_type' => 'pvt_ltd',
            'category_id' => 999999,
            'experience' => str_repeat('a', 2001),
            'contact_person' => 'Test Person',
            'contact_phone' => '081234567890',
            'address' => '123 Test St',
            'city' => 'Kota Bandung',
            'state' => 'Jawa Barat',
            'pincode' => '40115',
        ];

        $this->actingAs($this->vendorUser)
            ->post(route('vendor.onboarding.step1'), $payload)
            ->assertSessionHasErrors([
                'category_id' => 'Please select a valid category.',
                'experience' => 'Experience may not exceed 2000 characters.',
            ]);

        $inactive = \App\Models\VendorCategory::create([
            'code' => 'inactive_category',
            'display_name' => 'Inactive Category',
            'is_active' => false,
        ]);
        $this->actingAs($this->vendorUser)
            ->post(route('vendor.onboarding.step1'), array_merge($payload, [
                'category_id' => $inactive->id,
                'experience' => 'Completed a prior project.',
            ]))
            ->assertSessionHasErrors(['category_id' => 'Please select a valid category.']);
    }

    // Pastikan lokasi yang tidak didukung dan kode pos enam digit ditolak oleh backend.
    public function test_vendor_cannot_save_indian_location_or_six_digit_postal_code(): void
    {
        $response = $this->actingAs($this->vendorUser)
            ->from(route('vendor.onboarding'))
            ->post(route('vendor.onboarding.step1'), [
                'company_name' => 'Test Company',
                'business_identification_number' => '1234567890123',
                'tax_id' => '0123456789012345',
                'deed_number' => 'DEED-000001',
                'business_type' => 'pvt_ltd',
                'category_id' => $this->categoryId,
                'experience' => 'Software procurement for PT Example in 2025.',
                'contact_person' => 'Test Person',
                // Keep the contact number valid while testing address errors.
                'contact_phone' => '081234567890',
                'address' => '123 Test St',
                'city' => 'Mumbai',
                'state' => 'Maharashtra',
                'pincode' => '400001',
            ]);

        $response
            ->assertRedirect(route('vendor.onboarding'))
            ->assertSessionHasErrors(['city', 'state', 'pincode']);
    }

    public function test_vendor_rejects_non_local_whatsapp_formats(): void
    {
        $this->actingAs($this->vendorUser)
            ->post(route('vendor.onboarding.step1'), [
                'company_name' => 'Test Company',
                'business_identification_number' => '1234567890123',
                'tax_id' => '0123456789012345',
                'deed_number' => 'DEED-000001',
                'business_type' => 'pvt_ltd',
                'category_id' => $this->categoryId,
                'experience' => 'Software procurement for PT Example in 2025.',
                'contact_person' => 'Test Person',
                'contact_phone' => '+6281234567890',
                'address' => '123 Test St',
                'city' => 'Kota Bandung',
                'state' => 'Jawa Barat',
                'pincode' => '40115',
            ])
            ->assertSessionHasErrors([
                'contact_phone' => 'WhatsApp Number must start with 08 and contain digits only.',
            ]);
    }

    // Reject unsupported prefixes and mobile numbers beyond the input limit.
    public function test_vendor_cannot_save_invalid_mobile_number(): void
    {
        foreach (['9876543210', '081234567', '08123456789012', '+6281234567890', '0812 3456 7890', '0812-3456-7890', '0812abc56789'] as $number) {
            $this->actingAs($this->vendorUser)
                ->from(route('vendor.onboarding'))
                ->post(route('vendor.onboarding.step1'), ['contact_phone' => $number])
                ->assertSessionHasErrors([
                    'contact_phone' => 'WhatsApp Number must start with 08 and contain digits only.',
                ]);
        }
    }

    public function test_submitted_vendor_profile_rejects_international_whatsapp_number(): void
    {
        $vendor = Vendor::factory()->create([
            'user_id' => $this->vendorUser->id,
            'status' => Vendor::STATUS_SUBMITTED,
        ]);

        $this->actingAs($this->vendorUser)
            ->put(route('vendor.profile.update'), [
                'contact_person' => 'Test Person',
                'contact_phone' => '+6281234567890',
                'address' => '123 Test St',
                'city' => 'Kota Bandung',
                'state' => 'Jawa Barat',
                'pincode' => '40115',
                'bank_name' => 'Bank Mandiri',
                'bank_account_number' => '1234567890',
                'code_bank' => '008',
                'bank_branch' => 'KCP Jakarta Menteng',
            ])
            ->assertSessionHasErrors([
                'contact_phone' => 'WhatsApp Number must start with 08 and contain digits only.',
            ]);

        $this->assertNotSame('+6281234567890', $vendor->fresh()->contact_phone);
    }

    // Pastikan snapshot wilayah memuat 38 provinsi dan 514 kabupaten/kota.
    public function test_indonesian_region_snapshot_is_complete(): void
    {
        $provinces = IndonesiaRegions::provinces();
        $cityCount = array_sum(array_map(
            fn (string $province): int => count(IndonesiaRegions::citiesFor($province)),
            $provinces
        ));

        $this->assertCount(38, $provinces);
        $this->assertSame(514, $cityCount);
        $this->assertContains('Kota Bandung', IndonesiaRegions::citiesFor('Jawa Barat'));
    }

    public function test_vendor_can_save_step_2_bank_details()
    {
        // Setup Step 1 data in DB
        \App\Models\VendorApplication::create([
            'user_id' => $this->vendorUser->id,
            'current_step' => 2,
            'status' => 'draft',
            'data' => [
                'step1' => ['company_name' => 'Test Co'],
            ],
        ]);

        $response = $this->actingAs($this->vendorUser)
            ->post(route('vendor.onboarding.step2'), [
                // Use Indonesian bank information in step two validation.
                'bank_name' => 'Bank Mandiri',
                'bank_account_number' => '1234567890',
                'code_bank' => '008',
                'bank_branch' => 'KCP Jakarta Menteng',
            ]);

        $response->assertRedirect(route('vendor.onboarding', ['step' => 3]));

        $application = \App\Models\VendorApplication::where('user_id', $this->vendorUser->id)->first();
        $this->assertEquals('Bank Mandiri', $application->data['step2']['bank_name']);
        $this->assertSame('008', $application->data['step2']['code_bank']);
        $this->assertArrayNotHasKey('bank_ifsc', $application->data['step2']);
        $this->assertEquals(3, $application->current_step);
    }

    public function test_vendor_cannot_save_an_invalid_bank_code_format(): void
    {
        \App\Models\VendorApplication::create([
            'user_id' => $this->vendorUser->id,
            'current_step' => 2,
            'status' => 'draft',
            'data' => [
                'step1' => ['company_name' => 'Test Co'],
            ],
        ]);

        $response = $this->actingAs($this->vendorUser)
            ->from(route('vendor.onboarding', ['step' => 2]))
            ->post(route('vendor.onboarding.step2'), [
                'bank_name' => 'State Bank of India',
                'bank_account_number' => '1234567890',
                'code_bank' => 'SBIN0001234',
                'bank_branch' => 'Mumbai Main',
            ]);

        $response
            ->assertRedirect(route('vendor.onboarding', ['step' => 2]))
            ->assertSessionHasErrors(['code_bank'])
            ->assertSessionHasInput('code_bank', 'SBIN0001234');
    }

    public function test_legacy_bank_ifsc_request_key_is_not_accepted(): void
    {
        VendorApplication::create([
            'user_id' => $this->vendorUser->id,
            'current_step' => 2,
            'status' => 'draft',
            'data' => [
                'step1' => ['company_name' => 'Test Co'],
            ],
        ]);

        $this->actingAs($this->vendorUser)
            ->post(route('vendor.onboarding.step2'), [
                'bank_name' => 'Bank Mandiri',
                'bank_account_number' => '1234567890',
                'bank_ifsc' => '008',
                'bank_branch' => 'KCP Jakarta Menteng',
            ])
            ->assertSessionHasErrors(['code_bank']);
    }

    public function test_legacy_draft_bank_key_is_mapped_and_rewritten_on_the_next_save(): void
    {
        $application = VendorApplication::create([
            'user_id' => $this->vendorUser->id,
            'current_step' => 2,
            'status' => 'draft',
            'data' => [
                'step1' => ['company_name' => 'Legacy Bank Draft'],
                'step2' => [
                    'bank_name' => 'Bank Mandiri',
                    'bank_account_number' => '1234567890',
                    'bank_ifsc' => '008',
                    'bank_branch' => 'KCP Jakarta Menteng',
                ],
            ],
        ]);

        $this->actingAs($this->vendorUser)
            ->get(route('vendor.onboarding', ['step' => 2]))
            ->assertInertia(fn ($page) => $page
                ->where('sessionData.step2.code_bank', '008')
                ->missing('sessionData.step2.bank_ifsc'));

        $this->actingAs($this->vendorUser)
            ->post(route('vendor.onboarding.step2'), [
                'bank_name' => 'Bank Mandiri',
                'bank_account_number' => '1234567890',
                'code_bank' => '008',
                'bank_branch' => 'KCP Jakarta Menteng',
            ])
            ->assertRedirect(route('vendor.onboarding', ['step' => 3]));

        $step2 = $application->fresh()->data['step2'];
        $this->assertSame('008', $step2['code_bank']);
        $this->assertArrayNotHasKey('bank_ifsc', $step2);
    }

    public function test_vendor_can_upload_documents_step_3()
    {
        // Setup previous steps
        \App\Models\VendorApplication::create([
            'user_id' => $this->vendorUser->id,
            'current_step' => 3,
            'status' => 'draft',
            'data' => [
                'step1' => ['company_name' => 'Test Co'],
                'step2' => ['bank_name' => 'Test Bank'],
            ],
        ]);

        $file = UploadedFile::fake()->createWithContent('pan.pdf', "%PDF-1.4\n%%EOF");

        $response = $this->actingAs($this->vendorUser)
            ->post(route('vendor.onboarding.step3'), [
                'documents' => [
                    [
                        'document_type_id' => $this->documentType->id,
                        'file' => $file,
                    ],
                ],
            ]);

        $response->assertRedirect(route('vendor.onboarding', ['step' => 4]));

        $application = \App\Models\VendorApplication::where('user_id', $this->vendorUser->id)->first();
        $this->assertNotEmpty($application->data['step3']['documents']);
        $this->assertEquals(4, $application->current_step);
        // The file path should contain the application ID
        $this->assertStringContainsString('vendor-applications/'.$application->id, $application->data['step3']['documents'][0]['file_path']);
    }

    public function test_vendor_can_submit_application()
    {
        Notification::fake();

        // create application record
        $application = \App\Models\VendorApplication::create([
            'user_id' => $this->vendorUser->id,
            'current_step' => 4,
            'status' => 'draft',
            'data' => [
                // Simpan lokasi vendor Indonesia saat aplikasi dikirim.
                'step1' => [
                    'company_name' => 'Test Company',
                    // Confirm historical drafts still submit through the current NIB column.
                    'registration_number' => '1234567890123',
                    'tax_id' => '0123456789012345',
                    'deed_number' => 'DEED-000001',
                    'business_type' => 'pvt_ltd',
                    'category_id' => $this->categoryId,
                    'experience' => 'Software procurement for PT Example in 2025.',
                    'vendor_number' => 'V999',
                    'contact_person' => 'Test Person',
                    // Use an Indonesian mobile number in the VMS submission fixture.
                    'contact_phone' => '081234567890',
                    'address' => '123 Test St',
                    'city' => 'Kota Bandung',
                    'state' => 'Jawa Barat',
                    'pincode' => '40115',
                    'contact_email' => $this->vendorUser->email,
                ],
                // Persist Indonesian bank information on submission.
                'step2' => [
                    'bank_name' => 'Bank Mandiri',
                    'bank_account_number' => '1234567890',
                    'code_bank' => '008',
                ],
                // Step 3 will be set up with a real temp file
            ],
        ]);

        // Create a real temp file
        $file = UploadedFile::fake()->createWithContent('pan.pdf', "%PDF-1.4\n%%EOF");
        $path = $file->store('vendor-applications/'.$application->id.'/temp', 'private');

        // Update application data with document info
        $data = $application->data;
        $data['step3'] = [
            'documents' => [
                [
                    'document_type_id' => $this->documentType->id,
                    'file_path' => $path,
                    'file_name' => 'pan.pdf',
                    'file_hash' => 'hash',
                    'file_size' => 100,
                    'mime_type' => 'application/pdf',
                    'verification_status' => 'pending',
                ],
            ],
        ];
        $application->update(['data' => $data]);

        $response = $this->actingAs($this->vendorUser)
            ->post(route('vendor.onboarding.submit'));

        $response->assertRedirect(route('vendor.dashboard'));

        // Verify Vendor created in DB
        $this->assertDatabaseHas('vendors', [
            'user_id' => $this->vendorUser->id,
            'company_name' => 'Test Company',
            'vendor_number' => 'V001',
            'business_identification_number' => '1234567890123',
            'category_id' => $this->categoryId,
            'experience' => 'Software procurement for PT Example in 2025.',
            'country' => 'Indonesia',
            'status' => Vendor::STATUS_SUBMITTED,
        ]);

        // Verify Document created
        $vendor = \App\Models\Vendor::where('user_id', $this->vendorUser->id)->first();
        $this->assertDatabaseHas('vendor_documents', [
            'vendor_id' => $vendor->id,
            'document_type_id' => $this->documentType->id,
        ]);

        // Check document was moved to final location
        $document = $vendor->documents->first();
        Storage::disk('private')->assertExists($document->file_path);

        // Check application status updated
        $this->assertDatabaseHas('vendor_applications', [
            'id' => $application->id,
            'status' => 'submitted',
        ]);

        Notification::assertSentTo($this->opsUser, VendorApplicationSubmitted::class);
    }
}
