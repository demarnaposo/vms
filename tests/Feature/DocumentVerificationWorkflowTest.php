<?php

namespace Tests\Feature;

use App\Models\DocumentType;
use App\Models\Role;
use App\Models\User;
use App\Models\Vendor;
use App\Models\VendorDocument;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DocumentVerificationWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private User $opsUser;

    private Vendor $vendor;

    private DocumentType $documentType;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(
            ['name' => Role::VENDOR],
            ['display_name' => 'Vendor']
        );
        Role::firstOrCreate(
            ['name' => Role::OPS_MANAGER],
            ['display_name' => 'Operations Manager']
        );

        $this->opsUser = User::factory()->create();
        $this->opsUser->assignRole(Role::OPS_MANAGER);

        $vendorUser = User::factory()->create();
        $vendorUser->assignRole(Role::VENDOR);

        $this->vendor = Vendor::create([
            'user_id' => $vendorUser->id,
            'company_name' => 'QA Vendor Co',
            'contact_person' => 'QA Contact',
            'contact_email' => $vendorUser->email,
            'contact_phone' => '9876543210',
            'status' => Vendor::STATUS_SUBMITTED,
            'compliance_status' => Vendor::COMPLIANCE_PENDING,
            'compliance_score' => 0,
            'deed_number' => 'DEED-000001',
            'address' => '123 QA Street',
            // Gunakan fixture lokasi Indonesia.
            'city' => 'Kota Bandung',
            'state' => 'Jawa Barat',
            'pincode' => '40115',
        ]);

        $this->documentType = DocumentType::create([
            'name' => 'pan_card',
            // Use the Indonesian NIB document label for the stable master key.
            'display_name' => 'NIB/OSS (Business Identification Number)',
            'description' => 'Deed verification',
            'is_mandatory' => true,
            'has_expiry' => false,
            'expiry_warning_days' => 30,
            'allowed_extensions' => ['pdf'],
            'max_file_size_mb' => 5,
            'is_active' => true,
        ]);
    }

    public function test_documents_index_defaults_to_pending_queue(): void
    {
        $pending = $this->createDocument(VendorDocument::STATUS_PENDING, 'pending-pan.pdf');
        $this->createDocument(VendorDocument::STATUS_VERIFIED, 'verified-pan.pdf');

        $response = $this->actingAs($this->opsUser)
            ->get(route('admin.documents.index'));

        $response->assertStatus(200);
        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Admin/Documents/Index')
                ->where('currentStatus', VendorDocument::STATUS_PENDING)
                ->has('documents.data', 1)
                ->where('documents.data.0.id', $pending->id)
        );
    }

    public function test_verify_action_updates_document_and_sets_specific_success_message(): void
    {
        $document = $this->createDocument(VendorDocument::STATUS_PENDING, 'verify-pan.pdf');

        $response = $this->actingAs($this->opsUser)
            ->post(route('admin.documents.verify', $document), [
                'notes' => 'Verified against official record',
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success', 'NIB/OSS (Business Identification Number) verified successfully.');

        $document->refresh();
        $this->assertSame(VendorDocument::STATUS_VERIFIED, $document->verification_status);
        $this->assertSame($this->opsUser->id, $document->verified_by);
        $this->assertNotNull($document->verified_at);
    }

    public function test_verify_action_blocks_already_processed_document(): void
    {
        $document = $this->createDocument(VendorDocument::STATUS_REJECTED, 'rejected-pan.pdf');

        $response = $this->actingAs($this->opsUser)
            ->post(route('admin.documents.verify', $document), [
                'notes' => 'Should not pass',
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('error', 'Only the current pending document can be reviewed.');

        $document->refresh();
        $this->assertSame(VendorDocument::STATUS_REJECTED, $document->verification_status);
        $this->assertNull($document->verified_by);
        $this->assertNull($document->verified_at);
    }

    public function test_historical_pending_document_is_not_actionable_but_remains_in_history(): void
    {
        $historical = $this->createDocument(VendorDocument::STATUS_PENDING, 'historical-pan.pdf');
        $historical->update(['is_current' => false]);
        $current = $this->createDocument(VendorDocument::STATUS_PENDING, 'current-pan.pdf');

        $this->actingAs($this->opsUser)
            ->get(route('admin.documents.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('documents.data', 1)
                ->where('documents.data.0.id', $current->id));

        $this->post(route('admin.documents.verify', $historical))
            ->assertSessionHas('error', 'Only the current pending document can be reviewed.');
        $this->post(route('admin.documents.reject', $historical), ['reason' => 'Outdated'])
            ->assertSessionHas('error', 'Only the current pending document can be reviewed.');

        $this->assertSame(VendorDocument::STATUS_PENDING, $historical->fresh()->verification_status);
        $this->get(route('admin.documents.index', ['status' => 'all']))
            ->assertInertia(fn (Assert $page) => $page->has('documents.data', 2));
    }

    // Verify alerts localize known VMS master document labels.
    public function test_document_actions_localize_system_master_document_type(): void
    {
        $verifiedDocument = $this->createDocument(VendorDocument::STATUS_PENDING, 'localize-verify-pan.pdf');
        $rejectedDocument = $this->createDocument(VendorDocument::STATUS_PENDING, 'localize-reject-pan.pdf');

        $this->actingAs($this->opsUser)
            ->withUnencryptedCookie('vms_locale', 'id')
            ->post(route('admin.documents.verify', $verifiedDocument))
            ->assertSessionHas('success', 'NIB/OSS (Nomor Induk Berusaha) berhasil diverifikasi.');

        $this->actingAs($this->opsUser)
            ->withUnencryptedCookie('vms_locale', 'id')
            ->post(route('admin.documents.reject', $rejectedDocument), ['reason' => 'Not valid'])
            ->assertSessionHas('success', 'NIB/OSS (Nomor Induk Berusaha) ditolak.');
    }

    // Preserve custom database document labels inside localized alerts.
    public function test_document_alert_preserves_custom_document_type_label(): void
    {
        $this->documentType = DocumentType::create([
            'name' => 'supplier_custom_license',
            'display_name' => 'Supplier Custom License',
            'is_mandatory' => false,
            'is_active' => true,
        ]);
        $document = $this->createDocument(VendorDocument::STATUS_PENDING, 'custom-license.pdf');

        $this->actingAs($this->opsUser)
            ->withUnencryptedCookie('vms_locale', 'id')
            ->post(route('admin.documents.verify', $document))
            ->assertSessionHas('success', 'Supplier Custom License berhasil diverifikasi.');
    }

    private function createDocument(string $status, string $fileName): VendorDocument
    {
        return VendorDocument::create([
            'vendor_id' => $this->vendor->id,
            'document_type_id' => $this->documentType->id,
            'file_name' => $fileName,
            'file_path' => "vendor-documents/{$fileName}",
            'file_hash' => hash('sha256', $fileName.$status),
            'file_size' => 1024,
            'mime_type' => 'application/pdf',
            'version' => 1,
            'is_current' => true,
            'verification_status' => $status,
        ]);
    }

    public function test_company_profile_verification_shares_source_metadata_for_the_toast(): void
    {
        $this->documentType = DocumentType::firstOrCreate(['name' => 'company_profile'], ['display_name' => 'Company Profile', 'is_active' => true, 'has_expiry' => false]);
        $document = $this->createDocument(VendorDocument::STATUS_PENDING, 'profile.pdf');
        $this->actingAs($this->opsUser)->post(route('admin.documents.verify', $document))
            ->assertSessionHas('success_i18n', ['message' => ':document verified successfully.', 'document_type' => ['name' => 'company_profile', 'display_name' => 'Company Profile']]);
        $this->get(route('admin.documents.index'))->assertInertia(fn (Assert $page) => $page
            ->where('flash.success_i18n.message', ':document verified successfully.')
            ->where('flash.success_i18n.document_type.name', 'company_profile')
            ->where('flash.success_i18n.document_type.display_name', 'Company Profile'));
    }
}
