<?php

namespace Tests\Feature;

use App\Models\DocumentType;
use App\Models\Role;
use App\Models\User;
use App\Models\VendorApplication;
use App\Models\VendorCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class OnboardingDocumentCompletenessTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private VendorApplication $draft;

    private DocumentType $first;

    private DocumentType $second;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('private');
        Notification::fake();
        $role = Role::firstOrCreate(['name' => 'vendor'], ['display_name' => 'Vendor']);
        $this->user = User::factory()->create();
        $this->user->roles()->attach($role);
        $category = VendorCategory::create(['code' => 'test_docs', 'display_name' => 'Test Documents', 'is_active' => true]);
        $this->first = $this->type('first');
        $this->second = $this->type('second');
        $this->draft = VendorApplication::create(['user_id' => $this->user->id, 'status' => 'draft', 'current_step' => 3, 'data' => [
            'step1' => ['company_name' => 'Test Co', 'category_id' => $category->id, 'business_type' => 'pvt_ltd'],
            'step2' => ['bank_name' => 'Test Bank'],
        ]]);
        $this->actingAs($this->user);
    }

    private function type(string $name, bool $required = true): DocumentType
    {
        return DocumentType::create(['name' => $name, 'display_name' => $name, 'is_active' => true, 'is_mandatory' => $required]);
    }

    private function upload(DocumentType $type): array
    {
        return ['document_type_id' => $type->id, 'file' => UploadedFile::fake()->createWithContent('test.pdf', "%PDF-1.4\n%%EOF")];
    }

    private function saved(DocumentType $type): array
    {
        $path = 'vendor-applications/'.$this->draft->id.'/temp/'.$type->id.'.pdf';
        Storage::disk('private')->put($path, "%PDF-1.4\n%%EOF");

        return ['document_type_id' => $type->id, 'file_path' => $path, 'file_name' => 'test.pdf'];
    }

    private function putDocuments(array $documents, int $step = 3): void
    {
        $data = $this->draft->fresh()->data;
        $data['step3'] = ['documents' => $documents];
        $this->draft->update(['data' => $data, 'current_step' => $step]);
    }

    public function test_expiring_document_upload_precedes_date_and_completion(): void
    {
        $this->first->update(['has_expiry' => true]);
        $this->putDocuments([$this->saved($this->second)]);
        $this->post('/vendor/onboarding/step3', ['intent' => 'autosave', 'expiry_dates' => [$this->first->id => now()->addYear()->toDateString()]])->assertSessionHasErrors('documents_by_type.'.$this->first->id);
        $this->post('/vendor/onboarding/step3', ['intent' => 'autosave', 'documents' => [$this->upload($this->first)]])->assertSessionHasNoErrors();
        $documents = $this->draft->fresh()->data['step3']['documents'];
        $uploaded = collect($documents)->firstWhere('document_type_id', $this->first->id);
        $this->assertNull($uploaded['expiry_date']);
        Storage::disk('private')->assertExists($uploaded['file_path']);
        $this->get('/vendor/onboarding?step=3')->assertOk();
        $this->post('/vendor/onboarding/step3')->assertSessionHasErrors('documents_by_type.'.$this->first->id);
        $this->post('/vendor/onboarding/submit')->assertSessionHasErrors('documents_by_type.'.$this->first->id);
        $this->assertSame('draft', $this->draft->fresh()->status);
        $this->assertDatabaseCount('vendors', 0);
        Notification::assertNothingSent();
        foreach (['', 'not-a-date', now()->subDay()->toDateString()] as $invalid) {
            $this->post('/vendor/onboarding/step3', ['intent' => 'autosave', 'expiry_dates' => [$this->first->id => $invalid]])->assertSessionHasErrors('expiry_dates.'.$this->first->id);
            $this->assertSame($documents, $this->draft->fresh()->data['step3']['documents']);
            Storage::disk('private')->assertExists($uploaded['file_path']);
        }
        $date = now()->addYear()->toDateString();
        $this->post('/vendor/onboarding/step3', ['intent' => 'autosave', 'expiry_dates' => [$this->first->id => $date]])->assertSessionHasNoErrors();
        $this->assertSame($date, collect($this->draft->fresh()->data['step3']['documents'])->firstWhere('document_type_id', $this->first->id)['expiry_date']);
        $this->post('/vendor/onboarding/step3')->assertSessionHasNoErrors()->assertRedirect('/vendor/onboarding?step=4');
    }

    public function test_upload_checks_real_mime_extension_and_size_without_mutating_saved_file(): void
    {
        $this->first->update(['allowed_extensions' => ['pdf'], 'max_file_size_mb' => 1]);
        $saved = $this->saved($this->first);
        $this->putDocuments([$saved]);
        foreach ([
            UploadedFile::fake()->createWithContent('fake.pdf', 'This is plain text, not PDF'),
            UploadedFile::fake()->createWithContent('fake.txt', "%PDF-1.4\n%%EOF"),
            UploadedFile::fake()->createWithContent('too-large.pdf', "%PDF-1.4\n".str_repeat('a', 1024 * 1024)),
        ] as $file) {
            $this->post('/vendor/onboarding/step3', ['intent' => 'autosave', 'documents' => [['document_type_id' => $this->first->id, 'file' => $file]]])->assertSessionHasErrors();
            $errors = session('errors')->getBag('default');
            $this->assertTrue($errors->has('documents.0.file') || $errors->has('documents_by_type.'.$this->first->id));
            $this->assertSame([$saved], $this->draft->fresh()->data['step3']['documents']);
            Storage::disk('private')->assertExists($saved['file_path']);
            $this->assertCount(1, Storage::disk('private')->allFiles());
        }
        $file = UploadedFile::fake()->createWithContent('boundary.pdf', "%PDF-1.4\n".str_repeat('a', 1024 * 1024 - 9));
        $this->post('/vendor/onboarding/step3', ['intent' => 'autosave', 'documents' => [['document_type_id' => $this->first->id, 'file' => $file]]])->assertSessionHasNoErrors();
    }

    public function test_file_size_messages_are_bilingual_and_preserve_existing_upload(): void
    {
        $this->first->update(['max_file_size_mb' => 1]);
        $saved = $this->saved($this->first);
        $this->putDocuments([$saved]);
        foreach (['en' => 'File size must not exceed 1 MB.', 'id' => 'Ukuran file tidak boleh melebihi 1 MB.'] as $locale => $message) {
            $this->withUnencryptedCookie('vms_locale', $locale)->post('/vendor/onboarding/step3', [
                'intent' => 'autosave',
                'documents' => [['document_type_id' => $this->first->id, 'file' => UploadedFile::fake()->createWithContent('large.pdf', "%PDF-1.4\n".str_repeat('a', 1048576))]],
            ])->assertSessionHasErrors(['documents.0.file' => $message]);
            $this->assertSame([$saved], $this->draft->fresh()->data['step3']['documents']);
            Storage::disk('private')->assertExists($saved['file_path']);
        }
    }

    public function test_oversized_post_with_discarded_body_returns_inline_error_without_mutation(): void
    {
        $saved = $this->saved($this->first);
        $this->putDocuments([$saved]);
        foreach (['en', 'id'] as $locale) {
            $response = $this->withUnencryptedCookie('vms_locale', $locale)->call('POST', '/vendor/onboarding/step3', [], ['vms_locale' => $locale], [], [
                'CONTENT_LENGTH' => (string) PHP_INT_MAX,
                'HTTP_X_ONBOARDING_DOCUMENT_TYPE' => (string) $this->first->id,
                'HTTP_REFERER' => url('/vendor/onboarding?step=3'),
            ]);
            $response->assertRedirect('/vendor/onboarding?step=3')->assertSessionHasErrors('documents_by_type.'.$this->first->id);
            $message = session('errors')->first('documents_by_type.'.$this->first->id);
            $this->assertStringContainsString($locale === 'id' ? 'batas request server' : 'server request limit', $message);
            $this->assertSame([$saved], $this->draft->fresh()->data['step3']['documents']);
            $this->assertSame(3, $this->draft->fresh()->current_step);
            Storage::disk('private')->assertExists($saved['file_path']);
            $this->assertDatabaseCount('vendors', 0);
            Notification::assertNothingSent();
        }
        $this->call('POST', '/vendor/onboarding/step3', [], [], [], ['CONTENT_LENGTH' => (string) PHP_INT_MAX])->assertSessionHasErrors('documents');
        $this->call('POST', '/vendor/onboarding/step2', [], [], [], ['CONTENT_LENGTH' => (string) PHP_INT_MAX])->assertStatus(413);
    }

    public function test_php_rejected_file_has_actionable_upload_error(): void
    {
        $valid = $this->upload($this->first)['file'];
        $invalid = new UploadedFile($valid->getPathname(), 'large.pdf', null, UPLOAD_ERR_INI_SIZE, true);
        $this->post('/vendor/onboarding/step3', ['intent' => 'autosave', 'documents' => [['document_type_id' => $this->first->id, 'file' => $invalid]]])->assertSessionHasErrors('documents.0.file');
        $this->assertStringContainsString('Server upload limit:', session('errors')->first('documents.0.file'));
        $this->assertArrayNotHasKey('step3', $this->draft->fresh()->data);
        $this->assertSame([], Storage::disk('private')->allFiles());
    }

    public function test_empty_optional_and_partial_requests_cannot_complete_step(): void
    {
        $optional = $this->type('optional', false);
        foreach ([[], ['documents' => []], ['documents' => [$this->upload($optional)]], ['documents' => [$this->upload($this->first)]]] as $payload) {
            $this->post('/vendor/onboarding/step3', $payload)->assertSessionHasErrors('documents_by_type.'.$this->second->id);
            $this->assertSame(3, $this->draft->fresh()->current_step);
            $this->assertArrayNotHasKey('step3', $this->draft->fresh()->data);
            $this->assertSame([], Storage::disk('private')->allFiles());
        }
    }

    public function test_partial_draft_is_saved_but_does_not_complete_step(): void
    {
        $this->post('/vendor/onboarding/step3', ['intent' => 'autosave', 'documents' => [$this->upload($this->first)]])->assertSessionHasNoErrors()->assertRedirect('/vendor/onboarding?step=3');
        $this->assertSame(3, $this->draft->fresh()->current_step);
        $this->assertCount(1, $this->draft->fresh()->data['step3']['documents']);
        $this->post('/vendor/onboarding/step3')->assertSessionHasErrors('documents_by_type.'.$this->second->id);
    }

    public function test_saved_and_new_documents_complete_step_without_reupload(): void
    {
        $existing = $this->saved($this->first);
        $this->putDocuments([$existing]);
        $this->post('/vendor/onboarding/step3', ['documents' => [$this->upload($this->second)]])->assertSessionHasNoErrors()->assertRedirect('/vendor/onboarding?step=4');
        $this->assertSame(4, $this->draft->fresh()->current_step);
        $this->post('/vendor/onboarding/step3')->assertSessionHasNoErrors();
        Storage::disk('private')->assertExists($existing['file_path']);
    }

    public function test_removal_and_missing_storage_cannot_complete_step_or_submit(): void
    {
        $first = $this->saved($this->first);
        $second = $this->saved($this->second);
        $this->putDocuments([$first, $second], 4);
        $this->post('/vendor/onboarding/step3', ['removed_document_type_ids' => [$this->first->id]])->assertSessionHasErrors('documents_by_type.'.$this->first->id);
        Storage::disk('private')->assertExists($first['file_path']);
        $this->assertCount(2, $this->draft->fresh()->data['step3']['documents']);
        Storage::disk('private')->delete($first['file_path']);
        $this->post('/vendor/onboarding/step3')->assertSessionHasErrors('documents_by_type.'.$this->first->id);
        $this->post('/vendor/onboarding/submit', ['current_step' => 4, 'complete' => true])->assertSessionHasErrors('documents_by_type.'.$this->first->id)->assertRedirect('/vendor/onboarding?step=3');
        $this->get('/vendor/onboarding?step=4')->assertRedirect('/vendor/onboarding?step=3');
        $this->assertDatabaseMissing('vendors', ['user_id' => $this->user->id]);
        $this->assertSame('draft', $this->draft->fresh()->status);
        Notification::assertNothingSent();
    }

    public function test_foreign_draft_path_and_metadata_without_file_are_rejected(): void
    {
        $foreign = VendorApplication::create(['user_id' => User::factory()->create()->id, 'status' => 'draft', 'data' => []]);
        $path = 'vendor-applications/'.$foreign->id.'/temp/foreign.pdf';
        Storage::disk('private')->put($path, "%PDF-1.4\n%%EOF");
        $this->putDocuments([['document_type_id' => $this->first->id, 'file_path' => $path, 'file_name' => 'foreign.pdf'], $this->saved($this->second)], 4);
        $this->post('/vendor/onboarding/submit')->assertSessionHasErrors('documents_by_type.'.$this->first->id);
        $this->post('/vendor/onboarding/step3', ['documents' => [['document_type_id' => $this->first->id, 'file_path' => $path, 'checked' => true]]])->assertSessionHasErrors('documents.0.file');
        Storage::disk('private')->assertExists($path);
        $this->assertDatabaseMissing('vendors', ['user_id' => $this->user->id]);
    }

    public function test_invalid_upload_and_changed_requirements_are_rejected(): void
    {
        $payload = $this->upload($this->first);
        $payload['file'] = UploadedFile::fake()->createWithContent('bad.txt', 'plain text');
        $this->post('/vendor/onboarding/step3', ['documents' => [$payload]])->assertSessionHasErrors('documents.0.file');
        $this->putDocuments([$this->saved($this->first), $this->saved($this->second)], 4);
        $this->first->update(['has_expiry' => true]);
        $this->post('/vendor/onboarding/submit')->assertSessionHasErrors('documents_by_type.'.$this->first->id);
        $this->first->update(['has_expiry' => false]);
        $this->type('new_required');
        $this->post('/vendor/onboarding/submit')->assertSessionHasErrors('documents');
        Notification::assertNothingSent();
    }

    public function test_pending_removal_in_saved_draft_is_not_counted_at_submission(): void
    {
        $this->putDocuments([$this->saved($this->first), $this->saved($this->second)], 4);
        $data = $this->draft->fresh()->data;
        $data['step3']['removed_document_type_ids'] = [$this->first->id];
        $this->draft->update(['data' => $data]);
        $this->post('/vendor/onboarding/submit')->assertSessionHasErrors('documents_by_type.'.$this->first->id);
        $this->post('/vendor/onboarding/step3')->assertSessionHasErrors('documents_by_type.'.$this->first->id);
        $this->assertSame('draft', $this->draft->fresh()->status);
        $this->assertDatabaseMissing('vendors', ['user_id' => $this->user->id]);
    }

    public function test_autosaved_upload_is_reloaded_and_previewable_before_continuing(): void
    {
        $this->post('/vendor/onboarding/step3', ['intent' => 'autosave', 'documents' => [$this->upload($this->first)]])->assertSessionHasNoErrors()->assertRedirect('/vendor/onboarding?step=3');
        $this->get('/vendor/onboarding?step=3')->assertInertia(fn ($page) => $page->where('sessionData.step3.documents.0.document_type_id', $this->first->id));
        $this->get('/vendor/onboarding/document/'.$this->first->id)->assertOk();
        $this->post('/vendor/onboarding/step3')->assertSessionHasErrors('documents_by_type.'.$this->second->id);
    }

    public function test_confirmed_autosave_removal_survives_reload_and_removes_temp_file(): void
    {
        $first = $this->saved($this->first);
        $second = $this->saved($this->second);
        $this->putDocuments([$first, $second], 4);
        $this->post('/vendor/onboarding/step3', ['intent' => 'autosave', 'removed_document_type_ids' => [$this->first->id]])->assertSessionHasNoErrors()->assertRedirect('/vendor/onboarding?step=3');
        $this->assertSame(3, $this->draft->fresh()->current_step);
        $this->get('/vendor/onboarding?step=3')->assertInertia(fn ($page) => $page->has('sessionData.step3.documents', 1)->where('sessionData.step3.documents.0.document_type_id', $this->second->id));
        $this->get('/vendor/onboarding/document/'.$this->first->id)->assertNotFound();
        Storage::disk('private')->assertMissing($first['file_path']);
        Storage::disk('private')->assertExists($second['file_path']);
        $this->post('/vendor/onboarding/submit')->assertSessionHasErrors('documents_by_type.'.$this->first->id);
    }

    public function test_replacement_and_expiry_edits_are_persisted_without_continue(): void
    {
        $first = $this->saved($this->first);
        $this->putDocuments([$first]);
        $this->post('/vendor/onboarding/step3', ['intent' => 'autosave', 'documents' => [$this->upload($this->first)]])->assertSessionHasNoErrors();
        $newPath = $this->draft->fresh()->data['step3']['documents'][0]['file_path'];
        $this->assertNotSame($first['file_path'], $newPath);
        Storage::disk('private')->assertMissing($first['file_path']);
        $this->first->update(['has_expiry' => true]);
        $date = today()->addDays(30)->toDateString();
        $this->post('/vendor/onboarding/step3', ['intent' => 'autosave', 'expiry_dates' => [$this->first->id => $date]])->assertSessionHasNoErrors();
        $this->assertSame($date, $this->draft->fresh()->data['step3']['documents'][0]['expiry_date']);
        $this->assertSame($newPath, $this->draft->fresh()->data['step3']['documents'][0]['file_path']);
        $this->post('/vendor/onboarding/step3', ['intent' => 'autosave', 'expiry_dates' => [$this->first->id => 'invalid']])->assertSessionHasErrors('expiry_dates.'.$this->first->id);
        $this->assertSame($date, $this->draft->fresh()->data['step3']['documents'][0]['expiry_date']);
    }

    public function test_each_invalid_saved_document_can_be_removed_independently(): void
    {
        $this->putDocuments([['document_type_id' => $this->first->id, 'file_path' => 'missing.pdf'], ['document_type_id' => $this->second->id, 'file_path' => 'also-missing.pdf']]);
        $this->post('/vendor/onboarding/step3', ['intent' => 'autosave', 'removed_document_type_ids' => [$this->first->id]])->assertSessionHasNoErrors();
        $this->assertCount(1, $this->draft->fresh()->data['step3']['documents']);
        $this->post('/vendor/onboarding/step3', ['intent' => 'autosave', 'removed_document_type_ids' => [$this->second->id]])->assertSessionHasNoErrors();
        $this->assertSame([], $this->draft->fresh()->data['step3']['documents']);
    }

    public function test_owned_current_vendor_file_is_reusable_but_history_is_not(): void
    {
        $vendor = \App\Models\Vendor::factory()->create(['user_id' => $this->user->id]);
        $path = 'vendor-documents/'.$vendor->id.'/existing.pdf';
        Storage::disk('private')->put($path, "%PDF-1.4\n%%EOF");
        $record = $vendor->documents()->create(['document_type_id' => $this->first->id, 'file_name' => 'existing.pdf', 'file_path' => $path, 'file_size' => 14, 'file_hash' => str_repeat('a', 64), 'mime_type' => 'application/pdf', 'is_current' => true]);
        $this->putDocuments([['document_type_id' => $this->first->id, 'file_path' => $path, 'file_name' => 'existing.pdf'], $this->saved($this->second)]);
        $this->post('/vendor/onboarding/step3')->assertSessionHasNoErrors();
        $record->update(['is_current' => false]);
        $this->post('/vendor/onboarding/step3')->assertSessionHasErrors('documents_by_type.'.$this->first->id);
        Storage::disk('private')->assertExists($path);
    }

    public function test_storage_failure_cleans_only_new_files_and_preserves_draft(): void
    {
        $existing = $this->saved($this->first);
        $this->putDocuments([$existing]);
        $original = $this->draft->fresh()->data;
        $file = $this->upload($this->second)['file'];
        $failingFile = new class($file->getPathname(), 'test.pdf', null, null, true) extends UploadedFile
        {
            public function store($path = '', $options = [])
            {
                return false;
            }
        };
        $this->post('/vendor/onboarding/step3', ['documents' => [$this->upload($this->first), ['document_type_id' => $this->second->id, 'file' => $failingFile]]])->assertSessionHasErrors('documents')->assertRedirect('/vendor/onboarding?step=3');
        $this->assertSame([$existing['file_path']], Storage::disk('private')->allFiles());
        $this->assertSame($original, $this->draft->fresh()->data);
        $this->assertSame(3, $this->draft->fresh()->current_step);
    }

    public function test_optional_and_inactive_types_are_not_required(): void
    {
        $this->type('optional', false);
        $this->type('inactive')->update(['is_active' => false]);
        $this->post('/vendor/onboarding/step3', ['documents' => [$this->upload($this->first), $this->upload($this->second)]])->assertSessionHasNoErrors();
    }
}
