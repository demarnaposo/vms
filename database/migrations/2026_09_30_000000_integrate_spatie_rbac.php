<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Preflight before any DDL; legacy custom roles remain unclassified until reviewed.
        foreach (['roles', 'permissions', 'permission_role', 'role_user'] as $table) {
            if (! Schema::hasTable($table)) {
                throw new RuntimeException('Missing legacy RBAC table: '.$table);
            }
        }
        if (Schema::hasColumn('roles', 'guard_name') || Schema::hasColumn('roles', 'is_staff') || Schema::hasColumn('permissions', 'guard_name') || Schema::hasColumn('role_user', 'model_type') || Schema::hasTable('model_has_permissions')) {
            throw new RuntimeException('RBAC schema already partially converted; reconcile before retrying.');
        }
        foreach ([['role_user', 'user_id', 'users'], ['role_user', 'role_id', 'roles'], ['permission_role', 'role_id', 'roles'], ['permission_role', 'permission_id', 'permissions']] as [$pivot, $key, $parent]) {
            if (DB::table($pivot)->leftJoin($parent, $pivot.'.'.$key, '=', $parent.'.id')->whereNull($parent.'.id')->exists()) {
                throw new RuntimeException('Orphan RBAC assignment in '.$pivot);
            }
        }
        if (DB::table('permissions')->whereIn('name', array_keys(config('rbac.permissions')))->exists()) {
            throw new RuntimeException('Operational permission namespace collision; reconcile legacy grants first.');
        }
        Schema::table('roles', function (Blueprint $table): void {
            $table->string('guard_name')->default('web');
            $table->boolean('is_staff')->default(false);
        });
        Schema::table('permissions', fn (Blueprint $table) => $table->string('guard_name')->default('web'));
        Schema::table('role_user', function (Blueprint $table): void {
            $table->string('model_type')->default((new \App\Models\User)->getMorphClass());
            $table->index(['model_type', 'user_id']);
        });
        Schema::create('model_has_permissions', function (Blueprint $table): void {
            $table->foreignId('permission_id')->constrained('permissions')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('model_type');
            $table->primary(['permission_id', 'user_id', 'model_type']);
        });
        DB::transaction(function (): void {
            DB::table('roles')->whereIn('name', ['super_admin', 'ops_manager', 'finance_manager'])->update(['is_staff' => true]);
            foreach (config('rbac.permissions') as $code => $item) {
                DB::table('permissions')->insertOrIgnore(['name' => $code, 'display_name' => $item['label'], 'group' => $item['group'], 'guard_name' => 'web', 'created_at' => now(), 'updated_at' => now()]);
            }
            // Materialize the approved effective endpoint baseline, without deleting old grants.
            foreach (config('rbac.baseline') as $name => $codes) {
                $roleId = DB::table('roles')->where('name', $name)->value('id');
                if (! $roleId) {
                    continue;
                }
                foreach ($codes as $code) {
                    DB::table('permission_role')->insertOrIgnore(['role_id' => $roleId, 'permission_id' => DB::table('permissions')->where('name', $code)->value('id')]);
                }
            }
        });
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        // New assignments cannot be rolled back safely by discarding schema or restoring a snapshot.
        throw new RuntimeException('RBAC rollback requires an explicit data-preserving conversion; automatic rollback is disabled.');
    }
};
