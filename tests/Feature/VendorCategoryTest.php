<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Models\Vendor;
use App\Models\VendorApplication;
use App\Models\VendorCategory;
use App\Services\SystemMasterDataService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class VendorCategoryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        VendorCategory::create([
            'code' => 'test_services',
            'display_name' => 'Test Services',
            'is_active' => true,
        ]);
    }

    private function userWithRole(string $role): User
    {
        Role::firstOrCreate(['name' => $role], ['display_name' => $role]);
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    public function test_system_master_data_does_not_create_vendor_categories(): void
    {
        $this->assertDatabaseMissing('vendor_categories', ['code' => 'it_multimedia']);

        app(SystemMasterDataService::class)->syncCoreData();

        $this->assertDatabaseMissing('vendor_categories', ['code' => 'it_multimedia']);
        $this->assertDatabaseCount('vendor_categories', 1);
    }

    public function test_only_super_admin_can_access_every_category_endpoint(): void
    {
        foreach (['vendor', 'ops_manager', 'finance_manager'] as $role) {
            $user = $this->userWithRole($role);
            $category = VendorCategory::firstOrFail();

            $this->actingAs($user)->get(route('admin.vendor-categories.index'))->assertForbidden();
            $this->actingAs($user)->post(route('admin.vendor-categories.store'), [])->assertForbidden();
            $this->actingAs($user)->put(route('admin.vendor-categories.update', $category), [])->assertForbidden();
            $this->actingAs($user)->delete(route('admin.vendor-categories.destroy', $category))->assertForbidden();
        }
    }

    public function test_super_admin_can_manage_categories_and_cannot_delete_used_category(): void
    {
        $admin = $this->userWithRole('super_admin');
        $this->actingAs($admin)->post(route('admin.vendor-categories.store'), [
            'code' => 'office_supplies', 'display_name' => 'Office Supplies', 'is_active' => true,
        ])->assertSessionHasNoErrors();

        $category = VendorCategory::where('code', 'office_supplies')->firstOrFail();
        $this->actingAs($admin)->put(route('admin.vendor-categories.update', $category), [
            'code' => 'office_supplies', 'display_name' => 'Office Goods', 'is_active' => false,
        ])->assertSessionHasNoErrors();
        $this->assertFalse($category->fresh()->is_active);

        $application = VendorApplication::create([
            'user_id' => User::factory()->create()->id,
            'status' => 'draft',
            'current_step' => 1,
            'data' => ['step1' => ['category_id' => $category->id]],
        ]);
        $this->actingAs($admin)->delete(route('admin.vendor-categories.destroy', $category))
            ->assertSessionHasErrors('category');
        $application->delete();

        Vendor::factory()->create(['category_id' => $category->id]);
        $this->actingAs($admin)->delete(route('admin.vendor-categories.destroy', $category))
            ->assertSessionHasErrors('category');

        $unused = VendorCategory::create([
            'code' => 'unused_category', 'display_name' => 'Unused', 'is_active' => false,
        ]);
        $this->actingAs($admin)->delete(route('admin.vendor-categories.destroy', $unused))
            ->assertSessionHasNoErrors();
        $this->assertModelMissing($unused);
    }

    public function test_legacy_draft_code_resolves_without_losing_original_value(): void
    {
        VendorCategory::create([
            'code' => 'it_multimedia',
            'display_name' => 'Historical Category',
            'is_active' => true,
        ]);
        $vendor = $this->userWithRole('vendor');
        $application = VendorApplication::create([
            'user_id' => $vendor->id,
            'status' => 'draft',
            'current_step' => 1,
            'data' => ['step1' => ['category' => 'it_multimedia']],
        ]);

        $draft = app(\App\Services\VendorService::class)->getDraftApplication($vendor);
        $this->assertSame($application->id, $draft->id);
        $this->assertSame('it_multimedia', $draft->data['step1']['category']);
        $this->assertSame(VendorCategory::where('code', 'it_multimedia')->value('id'), $draft->data['step1']['category_id']);
    }

    public function test_migration_backfills_unknown_legacy_vendor_and_draft_categories(): void
    {
        Schema::table('vendors', function (Blueprint $table): void {
            $table->string('category', 100)->nullable();
        });

        $vendor = Vendor::factory()->create();
        DB::table('vendors')->where('id', $vendor->id)->update([
            'category' => 'Specialized Legacy Work',
            'category_id' => null,
        ]);
        $application = VendorApplication::create([
            'user_id' => User::factory()->create()->id,
            'status' => 'draft',
            'current_step' => 1,
            'data' => ['step1' => ['category' => 'Specialized Legacy Work']],
        ]);

        $migration = require database_path('migrations/2026_09_25_000000_create_vendor_categories_and_backfill.php');
        $migration->up();

        $dropMigration = require database_path('migrations/2026_09_26_000000_drop_legacy_category_from_vendors_table.php');
        $dropMigration->up();

        $category = VendorCategory::where('display_name', 'Specialized Legacy Work')->firstOrFail();
        $this->assertSame($category->id, $vendor->fresh()->category_id);
        $this->assertSame($category->id, $application->fresh()->data['step1']['category_id']);
        $this->assertSame('Specialized Legacy Work', $application->fresh()->data['step1']['category']);
        $this->assertFalse(Schema::hasColumn('vendors', 'category'));
    }

    public function test_drop_migration_preserves_existing_category_id_and_maps_unresolved_legacy_values(): void
    {
        Schema::table('vendors', function (Blueprint $table): void {
            $table->string('category', 100)->nullable();
        });

        $existingCategory = VendorCategory::firstOrFail();
        $existingVendor = Vendor::factory()->create(['category_id' => $existingCategory->id]);
        $legacyVendor = Vendor::factory()->create();
        DB::table('vendors')->where('id', $existingVendor->id)->update(['category' => 'Older Label']);
        DB::table('vendors')->where('id', $legacyVendor->id)->update(['category' => 'Legacy Work']);

        $migration = require database_path('migrations/2026_09_26_000000_drop_legacy_category_from_vendors_table.php');
        $migration->up();

        $this->assertSame($existingCategory->id, $existingVendor->fresh()->category_id);
        $this->assertSame('Legacy Work', $legacyVendor->fresh()->vendorCategory->display_name);
        $this->assertFalse(Schema::hasColumn('vendors', 'category'));
    }
}
