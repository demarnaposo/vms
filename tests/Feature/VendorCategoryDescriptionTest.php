<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\DocumentType;
use App\Models\Role;
use App\Models\User;
use App\Models\Vendor;
use App\Models\VendorApplication;
use App\Models\VendorCategory;
use App\Services\SystemMasterDataService;
use App\Services\VendorCategoryAlignment;
use App\Services\VendorCategoryService;
use App\Services\VendorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class VendorCategoryDescriptionTest extends TestCase
{
    use RefreshDatabase;

    private function actor(string $role = 'super_admin'): User
    {
        Role::firstOrCreate(['name' => $role, 'guard_name' => 'web'], ['display_name' => $role]);
        $user = User::factory()->create();
        $user->assignRole($role);
        $user->forceFill(['email_verified_at' => now()])->save();

        return $user;
    }

    private function category(): VendorCategory
    {
        return VendorCategory::create(['code' => 'custom_services', 'display_name' => 'Custom services', 'description' => 'Custom description', 'is_active' => true]);
    }

    private function payload(int $id): array
    {
        return [
            'company_name' => 'Test Company', 'business_type' => 'pvt_ltd',
            'business_identification_number' => '1234567890123', 'tax_id' => '0123456789012345',
            'deed_number' => 'DEED-001', 'category_id' => $id, 'experience' => 'Example project',
            'contact_person' => 'Test Person', 'contact_phone' => '081234567890',
            'address' => 'Test Address', 'state' => 'Jawa Barat', 'city' => 'Kota Bandung', 'pincode' => '40115',
        ];
    }

    public function test_baseline_is_separate_ordered_and_bootstrap_preserves_admin_settings(): void
    {
        $baseline = (require database_path('data/system_master_data.php'))['vendor_categories'];
        $this->assertCount(10, $baseline);
        app(SystemMasterDataService::class)->syncVendorCategories();
        $this->assertSame(array_column($baseline, 'code'), VendorCategory::ordered()->pluck('code')->all());
        foreach ($baseline as $row) {
            $this->assertNotEmpty($row['description']);
            $this->assertStringNotContainsString(':', $row['display_name']);
            $this->assertDatabaseHas('vendor_categories', $row);
        }
        $category = VendorCategory::firstOrFail();
        $category->update(['description' => 'Administrator description', 'is_active' => false]);
        $custom = $this->category();
        app(SystemMasterDataService::class)->syncVendorCategories();
        $this->assertDatabaseCount('vendor_categories', 11);
        $this->assertSame('Administrator description', $category->fresh()->description);
        $this->assertFalse($category->fresh()->is_active);
        $this->assertModelExists($custom);
    }

    public function test_crud_description_validation_immutable_code_and_feedback(): void
    {
        $this->actingAs($this->actor());
        $payload = ['code' => 'custom', 'display_name' => 'Custom', 'description' => 'Description', 'is_active' => true];
        $this->post('/admin/vendor-categories', $payload)->assertSessionHasNoErrors()->assertSessionHas('success', 'Vendor category created.');
        $category = VendorCategory::where('code', 'custom')->firstOrFail();
        foreach ([['description' => str_repeat('x', 1001)], ['description' => []], ['code' => 'renamed'], ['display_name' => '']] as $invalid) {
            $this->put('/admin/vendor-categories/'.$category->id, [...$payload, ...$invalid])->assertSessionHasErrors();
            $this->assertSame('Description', $category->fresh()->description);
        }
        $this->post('/admin/vendor-categories', $payload)->assertSessionHasErrors('code');
        $this->put('/admin/vendor-categories/'.$category->id, [...$payload, 'description' => null])->assertSessionHasNoErrors()->assertSessionHas('success', 'Vendor category updated.');
        $this->assertNull($category->fresh()->description);
        $this->get('/admin/vendor-categories')->assertInertia(fn (Assert $page) => $page->component('Admin/VendorCategories/Index')->where('categories.0.description', null));
        $this->delete('/admin/vendor-categories/'.$category->id)->assertSessionHas('success', 'Vendor category deleted.');
        $this->assertModelMissing($category);
    }

    public function test_direct_endpoint_authorization(): void
    {
        $category = $this->category();
        $this->get('/admin/vendor-categories')->assertRedirect('/login');
        foreach (['vendor', 'ops_manager', 'finance_manager'] as $role) {
            $this->actingAs($this->actor($role));
            $this->get('/admin/vendor-categories')->assertForbidden();
            $this->post('/admin/vendor-categories', [])->assertForbidden();
            $this->put('/admin/vendor-categories/'.$category->id, [])->assertForbidden();
            $this->delete('/admin/vendor-categories/'.$category->id)->assertForbidden();
        }
    }

    public function test_delete_protects_vendor_soft_delete_all_draft_statuses_and_legacy_codes(): void
    {
        $this->actingAs($this->actor());
        $category = $this->category();
        $url = '/admin/vendor-categories/'.$category->id;
        $vendor = Vendor::factory()->create(['category_id' => $category->id]);
        $this->delete($url)->assertSessionHasErrors('category');
        $vendor->delete();
        $this->delete($url)->assertSessionHasErrors('category');
        $vendor->forceDelete();
        // The immutable vendor audit remains a business reference after force deletion.
        $this->delete($url)->assertSessionHasErrors('category');
        $draftCategory = VendorCategory::create(['code' => 'draft_category', 'display_name' => 'Draft category', 'is_active' => true]);
        foreach (['draft', 'submitted', 'abandoned'] as $status) {
            foreach (['category_id' => $draftCategory->id, 'category' => $draftCategory->code] as $key => $value) {
                $application = VendorApplication::create(['user_id' => User::factory()->create()->id, 'status' => $status, 'data' => ['step1' => [$key => $value]]]);
                $this->delete('/admin/vendor-categories/'.$draftCategory->id)->assertSessionHasErrors('category');
                $application->delete();
            }
        }
        $this->assertFalse(app(VendorCategoryService::class)->referenced($draftCategory));
        AuditLog::create(['auditable_type' => Vendor::class, 'auditable_id' => 999, 'event' => 'updated', 'old_values' => ['category_code' => $draftCategory->code], 'new_values' => []]);
        $this->delete('/admin/vendor-categories/'.$draftCategory->id)->assertSessionHasErrors('category');
        $legacy = VendorCategory::create(['code' => 'legacy_'.hash('sha256', 'Original legacy text'), 'display_name' => 'Original legacy text', 'is_active' => false]);
        VendorApplication::create(['user_id' => User::factory()->create()->id, 'data' => ['step1' => ['category' => 'Original legacy text']], 'status' => 'draft']);
        $this->delete('/admin/vendor-categories/'.$legacy->id)->assertSessionHasErrors('category');
        $this->assertModelExists($legacy);
    }

    public function test_alignment_is_additive_idempotent_and_preserves_custom_and_references(): void
    {
        $baseline = (require database_path('data/system_master_data.php'))['vendor_categories'];
        $same = VendorCategory::create([...$baseline[0], 'description' => null, 'is_active' => false]);
        $custom = $this->category();
        $collision = VendorCategory::create([...$baseline[1], 'display_name' => 'Administrator label', 'description' => null]);
        $draft = VendorApplication::create(['user_id' => User::factory()->create()->id, 'status' => 'draft', 'data' => ['step1' => ['category_id' => $same->id]]]);
        $service = app(VendorCategoryAlignment::class);
        $plan = $service->align();
        $this->assertCount(8, $plan['insert']);
        $this->assertSame([$same->id], $plan['fill_description']);
        $this->assertContains($same->id, $plan['referenced']);
        $this->assertDatabaseCount('vendor_categories', 3);
        $service->align(true);
        $this->assertDatabaseCount('vendor_categories', 11);
        $this->assertSame($baseline[0]['description'], $same->fresh()->description);
        $this->assertFalse($same->fresh()->is_active);
        $this->assertNull($collision->fresh()->description);
        $this->assertSame($same->id, $draft->fresh()->data['step1']['category_id']);
        $this->assertSame('Custom description', $custom->fresh()->description);
        $same->refresh()->update(['description' => null]);
        $second = $service->align(true);
        $this->assertSame([], $second['insert']);
        $this->assertSame([], $second['fill_description']);
        $this->assertNull($same->fresh()->description);
        app(SystemMasterDataService::class)->syncVendorCategories();
        $this->assertNull($same->fresh()->description);
        $this->assertDatabaseCount('vendor_categories', 11);
    }

    public function test_draft_category_switch_and_tampering_do_not_store_description(): void
    {
        $user = $this->actor('vendor');
        $this->actingAs($user);
        $first = $this->category();
        $second = VendorCategory::create(['code' => 'legacy', 'display_name' => 'Legacy', 'is_active' => true]);
        $this->post('/vendor/onboarding/step1', [...$this->payload($first->id), 'description' => 'Tampered', 'category_description' => 'Tampered'])->assertSessionHasNoErrors();
        $draft = VendorApplication::firstOrFail();
        $this->assertArrayNotHasKey('description', $draft->data['step1']);
        $this->assertArrayNotHasKey('category_description', $draft->data['step1']);
        $this->assertSame('Custom description', $first->fresh()->description);
        $this->post('/vendor/onboarding/step1', $this->payload($second->id))->assertSessionHasNoErrors();
        $this->assertSame($second->id, $draft->fresh()->data['step1']['category_id']);
        $draft->update(['current_step' => 4]);
        $this->get('/vendor/onboarding?step=4')->assertInertia(fn (Assert $page) => $page->component('Vendor/Onboarding/Wizard')->where('sessionData.step1.category_id', $second->id)->where('vendorCategories.1.description', null));
        $second->update(['is_active' => false]);
        $this->post('/vendor/onboarding/step1', $this->payload($second->id))->assertSessionHasNoErrors();
        $first->update(['is_active' => false]);
        $this->post('/vendor/onboarding/step1', $this->payload($first->id))->assertSessionHasErrors('category_id');
        $this->assertSame($second->id, $draft->fresh()->data['step1']['category_id']);
    }

    public function test_locked_writer_and_final_submit_preserve_inactive_category(): void
    {
        $this->actingAs($user = $this->actor('vendor'));
        $category = $this->category();
        $service = app(VendorService::class);
        $service->storeOnboardingStep1([...$this->payload($category->id), 'category_description' => 'Tampered']);
        $category->update(['is_active' => false]);
        $service->storeOnboardingStep2(['bank_name' => 'Bank Mandiri', 'bank_account_number' => '123456789012', 'code_bank' => '008', 'bank_branch' => 'Test Branch']);
        DocumentType::query()->update(['is_mandatory' => false]);
        Storage::fake('private');
        $vendor = $service->submitApplication($user);
        $this->assertSame($category->id, $vendor->category_id);
        $this->assertSame('Custom description', $vendor->vendorCategory->description);
        $this->assertArrayNotHasKey('category_description', VendorApplication::firstOrFail()->data['step1']);
    }

    public function test_invalid_locked_write_rolls_back_and_lock_precedes_mutation(): void
    {
        $this->actingAs($this->actor('vendor'));
        $category = $this->category();
        $category->update(['is_active' => false]);
        try {
            app(VendorService::class)->storeOnboardingStep1($this->payload($category->id));
            $this->fail('Inactive new selections must fail.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('category_id', $exception->errors());
        }
        $this->assertDatabaseCount('vendor_applications', 0);
        $queries = [];
        DB::listen(function ($query) use (&$queries): void {
            $queries[] = $query->sql;
        });
        $category->update(['is_active' => true]);
        app(VendorService::class)->storeOnboardingStep1($this->payload($category->id));
        $lock = array_search(true, array_map(fn ($sql) => str_contains($sql, 'select') && str_contains($sql, 'master_data_initializations') && str_contains($sql, 'name'), $queries), true);
        $write = array_search(true, array_map(fn ($sql) => str_contains($sql, 'insert into "vendor_applications"'), $queries), true);
        $this->assertNotFalse($lock);
        $this->assertNotFalse($write);
        $this->assertGreaterThan($lock, $write);
    }

    public function test_alignment_rolls_back_all_inserts_when_a_write_fails(): void
    {
        $custom = $this->category();
        DB::listen(function ($query): void {
            if (str_contains($query->sql, 'insert into "vendor_categories"') && in_array('it_digital', $query->bindings, true)) {
                throw new \RuntimeException('Simulated failure');
            }
        });
        try {
            app(VendorCategoryAlignment::class)->align(true);
            $this->fail('The alignment must fail atomically.');
        } catch (\RuntimeException $exception) {
            $this->assertSame('Simulated failure', $exception->getMessage());
        }
        $this->assertDatabaseCount('vendor_categories', 1);
        $this->assertModelExists($custom);
    }

    public function test_migration_rollback_preserves_description_and_catalogue_lock(): void
    {
        $category = $this->category();
        $migration = require database_path('migrations/2026_10_08_000002_add_description_to_vendor_categories.php');
        $migration->up();
        $migration->down();
        $this->assertSame('Custom description', $category->fresh()->description);
        $this->assertTrue(DB::table('master_data_initializations')->where('name', 'vendor_categories_lock')->exists());
    }

    public function test_profile_and_admin_details_return_the_master_description(): void
    {
        $category = $this->category();
        $category->update(['is_active' => false]);
        $user = $this->actor('vendor');
        $vendor = Vendor::factory()->create(['user_id' => $user->id, 'category_id' => $category->id]);
        $this->actingAs($user)->get('/vendor/profile')->assertInertia(fn (Assert $page) => $page->component('Vendor/Profile')->where('vendor.vendor_category.description', 'Custom description'));
        $this->actingAs($this->actor())->get('/admin/vendors/'.$vendor->id)->assertInertia(fn (Assert $page) => $page->component('Admin/Vendors/Show')->where('vendor.vendor_category.description', 'Custom description'));
        $this->assertSame($category->id, $vendor->fresh()->category_id);
    }
}
