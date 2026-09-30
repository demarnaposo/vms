<?php

namespace Tests\Feature;

use App\Interfaces\VendorRepositoryInterface;
use App\Models\DocumentType;
use App\Models\Role;
use App\Models\User;
use App\Models\Vendor;
use App\Models\VendorApplication;
use App\Models\VendorDocument;
use App\Services\DocumentTypeUsage;
use App\Services\DraftDocumentValidator;
use App\Services\SystemMasterDataService;
use App\Services\VendorService;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class DocumentTypeManagementTest extends TestCase
{
    use DatabaseMigrations;

    public function runDatabaseMigrations(): void
    {
        // The disposable connection is rebuilt; historical irreversible migrations are not rolled back.
        $this->refreshTestDatabase();
    }

    private function user(string $role): User
    {
        Role::firstOrCreate(['name' => $role], ['display_name' => $role]);
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    private function config(array $overrides = []): array
    {
        return array_replace(['name' => 'custom_document', 'display_name' => 'Custom Document', 'description' => 'Manual description', 'is_active' => true, 'is_mandatory' => false, 'has_expiry' => false, 'expiry_warning_days' => 0, 'allowed_extensions' => ['pdf'], 'max_file_size_mb' => 1], $overrides);
    }

    private function spoofedPdf(): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'vms-mime-');
        file_put_contents($path, '<?php echo 1;');
        $this->beforeApplicationDestroyed(fn () => unlink($path));

        return new UploadedFile($path, 'bad.pdf', null, null, true);
    }

    public function test_roles_are_denied_every_endpoint_and_super_admin_can_manage(): void
    {
        $type = DocumentType::create($this->config());
        foreach (['vendor', 'ops_manager', 'finance_manager'] as $role) {
            $this->actingAs($this->user($role));
            $this->get('/admin/document-types')->assertForbidden();
            $this->post('/admin/document-types', $this->config())->assertForbidden();
            $this->put('/admin/document-types/'.$type->id, $this->config())->assertForbidden();
            $this->delete('/admin/document-types/'.$type->id)->assertForbidden();
        }
        $this->actingAs($this->user('super_admin'));
        $this->get('/admin/document-types')->assertOk();
        $this->post('/admin/document-types', $this->config())->assertSessionHasErrors('name');
        $this->post('/admin/document-types', $this->config(['name' => 'unsafe', 'allowed_extensions' => ['exe'], 'max_file_size_mb' => 11, 'expiry_warning_days' => 30]))->assertSessionHasErrors(['allowed_extensions.0', 'max_file_size_mb', 'expiry_warning_days']);
        $this->put('/admin/document-types/'.$type->id, $this->config(['name' => 'changed']))->assertSessionHasErrors('name');
        Cache::put('document_types_active', ['stale']);
        $this->put('/admin/document-types/'.$type->id, $this->config(['is_active' => false]))->assertSessionHasNoErrors();
        $this->assertFalse(Cache::has('document_types_active'));
        $this->delete('/admin/document-types/'.$type->id)->assertSessionHasNoErrors();
        $this->assertDatabaseMissing('document_types', ['id' => $type->id]);
        $this->post('/admin/document-types', $this->config())->assertSessionHasNoErrors();
    }

    public function test_used_drafts_history_and_config_are_protected(): void
    {
        $type = DocumentType::create($this->config());
        $user = $this->user('vendor');
        $draft = VendorApplication::create(['user_id' => $user->id, 'status' => 'draft', 'data' => ['step3' => ['documents' => [['document_type_id' => $type->id]]]]]);
        $this->actingAs($this->user('super_admin'))->delete('/admin/document-types/'.$type->id)->assertSessionHasErrors('document_type');
        $draft->delete();
        $vendor = Vendor::factory()->create(['user_id' => $user->id]);
        $doc = VendorDocument::create(['vendor_id' => $vendor->id, 'document_type_id' => $type->id, 'file_name' => 'old.pdf', 'file_path' => 'old.pdf', 'file_size' => 10, 'file_hash' => str_repeat('a', 64), 'mime_type' => 'application/pdf', 'is_current' => false]);
        $doc->delete();
        $this->assertTrue(app(DocumentTypeUsage::class)->exists($type));
        $this->delete('/admin/document-types/'.$type->id)->assertSessionHasErrors('document_type');
    }

    public function test_cache_invalidation_waits_for_commit_and_bootstrap_does_not_overwrite_or_recreate(): void
    {
        $type = DocumentType::create($this->config());
        Cache::put('document_types_active', ['old']);
        DB::transaction(function () use ($type): void {
            $type->update(['display_name' => 'Admin label']);
            $this->assertTrue(Cache::has('document_types_active'));
        });
        $this->assertFalse(Cache::has('document_types_active'));
        app(SystemMasterDataService::class)->syncDocumentTypes();
        $this->assertSame('Admin label', $type->fresh()->display_name);
        $type->delete();
        app(SystemMasterDataService::class)->syncDocumentTypes();
        $this->assertDatabaseCount('document_types', 0);
    }

    public function test_both_upload_flows_apply_configuration_and_custom_document_is_usable(): void
    {
        Storage::fake('private');
        $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);
        $user = $this->user('vendor');
        $vendor = Vendor::factory()->create(['user_id' => $user->id, 'status' => Vendor::STATUS_ACTIVE]);
        $type = DocumentType::create($this->config(['has_expiry' => true, 'expiry_warning_days' => 7]));
        VendorApplication::create(['user_id' => $user->id, 'status' => 'draft', 'current_step' => 3, 'data' => ['step1' => ['company_name' => 'Test'], 'step2' => ['bank_name' => 'Test']]]);
        $this->actingAs($user);
        foreach (['vendor', 'onboarding'] as $flow) {
            $vendor->update(['status' => $flow === 'vendor' ? Vendor::STATUS_ACTIVE : Vendor::STATUS_DRAFT]);
            $user->unsetRelation('vendor');
            $url = $flow === 'vendor' ? '/vendor/documents/upload' : '/vendor/onboarding/step3';
            foreach ([['document_type_id' => 99999], ['expiry_date' => null], ['expiry_date' => '2020-01-01'], ['file' => $this->spoofedPdf()], ['file' => UploadedFile::fake()->create('large.pdf', 2048, 'application/pdf')], ['file' => UploadedFile::fake()->image('image.png')]] as $invalid) {
                $data = array_replace(['document_type_id' => $type->id, 'file' => UploadedFile::fake()->createWithContent('ok.pdf', "%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF"), 'expiry_date' => today()->addDay()->toDateString()], $invalid);
                $response = $this->post($url, $flow === 'vendor' ? $data : ['documents' => [$data]]);
                $this->assertTrue(session()->has('errors'), $flow.' invalid '.implode(',', array_keys($invalid)).' status '.$response->status().' location '.$response->headers->get('Location'));
                $response->assertSessionHasErrors();
            }
            $type->update(['is_active' => false]);
            $data = ['document_type_id' => $type->id, 'file' => UploadedFile::fake()->create('ok.pdf', 1), 'expiry_date' => today()->addDay()->toDateString()];
            $this->post($url, $flow === 'vendor' ? $data : ['documents' => [$data]])->assertSessionHasErrors($flow === 'vendor' ? 'document_type_id' : 'documents.0.document_type_id');
            $type->update(['is_active' => true]);
        }
        $this->get('/vendor/onboarding?step=3')->assertOk()->assertInertia(fn ($page) => $page->has('documentTypes', 1)->where('documentTypes.0.name', 'custom_document'));
        $this->post('/vendor/onboarding/step3', ['documents' => [['document_type_id' => $type->id, 'file' => UploadedFile::fake()->createWithContent('custom.pdf', "%PDF-1.4\n%%EOF"), 'expiry_date' => today()->addDay()->toDateString()]]])->assertSessionHasNoErrors();
        $this->assertSame($type->id, VendorApplication::first()->data['step3']['documents'][0]['document_type_id']);
        $vendor->update(['status' => Vendor::STATUS_ACTIVE]);
        $user->unsetRelation('vendor');
        $this->get('/vendor/documents')->assertOk()->assertInertia(fn ($page) => $page->has('documentTypes', 1)->where('documentTypes.0.name', 'custom_document'));
        $this->post('/vendor/documents/upload', ['document_type_id' => $type->id, 'file' => UploadedFile::fake()->createWithContent('ok.pdf', "%PDF-1.4\n%%EOF"), 'expiry_date' => today()->addDay()->toDateString()])->assertSessionHasNoErrors();
        $this->assertDatabaseHas('vendor_documents', ['vendor_id' => $vendor->id, 'document_type_id' => $type->id]);
    }

    public function test_draft_is_revalidated_without_deleting_files_and_inactive_mandatory_is_ignored(): void
    {
        Storage::fake('private');
        $user = $this->user('vendor');
        $type = DocumentType::create($this->config(['max_file_size_mb' => 2]));
        DocumentType::create($this->config(['name' => 'inactive_mandatory', 'is_active' => false, 'is_mandatory' => true]));
        $draft = VendorApplication::create(['user_id' => $user->id, 'status' => 'draft', 'data' => []]);
        $path = 'vendor-applications/'.$draft->id.'/temp/ok.pdf';
        Storage::disk('private')->put($path, "%PDF-1.4\n".str_repeat(' ', 1500 * 1024)."\n%%EOF");
        $draft->update(['data' => ['step3' => ['documents' => [['document_type_id' => $type->id, 'file_name' => 'ok.pdf', 'file_path' => $path]]]]]);
        app(DraftDocumentValidator::class)->validate($draft);
        $type->update(['has_expiry' => true]);
        try {
            app(DraftDocumentValidator::class)->validate($draft);
            $this->fail('Expected changed requirements to reject draft');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('documents', $e->errors());
        }
        foreach ([['has_expiry' => false, 'allowed_extensions' => ['png']], ['allowed_extensions' => ['pdf'], 'max_file_size_mb' => 1], ['is_active' => false]] as $configuration) {
            $type->update($configuration);
            try {
                app(DraftDocumentValidator::class)->validate($draft);
                $this->fail('Expected changed configuration to reject draft');
            } catch (ValidationException $e) {
                $this->assertArrayHasKey('documents', $e->errors());
            }
        }
        Storage::disk('private')->assertExists($path);
        $this->assertNotEmpty($draft->fresh()->data['step3']['documents']);
    }

    public function test_inactive_history_remains_accessible_and_current_compliance_ignores_it(): void
    {
        Storage::fake('private');
        $owner = $this->user('vendor');
        $vendor = Vendor::factory()->create(['user_id' => $owner->id, 'status' => Vendor::STATUS_ACTIVE]);
        $type = DocumentType::create($this->config(['is_active' => false, 'is_mandatory' => true, 'has_expiry' => true]));
        $path = 'vendor-documents/'.$vendor->id.'/old.pdf';
        Storage::disk('private')->put($path, "%PDF-1.4\n%%EOF");
        $doc = VendorDocument::create(['vendor_id' => $vendor->id, 'document_type_id' => $type->id, 'file_name' => 'old.pdf', 'file_path' => $path, 'file_hash' => str_repeat('a', 64), 'file_size' => 10, 'mime_type' => 'application/pdf', 'is_current' => false, 'verification_status' => 'pending', 'expiry_date' => today()->subDay()]);
        $this->actingAs($owner)->get('/documents/'.$doc->id.'/view')->assertOk();
        $this->get('/documents/'.$doc->id.'/download')->assertOk();
        $this->actingAs($this->user('vendor'))->get('/documents/'.$doc->id.'/view')->assertForbidden();
        $this->actingAs($this->user('ops_manager'))->post('/admin/documents/'.$doc->id.'/verify')
            ->assertSessionHas('error', 'Only the current pending document can be reviewed.');
        $this->assertSame('pending', $doc->fresh()->verification_status);
        $doc->update(['is_current' => true, 'verification_status' => 'verified']);
        foreach (['document_required', 'document_expiry'] as $ruleType) {
            \App\Models\ComplianceRule::create(['name' => $ruleType, 'description' => $ruleType, 'type' => $ruleType, 'is_active' => true, 'conditions' => []]);
        }
        $result = app(\App\Services\ComplianceService::class)->evaluateVendor($vendor);
        $this->assertSame(0, $result['failures']);
        $this->assertTrue(app(\App\Services\VendorLifecycleService::class)->activationReadiness($vendor->fresh())['allowed']);
        $this->artisan('vendors:expiry-reminders')->assertSuccessful();
        $this->assertSame('verified', $doc->fresh()->verification_status);
    }

    public function test_failed_document_record_creation_preserves_current_version_and_removes_new_file(): void
    {
        Storage::fake('private');
        $owner = $this->user('vendor');
        $vendor = Vendor::factory()->create(['user_id' => $owner->id]);
        $type = DocumentType::create($this->config());
        $oldPath = 'vendor-documents/'.$vendor->id.'/old.pdf';
        Storage::disk('private')->put($oldPath, "%PDF-1.4\n%%EOF");
        $old = VendorDocument::create(['vendor_id' => $vendor->id, 'document_type_id' => $type->id, 'file_name' => 'old.pdf', 'file_path' => $oldPath, 'file_hash' => str_repeat('a', 64), 'file_size' => 10, 'mime_type' => 'application/pdf', 'version' => 3, 'is_current' => true, 'verification_status' => 'verified']);
        $repository = \Mockery::mock(VendorRepositoryInterface::class);
        $repository->shouldReceive('createDocument')->once()->andThrow(new \RuntimeException('Synthetic database failure'));
        $this->app->instance(VendorRepositoryInterface::class, $repository);

        try {
            app(VendorService::class)->uploadDocument($vendor, UploadedFile::fake()->createWithContent('new.pdf', "%PDF-1.4\n%%EOF"), $type->id, null);
            $this->fail('Expected synthetic database failure');
        } catch (\RuntimeException $exception) {
            $this->assertSame('Synthetic database failure', $exception->getMessage());
        }

        $this->assertTrue($old->fresh()->is_current);
        $this->assertSame(1, VendorDocument::query()->where('vendor_id', $vendor->id)->count());
        $this->assertSame([$oldPath], Storage::disk('private')->allFiles('vendor-documents/'.$vendor->id));
    }

    public function test_duplicate_legacy_codes_stop_migration_without_discarding_records(): void
    {
        \Illuminate\Support\Facades\Schema::table('document_types', fn ($table) => $table->dropUnique('document_types_name_unique'));
        DocumentType::create($this->config());
        DocumentType::create($this->config());
        $migration = require database_path('migrations/2026_09_27_000000_protect_document_type_master_data.php');
        try {
            $migration->up();
            $this->fail('Duplicate names must stop migration');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsString('custom_document', $e->getMessage());
        }
        $this->assertDatabaseCount('document_types', 2);
    }

    public function test_config_and_compliance_metadata_references_prevent_deletion(): void
    {
        $type = DocumentType::create($this->config());
        $rule = \App\Models\ComplianceRule::create(['name' => 'configured', 'description' => 'Configured', 'type' => 'custom', 'conditions' => ['document_type_ids' => [$type->id]]]);
        $this->assertTrue(app(DocumentTypeUsage::class)->exists($type));
        $rule->update(['conditions' => []]);
        $vendor = Vendor::factory()->create();
        \App\Models\ComplianceResult::create(['vendor_id' => $vendor->id, 'compliance_rule_id' => $rule->id, 'status' => 'fail', 'details' => 'Missing document', 'metadata' => ['missing_document_ids' => [$type->id]], 'evaluated_at' => now()]);
        $this->assertTrue(app(DocumentTypeUsage::class)->exists($type));
    }

    public function test_per_type_warning_window_and_expired_status_are_evaluated_consistently(): void
    {
        $vendor = Vendor::factory()->create();
        $type = DocumentType::create($this->config(['has_expiry' => true, 'expiry_warning_days' => 3]));
        $doc = VendorDocument::create(['vendor_id' => $vendor->id, 'document_type_id' => $type->id, 'file_name' => 'old.pdf', 'file_path' => 'old.pdf', 'file_hash' => str_repeat('a', 64), 'file_size' => 10, 'mime_type' => 'application/pdf', 'is_current' => true, 'verification_status' => 'verified', 'expiry_date' => today()->addDays(5)]);
        \App\Models\ComplianceRule::create(['name' => 'expiry', 'description' => 'Expiry', 'type' => 'document_expiry', 'is_active' => true, 'conditions' => ['warning_days' => 30]]);
        app(\App\Services\ComplianceService::class)->evaluateVendor($vendor);
        $this->assertSame('pass', \App\Models\ComplianceResult::latest('id')->first()->status);
        $type->update(['expiry_warning_days' => 7]);
        app(\App\Services\ComplianceService::class)->evaluateVendor($vendor);
        $this->assertSame('warning', \App\Models\ComplianceResult::latest('id')->first()->status);
        $doc->update(['verification_status' => 'expired', 'expiry_date' => today()->subDay()]);
        app(\App\Services\ComplianceService::class)->evaluateVendor($vendor);
        $this->assertSame('fail', \App\Models\ComplianceResult::latest('id')->first()->status);
    }
}
