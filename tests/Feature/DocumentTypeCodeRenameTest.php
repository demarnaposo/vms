<?php

namespace Tests\Feature;

use App\Models\ComplianceRule;
use App\Models\DocumentType;
use App\Models\Role;
use App\Models\User;
use App\Models\Vendor;
use App\Models\VendorApplication;
use App\Models\VendorDocument;
use App\Services\DocumentTypeUsage;
use App\Services\DraftDocumentValidator;
use App\Services\VendorLifecycleService;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DocumentTypeCodeRenameTest extends TestCase
{
    use DatabaseMigrations;

    public function runDatabaseMigrations(): void
    {
        $this->refreshTestDatabase();
    }

    private function migration(): object
    {
        return require database_path('migrations/2026_09_30_000003_rename_legacy_document_type_codes.php');
    }

    private function types(): array
    {
        $definitions = collect((require database_path('data/system_master_data.php'))['document_types'])->keyBy('name');

        return collect(['gst_certificate' => 'npwp', 'pan_card' => 'nib_oss', 'cancelled_cheque' => 'bank_account_proof'])
            ->map(fn ($new, $old) => DocumentType::create([...$definitions[$new], 'name' => $old]))->all();
    }

    private function user(string $role): User
    {
        Role::firstOrCreate(['name' => $role], ['display_name' => $role]);
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    public function test_rename_changes_only_name_and_preserves_all_relations_and_timestamps(): void
    {
        $types = $this->types();
        $type = $types['gst_certificate'];
        $type->update(['display_name' => 'Custom NPWP', 'description' => 'Manual', 'is_active' => false, 'max_file_size_mb' => 2]);
        $vendor = Vendor::factory()->create();
        $document = VendorDocument::create(['vendor_id' => $vendor->id, 'document_type_id' => $type->id, 'file_name' => 'history.pdf', 'file_path' => 'history.pdf', 'file_hash' => str_repeat('a', 64), 'file_size' => 10, 'mime_type' => 'application/pdf', 'version' => 3, 'is_current' => false]);
        $document->delete();
        $draft = VendorApplication::create(['user_id' => $vendor->user_id, 'status' => 'draft', 'data' => ['step3' => ['documents' => [['document_type_id' => $type->id, 'document_type_name' => 'gst_certificate']]]]]);
        $rule = ComplianceRule::create(['name' => 'legacy', 'description' => 'Legacy reference', 'type' => 'custom', 'conditions' => ['document_type_names' => ['gst_certificate']]]);
        $before = DB::table('document_types')->orderBy('id')->get()->map(fn ($row) => (array) $row)->all();
        $relations = [$document->fresh()->getAttributes(), $draft->fresh()->getAttributes(), $rule->fresh()->getAttributes()];
        $migration = $this->migration();
        Cache::put('document_types_active', ['stale']);
        DB::transaction(function () use ($migration): void {
            $migration->up();
            $this->assertTrue(Cache::has('document_types_active'));
        });
        $this->assertFalse(Cache::has('document_types_active'));
        $migration->up();
        $after = DB::table('document_types')->orderBy('id')->get()->map(fn ($row) => (array) $row)->all();
        foreach (['npwp', 'nib_oss', 'bank_account_proof'] as $i => $name) {
            $this->assertSame($name, $after[$i]['name']);
            $after[$i]['name'] = $before[$i]['name'];
        }
        $this->assertSame($before, $after);
        $this->assertEquals($relations, [$document->fresh()->getAttributes(), $draft->fresh()->getAttributes(), $rule->fresh()->getAttributes()]);
        $this->assertSame($type->id, $document->fresh()->documentType->id);
        $migration->down();
        $migration->down();
        $this->assertEquals($before, DB::table('document_types')->orderBy('id')->get()->map(fn ($row) => (array) $row)->all());
    }

    public function test_collision_aborts_every_pair_and_does_not_invalidate_cache(): void
    {
        $this->types();
        DocumentType::create(['name' => 'nib_oss', 'display_name' => 'Separate custom record']);
        $before = DB::table('document_types')->orderBy('id')->get();
        Cache::put('document_types_active', ['stale']);
        try {
            $this->migration()->up();
            $this->fail('Expected collision');
        } catch (\RuntimeException $exception) {
            $this->assertStringContainsString('pan_card -> nib_oss', $exception->getMessage());
        }
        $this->assertEquals($before, DB::table('document_types')->orderBy('id')->get());
        $this->assertTrue(Cache::has('document_types_active'));
    }

    public function test_reverse_collision_is_guarded_and_missing_types_are_not_created(): void
    {
        $this->migration()->up();
        $this->assertDatabaseCount('document_types', 0);
        $this->types();
        $this->migration()->up();
        DocumentType::create(['name' => 'pan_card', 'display_name' => 'Separate legacy record']);
        $before = DB::table('document_types')->orderBy('id')->get();
        try {
            $this->migration()->down();
            $this->fail('Expected reverse collision');
        } catch (\RuntimeException $exception) {
            $this->assertStringContainsString('nib_oss -> pan_card', $exception->getMessage());
        }
        $this->assertEquals($before, DB::table('document_types')->orderBy('id')->get());
    }

    public function test_name_references_in_legacy_and_canonical_json_remain_protected(): void
    {
        $type = $this->types()['gst_certificate'];
        $rule = ComplianceRule::create(['name' => 'legacy', 'description' => 'Reference', 'type' => 'custom', 'conditions' => ['nested' => ['document_type_names' => ['gst_certificate']]]]);
        $this->migration()->up();
        $this->assertTrue(app(DocumentTypeUsage::class)->exists($type->fresh()));
        $rule->update(['conditions' => ['document_type_name' => 'npwp']]);
        $this->migration()->down();
        $this->assertTrue(app(DocumentTypeUsage::class)->exists($type->fresh()));
        $this->actingAs($this->user('super_admin'))->delete('/admin/document-types/'.$type->id)->assertSessionHasErrors('document_type');
    }

    public function test_existing_ids_work_in_upload_draft_submission_filter_and_activation_after_rename(): void
    {
        Storage::fake('private');
        $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);
        $types = $this->types();
        $user = $this->user('vendor');
        $vendor = Vendor::factory()->create(['user_id' => $user->id, 'status' => Vendor::STATUS_ACTIVE]);
        $draft = VendorApplication::create(['user_id' => $user->id, 'status' => 'draft', 'current_step' => 3, 'data' => ['step1' => ['company_name' => 'PPM Manajemen'], 'step2' => ['bank_name' => 'Fixture Bank']]]);
        $before = app(VendorLifecycleService::class)->activationReadiness($vendor);
        $this->migration()->up();
        $this->assertEquals($before, app(VendorLifecycleService::class)->activationReadiness($vendor));
        $this->actingAs($user);
        foreach ($types as $type) {
            $file = fn () => UploadedFile::fake()->createWithContent('fixture.pdf', "%PDF-1.4\n%%EOF");
            $this->post('/vendor/onboarding/step3', ['documents' => [['document_type_id' => $type->id, 'file' => $file()]]])->assertSessionHasNoErrors();
            $this->post('/vendor/documents/upload', ['document_type_id' => $type->id, 'file' => $file()])->assertSessionHasNoErrors();
            $this->assertDatabaseHas('vendor_documents', ['vendor_id' => $vendor->id, 'document_type_id' => $type->id]);
        }
        app(DraftDocumentValidator::class)->validate($draft->fresh());
        $type = $types['pan_card']->fresh();
        $this->actingAs($this->user('ops_manager'))->get('/admin/documents?status=all&document_type_id='.$type->id)->assertOk()
            ->assertInertia(fn (\Inertia\Testing\AssertableInertia $page) => $page->has('documents.data', 1)->where('documents.data.0.document_type.name', 'nib_oss'));
        $document = VendorDocument::where('document_type_id', $type->id)->firstOrFail();
        $this->withUnencryptedCookie('vms_locale', 'id')->post(route('admin.documents.verify', $document))
            ->assertSessionHas('success', 'NIB OSS berhasil diverifikasi.');
    }

    public function test_compliance_and_successful_activation_readiness_are_unchanged(): void
    {
        $types = $this->types();
        $vendor = Vendor::factory()->create();
        foreach ($types as $type) {
            VendorDocument::create(['vendor_id' => $vendor->id, 'document_type_id' => $type->id, 'file_name' => 'verified.pdf', 'file_path' => 'verified.pdf', 'file_hash' => str_repeat('a', 64), 'file_size' => 10, 'mime_type' => 'application/pdf', 'is_current' => true, 'verification_status' => 'verified']);
        }
        ComplianceRule::create(['name' => 'mandatory', 'description' => 'Required documents', 'type' => 'document_required', 'conditions' => [], 'is_active' => true]);
        $before = app(\App\Services\ComplianceService::class)->evaluateVendor($vendor);
        $readiness = app(VendorLifecycleService::class)->activationReadiness($vendor->fresh());
        $this->assertTrue($readiness['allowed']);
        $this->migration()->up();
        $this->assertEquals($before, app(\App\Services\ComplianceService::class)->evaluateVendor($vendor->fresh()));
        $this->assertEquals($readiness, app(VendorLifecycleService::class)->activationReadiness($vendor->fresh()));
    }
}
