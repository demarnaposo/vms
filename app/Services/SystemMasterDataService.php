<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use InvalidArgumentException;

class SystemMasterDataService
{
    /**
     * @var array<string, mixed>
     */
    protected array $baseline;

    /**
     * @param  array<string, mixed>|null  $baseline
     */
    public function __construct(?array $baseline = null)
    {
        $this->baseline = $baseline ?? require database_path('data/system_master_data.php');
    }

    /**
     * Sync full baseline data.
     */
    public function sync(bool $includeDefaultStaffUsers = true): void
    {
        DB::transaction(function () use ($includeDefaultStaffUsers): void {
            $this->syncRolesAndPermissions();
            $this->syncVendorStates();
            $this->syncBusinessTypes();
            $this->syncVendorCategories();
            $this->syncDocumentTypes();
            $this->syncComplianceRules();
            $this->syncPerformanceMetrics();

            if ($includeDefaultStaffUsers) {
                $this->syncDefaultStaffUsers();
            }
        });
    }

    /**
     * Sync all core master data except default staff users.
     */
    public function syncCoreData(): void
    {
        $this->sync(false);
    }

    public function syncVendorCategories(): void
    {
        if (! \Illuminate\Support\Facades\Schema::hasTable('vendor_categories')
            || ! \Illuminate\Support\Facades\Schema::hasColumn('vendor_categories', 'description')) {
            return;
        }
        VendorCategoryService::locked(function (): void {
            $inserted = DB::table('master_data_initializations')->insertOrIgnore(['name' => 'vendor_categories', 'initialized_at' => now()]);
            if (! $inserted || \App\Models\VendorCategory::exists()) {
                return;
            }
            foreach ($this->data('vendor_categories') as $category) {
                DB::table('vendor_categories')->insertOrIgnore($category + ['created_at' => now(), 'updated_at' => now()]);
            }
        });
    }

    public function syncBusinessTypes(): void
    {
        if (! \Illuminate\Support\Facades\Schema::hasTable('business_types')) {
            return;
        }
        DB::transaction(function (): void {
            $inserted = DB::table('master_data_initializations')->insertOrIgnore(['name' => 'business_types', 'initialized_at' => now()]);
            DB::table('master_data_initializations')->where('name', 'business_types')->lockForUpdate()->firstOrFail();
            if (! $inserted) {
                return;
            }
            foreach ($this->data('business_types') as $type) {
                DB::table('business_types')->insertOrIgnore($type + ['created_at' => now(), 'updated_at' => now()]);
            }
        });
    }

    /**
     * Sync roles, permissions, and role-permission mapping.
     */
    public function syncRolesAndPermissions(): void
    {
        DB::transaction(function (): void {
            $newRoles = [];
            foreach ($this->data('roles') as $role) {
                if (! \App\Models\Role::where('name', $role['name'])->exists()) {
                    $newRoles[] = \App\Models\Role::create($role + ['guard_name' => 'web']);
                }
            }
            foreach ($this->data('permissions') as $permission) {
                \App\Models\Permission::firstOrCreate(['name' => $permission['name'], 'guard_name' => 'web'], $permission);
            }
            foreach (config('rbac.permissions') as $code => $item) {
                \App\Models\Permission::firstOrCreate(['name' => $code, 'guard_name' => 'web'], ['display_name' => $item['label'], 'group' => $item['group']]);
            }
            foreach ($newRoles as $role) {
                $role->givePermissionTo((array) ($this->data('role_permissions')[$role->name] ?? []));
            }
            app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
        });
    }

    /**
     * Sync vendor state master data.
     */
    public function syncVendorStates(): void
    {
        foreach ($this->data('vendor_states') as $state) {
            $this->updateOrCreateByName('vendor_states', [
                'name' => $state['name'],
                'display_name' => $state['display_name'],
                'is_terminal' => (bool) ($state['is_terminal'] ?? false),
                'sort_order' => (int) ($state['sort_order'] ?? 0),
            ]);
        }
    }

    /**
     * Sync document type master data.
     */
    public function syncDocumentTypes(): void
    {
        DB::transaction(function (): void {
            $hasMarker = \Illuminate\Support\Facades\Schema::hasTable('master_data_initializations');
            if ($hasMarker && DB::table('master_data_initializations')->where('name', 'document_types')->exists()) {
                return;
            }
            // Bootstrap an empty installation only; administrator changes remain authoritative.
            if (! DB::table('document_types')->exists()) {
                $hasSortOrder = \Illuminate\Support\Facades\Schema::hasColumn('document_types', 'sort_order');
                foreach ($this->data('document_types') as $type) {
                    if (! $hasSortOrder) {
                        unset($type['sort_order']);
                    }
                    \App\Models\DocumentType::create($type);
                }
            }
            if ($hasMarker) {
                DB::table('master_data_initializations')->insertOrIgnore(['name' => 'document_types', 'initialized_at' => now()]);
            }
        });
    }

    /**
     * Sync compliance rule master data.
     */
    public function syncComplianceRules(): void
    {
        foreach ($this->data('compliance_rules') as $rule) {
            $this->updateOrCreateByName('compliance_rules', [
                'name' => $rule['name'],
                'description' => $rule['description'],
                'type' => $rule['type'],
                'conditions' => json_encode($rule['conditions'] ?? []),
                'severity' => $rule['severity'] ?? 'medium',
                'penalty_points' => (int) ($rule['penalty_points'] ?? 0),
                'blocks_payment' => (bool) ($rule['blocks_payment'] ?? false),
                'blocks_activation' => (bool) ($rule['blocks_activation'] ?? false),
                'is_active' => (bool) ($rule['is_active'] ?? true),
            ]);
        }
    }

    /**
     * Sync performance metrics master data.
     */
    public function syncPerformanceMetrics(): void
    {
        PerformanceMetricService::locked(function (): void {
            // Bootstrap only an empty catalogue. Existing/admin configurations require an explicit replacement.
            if (\App\Models\PerformanceMetric::exists()) {
                return;
            }
            foreach ($this->data('performance_metrics') as $metric) {
                \App\Models\PerformanceMetric::firstOrCreate(['name' => $metric['name']], [
                    'display_name' => $metric['display_name'],
                    'description' => $metric['description'] ?? null,
                    'weight' => $metric['weight'] ?? '0.00',
                    'max_score' => (int) ($metric['max_score'] ?? 4),
                    'is_active' => (bool) ($metric['is_active'] ?? true),
                ]);
            }
        });
    }

    /**
     * Sync default staff users and assign core staff roles.
     */
    public function syncDefaultStaffUsers(): void
    {
        $roleIds = DB::table('roles')->pluck('id', 'name');
        $envPassword = config('app.default_staff_password');

        if (app()->isProduction() && (! $envPassword || $envPassword === 'password')) {
            throw new \RuntimeException('DEFAULT_STAFF_PASSWORD must be set to a strong password in production.');
        }

        $defaultPassword = (string) ($envPassword ?: 'password');

        foreach ($this->data('default_staff_users') as $staffUser) {
            $roleId = $roleIds[$staffUser['role']] ?? null;
            if (! $roleId) {
                continue;
            }

            $existingUser = DB::table('users')
                ->where('email', $staffUser['email'])
                ->first(['id']);

            if ($existingUser) {
                continue;
            } else {
                $userId = (int) DB::table('users')->insertGetId([
                    'name' => $staffUser['name'],
                    'email' => $staffUser['email'],
                    'password' => Hash::make($defaultPassword),
                    'email_verified_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            \App\Models\User::findOrFail($userId)->assignRole((string) $staffUser['role']);
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function data(string $key): array
    {
        $value = $this->baseline[$key] ?? [];

        return is_array($value) ? $value : [];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    protected function updateOrCreateByName(string $table, array $payload): int
    {
        $name = (string) ($payload['name'] ?? '');
        if ($name === '') {
            throw new InvalidArgumentException("Missing 'name' for {$table} sync.");
        }

        unset($payload['name']);
        $now = now();

        $existingId = DB::table($table)->where('name', $name)->value('id');
        if ($existingId) {
            DB::table($table)
                ->where('id', (int) $existingId)
                ->update(array_merge($payload, ['updated_at' => $now]));

            return (int) $existingId;
        }

        return (int) DB::table($table)->insertGetId(array_merge(
            ['name' => $name],
            $payload,
            ['created_at' => $now, 'updated_at' => $now]
        ));
    }
}
