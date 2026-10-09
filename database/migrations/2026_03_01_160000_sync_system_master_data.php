<?php

use App\Services\SystemMasterDataService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (app()->environment('testing')) {
            return;
        }

        DB::transaction(function (): void {
            // Spatie columns and operational grants are introduced by the later RBAC migration.
            $this->syncLegacyRbacData();

            $service = app(SystemMasterDataService::class);
            $service->syncVendorStates();
            $service->syncDocumentTypes();
            $service->syncComplianceRules();
            $service->syncPerformanceMetrics();
        });
    }

    private function syncLegacyRbacData(): void
    {
        $baseline = require database_path('data/system_master_data.php');
        $timestamps = ['created_at' => now(), 'updated_at' => now()];
        $newRoles = [];

        foreach ($baseline['roles'] as $role) {
            if (! DB::table('roles')->where('name', $role['name'])->exists()) {
                $newRoles[$role['name']] = DB::table('roles')->insertGetId([
                    'name' => $role['name'],
                    'display_name' => $role['display_name'],
                    'description' => $role['description'] ?? null,
                ] + $timestamps);
            }
        }

        foreach ($baseline['permissions'] as $permission) {
            if (! DB::table('permissions')->where('name', $permission['name'])->exists()) {
                DB::table('permissions')->insert([
                    'name' => $permission['name'],
                    'display_name' => $permission['display_name'],
                    'group' => $permission['group'] ?? null,
                ] + $timestamps);
            }
        }

        $permissionIds = DB::table('permissions')->pluck('id', 'name');
        foreach ($newRoles as $name => $roleId) {
            foreach ($baseline['role_permissions'][$name] ?? [] as $code) {
                DB::table('permission_role')->insertOrIgnore([
                    'role_id' => $roleId,
                    'permission_id' => $permissionIds[$code],
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Intentionally left blank to avoid destructive rollback of master data.
    }
};
