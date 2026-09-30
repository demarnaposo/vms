<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $morphClass = (new User)->getMorphClass();
        $legacyType = str_replace('\\', '', User::class);

        foreach (['role_user', 'model_has_permissions'] as $table) {
            if (! Schema::hasColumn($table, 'model_type')) {
                throw new RuntimeException('Missing Spatie RBAC schema in '.$table);
            }
            if (DB::table($table)->whereNotIn('model_type', [$morphClass, $legacyType])->exists()) {
                throw new RuntimeException('Unexpected RBAC model type in '.$table.'; review before conversion.');
            }
        }

        // MySQL consumes backslashes in ordinary DDL string defaults. A hex literal preserves the class name.
        $default = in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true)
            ? DB::raw('0x'.bin2hex($morphClass))
            : $morphClass;
        Schema::table('role_user', fn (Blueprint $table) => $table->string('model_type')->default($default)->change());

        DB::transaction(function () use ($morphClass, $legacyType): void {
            foreach (['role_user', 'model_has_permissions'] as $table) {
                // Bound values preserve backslashes and existing assignment IDs; no grants are added.
                DB::table($table)->where('model_type', $legacyType)->update(['model_type' => $morphClass]);
            }
        });
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        throw new RuntimeException('Reverting the RBAC morph repair would revoke existing access; automatic rollback is disabled.');
    }
};
