<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\BusinessType;
use App\Models\DocumentType;
use App\Models\Role;
use App\Models\User;
use App\Models\Vendor;
use App\Models\VendorApplication;
use App\Models\VendorCategory;
use App\Services\BusinessTypeService;
use App\Services\SystemMasterDataService;
use App\Services\VendorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BusinessTypeManagementTest extends TestCase
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

    private function payload(string $type): array
    {
        return [
            'company_name' => 'Test Company', 'business_type' => $type,
            'business_identification_number' => '1234567890123', 'tax_id' => '0123456789012345',
            'deed_number' => 'DEED-001',
            'category_id' => VendorCategory::firstOrCreate(['code' => 'test_services'], ['display_name' => 'Test Services', 'is_active' => true])->id,
            'experience' => 'Example project', 'contact_person' => 'Test Person', 'contact_phone' => '081234567890',
            'address' => 'Test Address', 'state' => 'Jawa Barat', 'city' => 'Kota Bandung', 'pincode' => '40115',
        ];
    }

    public function test_every_endpoint_requires_super_admin(): void
    {
        $type = BusinessType::firstOrFail();
        $this->get('/admin/business-types')->assertRedirect('/login');
        foreach (['vendor', 'ops_manager', 'finance_manager'] as $role) {
            $this->actingAs($this->actor($role));
            $this->get('/admin/business-types')->assertForbidden();
            $this->post('/admin/business-types', [])->assertForbidden();
            $this->put('/admin/business-types/'.$type->id, [])->assertForbidden();
            $this->delete('/admin/business-types/'.$type->id)->assertForbidden();
        }
    }

    public function test_crud_feedback_and_immutable_code(): void
    {
        $this->actingAs($this->actor());
        $payload = ['code' => 'custom_entity', 'display_name' => 'Custom Entity', 'is_active' => true];
        $this->post('/admin/business-types', $payload)->assertSessionHasNoErrors()->assertSessionHas('success', 'Business type added.');
        $type = BusinessType::where('code', 'custom_entity')->firstOrFail();
        $this->put('/admin/business-types/'.$type->id, [...$payload, 'display_name' => 'Changed', 'is_active' => false])
            ->assertSessionHasNoErrors()->assertSessionHas('success', 'Business type updated.');
        $this->put('/admin/business-types/'.$type->id, [...$payload, 'code' => 'renamed'])
            ->assertSessionHasErrors('code');
        $this->assertSame('Changed', $type->fresh()->display_name);
        $this->assertFalse($type->fresh()->is_active);
        $this->delete('/admin/business-types/'.$type->id)->assertSessionHas('success', 'Business type deleted.');
        $this->assertModelMissing($type);
    }

    public function test_invalid_and_duplicate_input_does_not_partially_save(): void
    {
        $this->actingAs($this->actor());
        foreach ([
            ['code' => 'pvt_ltd', 'display_name' => 'Duplicate', 'is_active' => true],
            ['code' => 'Invalid Code', 'display_name' => '', 'is_active' => 'invalid'],
            ['code' => str_repeat('x', 51), 'display_name' => str_repeat('x', 256), 'is_active' => true],
            ['code' => [], 'display_name' => [], 'is_active' => null],
        ] as $payload) {
            $this->post('/admin/business-types', $payload)->assertSessionHasErrors();
        }
        $this->assertDatabaseCount('business_types', 5);
        $this->assertDatabaseHas('business_types', ['code' => 'pvt_ltd', 'display_name' => 'Private Limited']);
    }

    public function test_deletion_protects_vendor_soft_deleted_vendor_and_audit_history(): void
    {
        $this->actingAs($this->actor());
        $type = BusinessType::where('code', 'pvt_ltd')->firstOrFail();
        $vendor = Vendor::factory()->create(['business_type' => $type->code]);
        $url = '/admin/business-types/'.$type->id;
        $this->delete($url)->assertSessionHas('error');
        $vendor->delete();
        $this->delete($url)->assertSessionHas('error');
        $vendor->forceDelete();
        $this->delete($url)->assertSessionHas('error');
        $this->assertModelExists($type);
    }

    public function test_deletion_protects_all_application_statuses_and_old_audit_values(): void
    {
        $this->actingAs($this->actor());
        $type = BusinessType::where('code', 'llp')->firstOrFail();
        foreach (['draft', 'submitted', 'abandoned'] as $status) {
            $application = VendorApplication::create(['user_id' => User::factory()->create()->id, 'status' => $status, 'data' => ['step1' => ['business_type' => $type->code]]]);
            $this->delete('/admin/business-types/'.$type->id)->assertSessionHas('error');
            $application->delete();
        }
        AuditLog::create(['auditable_type' => Vendor::class, 'auditable_id' => 999, 'event' => 'updated', 'old_values' => ['business_type' => 'llp'], 'new_values' => ['business_type' => 'pvt_ltd']]);
        $this->delete('/admin/business-types/'.$type->id)->assertSessionHas('error');
    }

    public function test_new_onboarding_uses_active_catalogue_and_rejects_unknown_or_inactive_values(): void
    {
        $this->actingAs($this->actor('vendor'));
        BusinessType::create(['code' => 'new_entity', 'display_name' => 'New Entity', 'is_active' => true]);
        $this->post('/vendor/onboarding/step1', $this->payload('new_entity'))->assertSessionHasNoErrors();
        $this->assertSame('new_entity', VendorApplication::firstOrFail()->data['step1']['business_type']);
        BusinessType::where('code', 'llp')->update(['is_active' => false]);
        foreach (['llp', 'unknown_type'] as $value) {
            $this->post('/vendor/onboarding/step1', $this->payload($value))->assertSessionHasErrors('business_type');
            $this->assertSame('new_entity', VendorApplication::firstOrFail()->data['step1']['business_type']);
        }
    }

    public function test_draft_inactive_and_unknown_legacy_values_remain_readable_and_preserved(): void
    {
        foreach (['pvt_ltd', 'private_limited', 'Unknown Historical Entity'] as $value) {
            $user = $this->actor('vendor');
            $this->actingAs($user);
            BusinessType::where('code', 'pvt_ltd')->update(['is_active' => false]);
            $application = VendorApplication::create(['user_id' => $user->id, 'status' => 'draft', 'data' => ['step1' => $this->payload($value)]]);
            $this->get('/vendor/onboarding')->assertInertia(fn (Assert $page) => $page
                ->component('Vendor/Onboarding/Wizard')->where('sessionData.step1.business_type', $value)
                ->has('businessTypes', 5));
            $this->assertSame($value, $application->fresh()->data['step1']['business_type']);
            $this->post('/vendor/onboarding/step1', $this->payload($value))->assertSessionHasNoErrors();
            $this->assertSame($value, $application->fresh()->data['step1']['business_type']);
        }
    }

    public function test_profile_and_admin_detail_use_master_relation_without_replacing_code(): void
    {
        $user = $this->actor('vendor');
        $vendor = Vendor::factory()->create(['user_id' => $user->id, 'business_type' => 'pvt_ltd']);
        BusinessType::where('code', 'pvt_ltd')->update(['display_name' => 'Administrator Label', 'is_active' => false]);
        $this->actingAs($user)->get('/vendor/profile')->assertInertia(fn (Assert $page) => $page
            ->component('Vendor/Profile')->where('vendor.business_type', 'pvt_ltd')->has('businessTypes', 5));
        $this->actingAs($this->actor())->get('/admin/vendors/'.$vendor->id)->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Vendors/Show')->where('vendor.business_type', 'pvt_ltd')->where('vendor.business_type_record.display_name', 'Administrator Label'));
        $this->assertSame('pvt_ltd', $vendor->fresh()->business_type);
    }

    public function test_profile_backend_rejects_new_invalid_type_but_preserves_legacy(): void
    {
        $user = $this->actor('vendor');
        $vendor = Vendor::factory()->create(['user_id' => $user->id, 'business_type' => 'private_limited']);
        $this->actingAs($user);
        $payload = [...$this->payload('private_limited'), 'bank_name' => 'Bank Mandiri', 'bank_account_number' => '123456789012', 'code_bank' => '008', 'bank_branch' => 'Test Branch'];
        $this->put('/vendor/profile', [...$payload, 'business_type' => 'unknown_new'])->assertSessionHasErrors('business_type');
        $this->assertSame('private_limited', $vendor->fresh()->business_type);
        $this->put('/vendor/profile', $payload)->assertSessionHasNoErrors();
        $this->assertSame('private_limited', $vendor->fresh()->business_type);
    }

    public function test_final_submit_preserves_inactive_draft_type_and_histories(): void
    {
        $user = $this->actor('vendor');
        $this->actingAs($user);
        $service = app(VendorService::class);
        $service->storeOnboardingStep1($this->payload('pvt_ltd'));
        $service->storeOnboardingStep2(['bank_name' => 'Bank Mandiri', 'bank_account_number' => '123456789012', 'code_bank' => '008', 'bank_branch' => 'Test Branch']);
        DocumentType::query()->update(['is_mandatory' => false]);
        BusinessType::where('code', 'pvt_ltd')->update(['is_active' => false]);
        $vendor = $service->submitApplication($user);
        $this->assertSame('pvt_ltd', $vendor->business_type);
        $this->assertSame('submitted', VendorApplication::firstOrFail()->status);
        $this->assertDatabaseHas('audit_logs', ['auditable_type' => Vendor::class, 'auditable_id' => $vendor->id]);
    }

    public function test_locked_writer_revalidates_and_does_not_write_invalid_data(): void
    {
        $this->actingAs($this->actor('vendor'));
        BusinessType::where('code', 'pvt_ltd')->update(['is_active' => false]);
        try {
            app(VendorService::class)->storeOnboardingStep1($this->payload('pvt_ltd'));
            $this->fail('Inactive selection should be rejected inside the transaction.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('business_type', $e->errors());
        }
        $this->assertDatabaseCount('vendor_applications', 0);
    }

    public function test_cached_vendor_relation_cannot_restore_a_stale_type(): void
    {
        $user = $this->actor('vendor');
        $vendor = Vendor::factory()->create(['user_id' => $user->id, 'business_type' => 'pvt_ltd']);
        $user->load('vendor');
        $vendor->update(['business_type' => 'partnership']);
        BusinessType::where('code', 'pvt_ltd')->update(['is_active' => false]);
        $this->actingAs($user);
        $this->expectException(ValidationException::class);
        app(VendorService::class)->storeOnboardingStep1($this->payload('pvt_ltd'));
    }

    public function test_bootstrap_is_idempotent_preserves_admin_changes_and_does_not_recreate_deleted_types(): void
    {
        BusinessType::where('code', 'pvt_ltd')->update(['display_name' => 'Administrator Label', 'is_active' => false]);
        BusinessType::create(['code' => 'custom_entity', 'display_name' => 'Custom', 'is_active' => false]);
        app(BusinessTypeService::class)->delete(BusinessType::where('code', 'llp')->firstOrFail(), $this->actor());
        app(SystemMasterDataService::class)->syncBusinessTypes();
        $migration = require database_path('migrations/2026_10_08_000001_create_business_types_table.php');
        $migration->up();
        $migration->down();
        $this->assertTrue(Schema::hasTable('business_types'));
        $this->assertDatabaseMissing('business_types', ['code' => 'llp']);
        $this->assertDatabaseHas('business_types', ['code' => 'pvt_ltd', 'display_name' => 'Administrator Label', 'is_active' => false]);
        $this->assertDatabaseHas('business_types', ['code' => 'custom_entity', 'is_active' => false]);
        $this->assertTrue(DB::table('master_data_initializations')->where('name', 'business_types')->exists());
    }

    public function test_first_bootstrap_keeps_existing_custom_settings_and_model_rejects_code_renaming(): void
    {
        BusinessType::where('code', 'pvt_ltd')->update(['display_name' => 'Existing Custom Label', 'is_active' => false]);
        DB::table('master_data_initializations')->where('name', 'business_types')->delete();
        app(SystemMasterDataService::class)->syncBusinessTypes();
        $this->assertDatabaseHas('business_types', ['code' => 'pvt_ltd', 'display_name' => 'Existing Custom Label', 'is_active' => false]);
        $this->expectException(\InvalidArgumentException::class);
        BusinessType::where('code', 'pvt_ltd')->firstOrFail()->update(['code' => 'changed_code']);
    }

    public function test_service_authorization_and_catalogue_lock_precede_writes(): void
    {
        $service = app(BusinessTypeService::class);
        $queries = [];
        DB::listen(function ($query) use (&$queries): void {
            $queries[] = $query->sql;
        });
        $service->save(['code' => 'new_entity', 'display_name' => 'New', 'is_active' => true], $this->actor());
        $lockIndex = array_search(true, array_map(fn ($sql) => str_contains($sql, 'select') && str_contains($sql, 'master_data_initializations'), $queries), true);
        $writeIndex = array_search(true, array_map(fn ($sql) => str_contains($sql, 'insert into "business_types"'), $queries), true);
        $this->assertNotFalse($lockIndex);
        $this->assertNotFalse($writeIndex);
        $this->assertGreaterThan($lockIndex, $writeIndex);
        try {
            $service->delete(BusinessType::where('code', 'new_entity')->firstOrFail(), $this->actor('ops_manager'));
            $this->fail('Service must reject non-super-admin actors.');
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            $this->assertSame(403, $e->getStatusCode());
        }
        $this->assertDatabaseHas('business_types', ['code' => 'new_entity']);
    }

    public function test_search_and_pagination(): void
    {
        $this->actingAs($this->actor());
        for ($i = 0; $i < 12; $i++) {
            BusinessType::create(['code' => 'custom_'.$i, 'display_name' => 'Custom '.$i, 'is_active' => true]);
        }
        $this->get('/admin/business-types?search=custom')->assertInertia(fn (Assert $page) => $page
            ->component('Admin/BusinessTypes/Index')->has('types.data', 10)->where('types.total', 12)->where('filters.search', 'custom'));
        $this->get('/admin/business-types?search=custom&page=2')->assertInertia(fn (Assert $page) => $page->has('types.data', 2));
        $this->get('/admin/business-types?search='.str_repeat('x', 256))->assertSessionHasErrors('search');
    }

    public function test_unknown_legacy_option_retains_its_payload_without_creating_a_catalogue_record(): void
    {
        $value = 'Unknown Historical Entity';
        $count = BusinessType::count();
        $option = app(BusinessTypeService::class)->options($value)->last();

        $this->assertInstanceOf(BusinessType::class, $option);
        $this->assertFalse($option->exists);
        $this->assertSame(['code' => $value, 'display_name' => $value, 'is_active' => false], $option->toArray());
        $this->assertSame($count, BusinessType::count());
    }
}
