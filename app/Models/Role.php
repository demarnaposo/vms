<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class Role extends \Spatie\Permission\Models\Role
{
    use HasFactory;

    const SUPER_ADMIN = 'super_admin';

    const OPS_MANAGER = 'ops_manager';

    const FINANCE_MANAGER = 'finance_manager';

    const VENDOR = 'vendor';

    protected $fillable = ['name', 'display_name', 'description', 'guard_name', 'is_staff'];

    protected $casts = ['is_staff' => 'boolean'];

    public static function builtInNames(): array
    {
        return [self::SUPER_ADMIN, self::OPS_MANAGER, self::FINANCE_MANAGER, self::VENDOR];
    }

    protected static function booted(): void
    {
        static::creating(function (Role $role): void {
            if (in_array($role->name, self::builtInNames(), true)) {
                $role->is_staff = $role->name !== self::VENDOR;
            }
        });
        static::created(function (Role $role): void {
            // Only a newly created built-in role receives bootstrap capabilities.
            foreach (config('rbac.baseline.'.$role->name, []) as $code) {
                $item = config('rbac.permissions')[$code];
                $permission = Permission::firstOrCreate(['name' => $code, 'guard_name' => 'web'], ['display_name' => $item['label'], 'group' => $item['group']]);
                $role->givePermissionTo($permission);
            }
        });
    }

    public function hasPermission(string $permission): bool
    {
        return $this->checkPermissionTo($permission, 'web');
    }
}
