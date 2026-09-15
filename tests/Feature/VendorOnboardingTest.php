<?php

namespace Tests\Feature;

use App\Models\DocumentType;
use App\Models\Role;
use App\Models\User;
use App\Models\Vendor;
use App\Notifications\VendorApplicationSubmitted;
// Start Update 11 September 2026, by @WNP: Verifikasi snapshot wilayah Indonesia yang digunakan frontend dan backend.
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
            'display_name' => 'PAN Card',
            'is_mandatory' => true,
            'is_active' => true,
        ]);

        Storage::fake('private');
    }

    public function test_vendor_can_save_step_1_company_info()
    {
        // Start Update 11 September 2026, by @WNP: Gunakan pasangan provinsi, kota, dan kode pos Indonesia yang valid.
        $response = $this->actingAs($this->vendorUser)
            ->post(route('vendor.onboarding.step1'), [
                'company_name' => 'Test Company',
                'registration_number' => 'U12345MH2023PTC123456',
                'tax_id' => '22AAAAA0000A1Z5',
                'business_type' => 'pvt_ltd',
                'contact_person' => 'Test Person',
                // Start Update 14 September 2026, by @WNP: Submit an Indonesian mobile number during VMS onboarding.
                'contact_phone' => '081234567890',
                'pan_number' => 'ABCDE1234F',
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
        $this->assertSame('081234567890', $application->data['step1']['contact_phone']);
    }

    // Start Update 14 September 2026, by @WNP: Pastikan lokasi yang tidak didukung dan kode pos enam digit ditolak oleh backend.
    public function test_vendor_cannot_save_indian_location_or_six_digit_postal_code(): void
    {
        $response = $this->actingAs($this->vendorUser)
            ->from(route('vendor.onboarding'))
            ->post(route('vendor.onboarding.step1'), [
                'company_name' => 'Test Company',
                'registration_number' => 'U12345MH2023PTC123456',
                'tax_id' => '22AAAAA0000A1Z5',
                'business_type' => 'pvt_ltd',
                'contact_person' => 'Test Person',
                // Start Update 14 September 2026, by @WNP: Keep the contact number valid while testing address errors.
                'contact_phone' => '081234567890',
                'pan_number' => 'ABCDE1234F',
                'address' => '123 Test St',
                'city' => 'Mumbai',
                'state' => 'Maharashtra',
                'pincode' => '400001',
            ]);

        $response
            ->assertRedirect(route('vendor.onboarding'))
            ->assertSessionHasErrors(['city', 'state', 'pincode']);
    }

    // Start Update 14 September 2026, by @WNP: Normalize an accepted +62 mobile number before saving the VMS application.
    public function test_vendor_can_save_international_mobile_number_as_local_format(): void
    {
        $this->actingAs($this->vendorUser)
            ->post(route('vendor.onboarding.step1'), [
                'company_name' => 'Test Company',
                'registration_number' => 'U12345MH2023PTC123456',
                'tax_id' => '22AAAAA0000A1Z5',
                'business_type' => 'pvt_ltd',
                'contact_person' => 'Test Person',
                'contact_phone' => '+6281234567890',
                'pan_number' => 'ABCDE1234F',
                'address' => '123 Test St',
                'city' => 'Kota Bandung',
                'state' => 'Jawa Barat',
                'pincode' => '40115',
            ])
            ->assertRedirect(route('vendor.onboarding', ['step' => 2]));

        $application = \App\Models\VendorApplication::where('user_id', $this->vendorUser->id)->firstOrFail();
        $this->assertSame('081234567890', $application->data['step1']['contact_phone']);
    }

    // Start Update 14 September 2026, by @WNP: Reject unsupported prefixes and mobile numbers beyond the input limit.
    public function test_vendor_cannot_save_invalid_mobile_number(): void
    {
        foreach (['9876543210', '081234567', '08123456789012', '+62081234567890'] as $number) {
            $this->actingAs($this->vendorUser)
                ->from(route('vendor.onboarding'))
                ->post(route('vendor.onboarding.step1'), ['contact_phone' => $number])
                ->assertSessionHasErrors([
                    'contact_phone' => 'Enter a valid mobile number (e.g. 081234567890 or +6281234567890).',
                ]);
        }
    }

    // Start Update 14 September 2026, by @WNP: Apply the same mobile normalization when editing a submitted VMS profile.
    public function test_submitted_vendor_profile_normalizes_international_mobile_number(): void
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
                'bank_ifsc' => '008',
                'bank_branch' => 'KCP Jakarta Menteng',
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame('081234567890', $vendor->fresh()->contact_phone);
        $this->assertSame('081234567890', $this->vendorUser->fresh()->phone);
    }

    // Start Update 11 September 2026, by @WNP: Pastikan snapshot wilayah memuat 38 provinsi dan 514 kabupaten/kota.
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
                // Start Update 11 September 2026, by @WNP: Use Indonesian bank information in step two validation.
                'bank_name' => 'Bank Mandiri',
                'bank_account_number' => '1234567890',
                'bank_ifsc' => '008',
                'bank_branch' => 'KCP Jakarta Menteng',
            ]);

        $response->assertRedirect(route('vendor.onboarding', ['step' => 3]));

        $application = \App\Models\VendorApplication::where('user_id', $this->vendorUser->id)->first();
        $this->assertEquals('Bank Mandiri', $application->data['step2']['bank_name']);
        $this->assertEquals(3, $application->current_step);
    }

    // Start Update 11 September 2026, by @WNP: Ensure India-only IFSC values are rejected by Indonesian bank validation.
    public function test_vendor_cannot_save_an_ifsc_as_an_indonesian_bank_code(): void
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
                'bank_ifsc' => 'SBIN0001234',
                'bank_branch' => 'Mumbai Main',
            ]);

        $response
            ->assertRedirect(route('vendor.onboarding', ['step' => 2]))
            ->assertSessionHasErrors(['bank_ifsc']);
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

        $file = UploadedFile::fake()->create('pan.pdf', 100);

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
                // Start Update 11 September 2026, by @WNP: Simpan lokasi vendor Indonesia saat aplikasi dikirim.
                'step1' => [
                    'company_name' => 'Test Company',
                    'contact_person' => 'Test Person',
                    // Start Update 14 September 2026, by @WNP: Use an Indonesian mobile number in the VMS submission fixture.
                    'contact_phone' => '081234567890',
                    'pan_number' => 'ABCDE1234F',
                    'address' => '123 Test St',
                    'city' => 'Kota Bandung',
                    'state' => 'Jawa Barat',
                    'pincode' => '40115',
                    'contact_email' => $this->vendorUser->email,
                ],
                // Start Update 11 September 2026, by @WNP: Persist Indonesian bank information on submission.
                'step2' => [
                    'bank_name' => 'Bank Mandiri',
                    'bank_account_number' => '1234567890',
                    'bank_ifsc' => '008',
                ],
                // Step 3 will be set up with a real temp file
            ],
        ]);

        // Create a real temp file
        $file = UploadedFile::fake()->create('pan.pdf', 100);
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
