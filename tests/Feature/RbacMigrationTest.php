<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class RbacMigrationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['database.connections.rbac_migration_test' => ['driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '', 'foreign_key_constraints' => true], 'database.default' => 'rbac_migration_test']);
        $this->assertSame(':memory:', DB::connection()->getDatabaseName());
        $this->assertSame('sqlite', DB::connection()->getDriverName());
        (require database_path('migrations/0001_01_01_000000_create_users_table.php'))->up();
        (require database_path('migrations/2026_01_12_000001_create_roles_and_permissions_tables.php'))->up();
        DB::table('users')->insert(['id' => 71, 'name' => 'Fixture', 'email' => 'fixture@example.com', 'password' => 'test-only']);
        DB::table('roles')->insert([
            ['id' => 21, 'name' => 'finance_manager', 'display_name' => 'Label manual', 'description' => 'Keep'],
            ['id' => 22, 'name' => 'ops_manager', 'display_name' => 'Ops', 'description' => null],
            ['id' => 23, 'name' => 'legacy_custom', 'display_name' => 'Custom', 'description' => 'Historical'],
        ]);
        DB::table('permissions')->insert(['id' => 41, 'name' => 'compliance.view', 'display_name' => 'Legacy', 'group' => 'compliance']);
        DB::table('permission_role')->insert(['role_id' => 21, 'permission_id' => 41]);
        DB::table('role_user')->insert(['user_id' => 71, 'role_id' => 21]);
    }

    protected function tearDown(): void
    {
        DB::disconnect('rbac_migration_test');
        config(['database.default' => 'sqlite']);
        parent::tearDown();
    }

    public function test_conversion_preserves_ids_metadata_grants_and_effective_boundary(): void
    {
        (require database_path('migrations/2026_09_30_000000_integrate_spatie_rbac.php'))->up();
        $this->assertDatabaseHas('roles', ['id' => 21, 'display_name' => 'Label manual', 'description' => 'Keep', 'guard_name' => 'web', 'is_staff' => true]);
        $this->assertDatabaseHas('roles', ['id' => 23, 'name' => 'legacy_custom', 'is_staff' => false]);
        $this->assertDatabaseHas('permissions', ['id' => 41, 'name' => 'compliance.view', 'display_name' => 'Legacy']);
        $this->assertDatabaseHas('permission_role', ['role_id' => 21, 'permission_id' => 41]);
        $this->assertDatabaseHas('role_user', ['user_id' => 71, 'role_id' => 21, 'model_type' => (new User)->getMorphClass()]);
        $this->assertSame(1, DB::table('role_user')->count());
        $user = User::findOrFail(71);
        $this->assertTrue($user->hasPermissionTo('compliance.view'));
        $this->assertFalse($user->staffCan('compliance.access'));
        $this->assertFalse($user->staffCan('documents.list'));
        $this->assertTrue($user->staffCan('documents.view'));
        $this->assertTrue($user->staffCan('payments.approve'));
        $opsExport = DB::table('permissions')->where('name', 'staff.reports.export')->value('id');
        $this->assertDatabaseHas('permission_role', ['role_id' => 22, 'permission_id' => $opsExport]);
    }

    public function test_namespace_collision_stops_before_schema_changes(): void
    {
        DB::table('permissions')->insert(['name' => 'staff.vendors.view', 'display_name' => 'Collision']);
        try {
            (require database_path('migrations/2026_09_30_000000_integrate_spatie_rbac.php'))->up();
            $this->fail('Expected preflight failure');
        } catch (\RuntimeException $exception) {
            $this->assertStringContainsString('namespace collision', $exception->getMessage());
        }
        $this->assertFalse(Schema::hasColumn('roles', 'guard_name'));
        $this->assertSame(1, DB::table('role_user')->count());
    }

    public function test_morph_repair_restores_legacy_super_admin_without_changing_assignments(): void
    {
        (require database_path('migrations/2026_09_30_000000_integrate_spatie_rbac.php'))->up();
        DB::table('roles')->insert(['id' => 24, 'name' => 'super_admin', 'display_name' => 'Admin', 'guard_name' => 'web', 'is_staff' => true]);
        DB::table('role_user')->insert(['user_id' => 71, 'role_id' => 24]);
        DB::table('role_user')->update(['model_type' => 'AppModelsUser']);
        $permissionId = DB::table('permissions')->where('name', 'staff.documents.list')->value('id');
        DB::table('model_has_permissions')->insert(['user_id' => 71, 'permission_id' => $permissionId, 'model_type' => 'AppModelsUser']);
        $assignments = DB::table('role_user')->select('user_id', 'role_id')->orderBy('role_id')->get()->toArray();
        $this->assertFalse(User::findOrFail(71)->isSuperAdmin());

        (require database_path('migrations/2026_09_30_000001_repair_rbac_user_morph_type.php'))->up();

        $user = User::findOrFail(71);
        $this->assertTrue($user->isSuperAdmin());
        $this->assertTrue($user->staffCan('dashboard.view'));
        $this->actingAs($user)->get('/dashboard')->assertRedirect(route('admin.dashboard'));
        $this->assertEquals($assignments, DB::table('role_user')->select('user_id', 'role_id')->orderBy('role_id')->get()->toArray());
        $this->assertDatabaseHas('model_has_permissions', ['user_id' => 71, 'permission_id' => $permissionId, 'model_type' => (new User)->getMorphClass()]);
        DB::table('users')->insert(['id' => 72, 'name' => 'Second fixture', 'email' => 'second@example.com', 'password' => 'test-only']);
        DB::table('role_user')->insert(['user_id' => 72, 'role_id' => 24]);
        $this->assertTrue(User::findOrFail(72)->isSuperAdmin());
    }

    public function test_morph_repair_rejects_unexpected_model_types_without_changing_data(): void
    {
        (require database_path('migrations/2026_09_30_000000_integrate_spatie_rbac.php'))->up();
        DB::table('role_user')->update(['model_type' => 'OtherModel']);
        try {
            (require database_path('migrations/2026_09_30_000001_repair_rbac_user_morph_type.php'))->up();
            $this->fail('Expected unknown model type rejection');
        } catch (\RuntimeException $exception) {
            $this->assertStringContainsString('Unexpected RBAC model type', $exception->getMessage());
        }
        $this->assertDatabaseHas('role_user', ['user_id' => 71, 'role_id' => 21, 'model_type' => 'OtherModel']);
    }

    public function test_mysql_repair_default_preserves_backslashes_in_compiled_sql(): void
    {
        $connection = new \Illuminate\Database\MySqlConnection(fn () => throw new \RuntimeException('No real connection permitted'));
        $connection->useDefaultSchemaGrammar();
        $morphClass = (new User)->getMorphClass();
        $blueprint = new \Illuminate\Database\Schema\Blueprint($connection, 'role_user', function ($table) use ($morphClass): void {
            $table->string('model_type')->default(DB::raw('0x'.bin2hex($morphClass)))->change();
        });
        $sql = implode("\n", $blueprint->toSql());
        $this->assertStringContainsString('default 0x'.bin2hex($morphClass), $sql);
        $this->assertStringNotContainsString("default '".$morphClass."'", $sql);
    }

    public function test_rollback_refuses_to_discard_new_assignments(): void
    {
        $migration = require database_path('migrations/2026_09_30_000000_integrate_spatie_rbac.php');
        $migration->up();
        try {
            $migration->down();
            $this->fail('Expected protected rollback');
        } catch (\RuntimeException $exception) {
            $this->assertStringContainsString('data-preserving conversion', $exception->getMessage());
        }
        $this->assertTrue(Schema::hasColumn('role_user', 'model_type'));
        $this->assertSame(1, DB::table('role_user')->count());
    }
}
