<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class FreshMigrationSeedTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->assertFalse($this->app->configurationIsCached());
        $this->assertSame('sqlite', DB::connection()->getDriverName());
        $this->assertSame(':memory:', DB::connection()->getDatabaseName());
        $this->assertSame('array', config('cache.default'));
        $this->assertSame('array', config('session.driver'));
        $this->assertSame('array', config('mail.default'));
        $this->assertSame('sync', config('queue.default'));
    }

    public function test_full_migration_and_seed_runs_the_non_testing_master_data_path(): void
    {
        $this->app->instance('env', 'local');

        try {
            $this->artisan('migrate', ['--seed' => true, '--force' => true])->assertExitCode(0);
        } finally {
            $this->app->instance('env', 'testing');
        }

        $baseline = collect((require database_path('data/system_master_data.php'))['document_types']);
        $types = \App\Models\DocumentType::ordered()->get();
        $this->assertCount(8, $types);
        $this->assertSame(8, $types->pluck('name')->unique()->count());
        $this->assertSame($baseline->pluck('name')->all(), $types->pluck('name')->all());
        $this->assertSame(range(1, 8), $types->pluck('sort_order')->all());
        $indonesianLabels = ['Akta Pendirian Usaha', 'NIB/OSS (Nomor Induk Berusaha)', 'NPWP (Nomor Pokok Wajib Pajak)', 'Pengukuhan Pengusaha Kena Pajak (SPPKP)', 'KTP Pemilik/Pejabat Perusahaan', 'Surat Keterangan Domisili Perusahaan', 'Company Profile', 'Dokumen Pendukung lainnya'];
        foreach ($types as $index => $type) {
            $definition = $baseline->firstWhere('name', $type->name);
            $this->assertSame($definition['display_name'], $type->display_name);
            $this->assertSame($definition['display_name'], __('master_data.document_types.'.$type->name, [], 'en'));
            $this->assertSame($indonesianLabels[$index], __('master_data.document_types.'.$type->name, [], 'id'));
            $this->assertSame($definition['is_mandatory'], $type->is_mandatory);
            $this->assertSame($definition['allowed_extensions'], $type->allowed_extensions);
            $this->assertSame(10, $type->max_file_size_mb);
            $this->assertFalse($type->has_expiry);
        }
        $documentSnapshot = $types->toArray();
        $categoryBaseline = (require database_path('data/system_master_data.php'))['vendor_categories'];
        $categories = \App\Models\VendorCategory::ordered()->get();
        $this->assertCount(10, $categories);
        $this->assertSame(array_column($categoryBaseline, 'code'), $categories->pluck('code')->all());
        foreach ($categoryBaseline as $category) {
            $this->assertDatabaseHas('vendor_categories', $category);
        }
        $categorySnapshot = $categories->toArray();

        $this->assertTrue(Schema::hasColumn('roles', 'guard_name'));
        $this->assertTrue(Schema::hasColumn('permissions', 'guard_name'));
        $this->assertDatabaseCount('roles', 4);
        $this->assertDatabaseHas('roles', ['name' => 'super_admin', 'guard_name' => 'web', 'is_staff' => true]);
        $this->assertDatabaseHas('roles', ['name' => 'vendor', 'guard_name' => 'web', 'is_staff' => false]);

        $ops = Role::findByName('ops_manager', 'web');
        $finance = Role::findByName('finance_manager', 'web');
        $this->assertTrue($ops->hasPermissionTo('staff.documents.list'));
        $this->assertTrue($finance->hasPermissionTo('staff.payments.approve'));
        $this->assertFalse($finance->hasPermissionTo('staff.documents.list'));
        $this->assertTrue(Role::findByName('vendor', 'web')->hasPermissionTo('documents.upload'));
        $this->assertTrue(User::whereHas('roles', fn ($query) => $query->where('name', 'super_admin'))->firstOrFail()->isSuperAdmin());

        $ops->revokePermissionTo('staff.documents.list');
        $userCount = User::count();
        $this->seed(DatabaseSeeder::class);
        $this->assertDatabaseCount('roles', 4);
        $this->assertDatabaseCount('users', $userCount);
        $this->assertSame($documentSnapshot, \App\Models\DocumentType::ordered()->get()->toArray());
        $this->assertSame($categorySnapshot, \App\Models\VendorCategory::ordered()->get()->toArray());
        $this->assertFalse($ops->fresh()->hasPermissionTo('staff.documents.list'));
    }

    public function test_legacy_master_data_sync_preserves_existing_metadata_and_grants(): void
    {
        $migrationName = '2026_03_01_160000_sync_system_master_data.php';
        $paths = array_values(array_filter(
            glob(database_path('migrations/*.php')),
            fn ($path) => basename($path) < $migrationName,
        ));
        $this->artisan('migrate', ['--path' => $paths, '--realpath' => true, '--force' => true])->assertExitCode(0);

        DB::table('roles')->insert(['id' => 81, 'name' => 'ops_manager', 'display_name' => 'Manual role label', 'description' => 'Keep']);
        DB::table('permissions')->insert(['id' => 91, 'name' => 'vendors.delete', 'display_name' => 'Manual permission label', 'group' => 'custom']);
        DB::table('permission_role')->insert(['role_id' => 81, 'permission_id' => 91]);
        DB::table('users')->insert(['id' => 71, 'name' => 'Fixture', 'email' => 'fixture@example.com', 'password' => 'test-only']);
        DB::table('role_user')->insert(['user_id' => 71, 'role_id' => 81]);

        $migration = require database_path('migrations/'.$migrationName);
        $this->app->instance('env', 'local');
        try {
            $migration->up();
            $migration->up();
        } finally {
            $this->app->instance('env', 'testing');
        }

        $this->assertFalse(Schema::hasColumn('roles', 'guard_name'));
        $this->assertFalse(Schema::hasColumn('permissions', 'guard_name'));
        $this->assertDatabaseHas('roles', ['id' => 81, 'display_name' => 'Manual role label', 'description' => 'Keep']);
        $this->assertDatabaseHas('permissions', ['id' => 91, 'display_name' => 'Manual permission label', 'group' => 'custom']);
        $this->assertDatabaseHas('role_user', ['user_id' => 71, 'role_id' => 81]);
        $this->assertSame([91], DB::table('permission_role')->where('role_id', 81)->pluck('permission_id')->all());
        $this->assertDatabaseCount('roles', 4);
        $this->assertFalse(DB::table('permissions')->whereIn('name', array_keys(config('rbac.permissions')))->exists());
    }
}
