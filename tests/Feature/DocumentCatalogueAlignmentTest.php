<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\ComplianceRule;
use App\Models\DocumentType;
use App\Models\Role;
use App\Models\User;
use App\Models\Vendor;
use App\Models\VendorApplication;
use App\Models\VendorDocument;
use App\Services\SystemMasterDataService;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class DocumentCatalogueAlignmentTest extends TestCase
{
    use DatabaseMigrations;

    public function runDatabaseMigrations(): void
    {
        $this->refreshTestDatabase();
    }

    private function migration(): object
    {
        return require database_path('migrations/2026_10_07_000002_align_default_document_catalogue.php');
    }

    private function type(string $name, array $values = []): DocumentType
    {
        return DocumentType::create($values + ['name' => $name, 'display_name' => $name, 'is_active' => true]);
    }

    private function user(string $role): User
    {
        Role::firstOrCreate(['name' => $role], ['display_name' => $role]);
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    public function test_alignment_preserves_custom_settings_and_invalidates_only_after_commit(): void
    {
        $custom = $this->type('custom', ['display_name' => 'Manual label', 'description' => 'Manual description']);
        $npwp = $this->type('npwp', ['display_name' => 'Admin NPWP', 'is_active' => false, 'is_mandatory' => false, 'allowed_extensions' => ['pdf'], 'max_file_size_mb' => 2, 'has_expiry' => true, 'expiry_warning_days' => 7]);
        $nib = $this->type('nib_oss', ['display_name' => 'Business Identification Number (NIB) Document']);
        foreach (['company_registration', 'bank_account_proof', 'insurance', 'nda', 'service_agreement', 'experience_portfolio', 'business_license', 'bank_account_letter'] as $code) {
            $this->type($code);
        }
        $customBefore = $custom->fresh()->getAttributes();
        $npwpBefore = $npwp->fresh()->getAttributes();
        Cache::put('document_types_active', ['stale']);
        DB::transaction(function (): void {
            $this->migration()->up();
            $this->assertTrue(Cache::has('document_types_active'));
        });
        $this->assertFalse(Cache::has('document_types_active'));
        $this->assertDatabaseCount('document_types', 9);
        $this->assertSame($customBefore, $custom->fresh()->getAttributes());
        $npwpAfter = $npwp->fresh()->getAttributes();
        unset($npwpBefore['sort_order'], $npwpAfter['sort_order']);
        $this->assertSame($npwpBefore, $npwpAfter);
        $this->assertSame('NIB/OSS (Business Identification Number)', $nib->fresh()->display_name);
        $expected = collect((require database_path('data/system_master_data.php'))['document_types'])->pluck('name')->push('custom')->all();
        $this->assertSame($expected, DocumentType::ordered()->pluck('name')->all());
        $before = DocumentType::ordered()->get()->toArray();
        $this->migration()->up();
        (require database_path('migrations/2026_09_30_000002_extend_vendor_document_catalogue.php'))->up();
        app(SystemMasterDataService::class)->syncDocumentTypes();
        $this->assertSame($before, DocumentType::ordered()->get()->toArray());
    }

    public static function references(): array
    {
        return array_map(fn ($kind) => [$kind], [
            'document', 'history', 'soft_deleted', 'draft', 'removed_draft',
            'rule', 'legacy_alias', 'compliance_result', 'compliance_flag',
            'invalid_json', 'audit_snapshot', 'audit_type',
        ]);
    }

    #[DataProvider('references')]
    public function test_reference_aborts_before_any_catalogue_mutation(string $kind): void
    {
        $obsolete = $this->type('bank_account_proof');
        $this->type('company_registration');
        $vendor = Vendor::factory()->create();
        if (in_array($kind, ['document', 'history', 'soft_deleted'])) {
            $doc = VendorDocument::create(['vendor_id' => $vendor->id, 'document_type_id' => $obsolete->id, 'file_name' => 'fixture.pdf', 'file_path' => 'fixture.pdf', 'file_size' => 10, 'file_hash' => str_repeat('a', 64), 'mime_type' => 'application/pdf', 'is_current' => $kind === 'document']);
            if ($kind === 'soft_deleted') {
                $doc->delete();
            }
        } elseif (in_array($kind, ['draft', 'removed_draft', 'invalid_json'])) {
            $draft = VendorApplication::create(['user_id' => $vendor->user_id, 'status' => 'draft', 'data' => ['step3' => $kind === 'removed_draft' ? ['removed_document_type_ids' => [$obsolete->id]] : ['documents' => [['document_type_id' => $obsolete->id]]]]]);
            if ($kind === 'invalid_json') {
                DB::table('vendor_applications')->where('id', $draft->id)->update(['data' => '{invalid']);
            }
        } elseif (in_array($kind, ['rule', 'legacy_alias'])) {
            ComplianceRule::create(['name' => 'fixture', 'description' => 'Fixture', 'type' => 'custom', 'conditions' => ['nested' => ['document_type_names' => [$kind === 'legacy_alias' ? 'cancelled_cheque' : 'bank_account_proof']]]]);
        } elseif (in_array($kind, ['compliance_result', 'compliance_flag'])) {
            $rule = ComplianceRule::create(['name' => 'fixture', 'description' => 'Fixture', 'type' => 'custom', 'conditions' => []]);
            if ($kind === 'compliance_result') {
                \App\Models\ComplianceResult::create(['vendor_id' => $vendor->id, 'compliance_rule_id' => $rule->id, 'status' => 'fail', 'evaluated_at' => now(), 'metadata' => ['missing_document_ids' => [$obsolete->id]]]);
            } else {
                \App\Models\ComplianceFlag::create(['vendor_id' => $vendor->id, 'compliance_rule_id' => $rule->id, 'severity' => 'high', 'reason' => 'Fixture', 'flagged_at' => now(), 'metadata' => ['missing_document_ids' => [$obsolete->id]]]);
            }
        } else {
            AuditLog::create(['auditable_type' => $kind === 'audit_type' ? DocumentType::class : VendorDocument::class, 'auditable_id' => $kind === 'audit_type' ? $obsolete->id : 99999, 'event' => 'uploaded', 'old_values' => ['document_type_id' => $obsolete->id]]);
        }
        $before = DocumentType::orderBy('id')->get()->toArray();
        Cache::put('document_types_active', ['stale']);
        $blocked = false;
        try {
            $this->migration()->up();
        } catch (\RuntimeException $exception) {
            $blocked = true;
            $this->assertStringContainsString('alignment aborted', $exception->getMessage());
            $this->assertStringContainsString('bank_account_proof', $exception->getMessage());
        }
        $this->assertTrue($blocked, 'Expected reference protection');
        $this->assertSame($before, DocumentType::orderBy('id')->get()->toArray());
        $this->assertTrue(Cache::has('document_types_active'));
    }

    public function test_all_catalogue_responses_follow_sort_order_instead_of_id_or_label(): void
    {
        $baseline = (require database_path('data/system_master_data.php'))['document_types'];
        $custom = $this->type('aaa_custom', ['display_name' => 'AAA Custom']);
        foreach (array_reverse($baseline) as $definition) {
            DocumentType::create($definition);
        }
        $expected = [...array_column($baseline, 'name'), $custom->name];
        $check = fn (AssertableInertia $page) => $page->where('documentTypes', fn ($types) => collect($types)->pluck('name')->all() === $expected);
        $this->actingAs($this->user('super_admin'))->get('/admin/document-types')->assertOk()->assertInertia($check);
        $this->get('/admin/documents?status=all')->assertOk()->assertInertia($check);
        $user = $this->user('vendor');
        $vendor = Vendor::factory()->create(['user_id' => $user->id, 'status' => Vendor::STATUS_ACTIVE]);
        $this->actingAs($user)->get('/vendor/documents')->assertOk()->assertInertia($check);
        $vendor->update(['status' => Vendor::STATUS_DRAFT]);
        $user->unsetRelation('vendor');
        $this->get('/vendor/onboarding')->assertOk()->assertInertia($check);
    }
}
