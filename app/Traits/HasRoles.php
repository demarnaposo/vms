<?php

namespace App\Traits;

use App\Models\Role;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

trait HasRoles
{
    use \Spatie\Permission\Traits\HasRoles {
        roles as private spatieRoles;
        scopeRole as private spatieScopeRole;
    }

    /**
     * @return BelongsToMany<Role, $this>
     */
    public function roles(): BelongsToMany
    {
        return $this->spatieRoles();
    }

    public function scopeRole($query, $roles, $guard = null, $without = false)
    {
        // Legacy notification callers expect an empty result when a built-in role is not bootstrapped yet.
        if (is_string($roles) && ! Role::where('name', $roles)->where('guard_name', $guard ?? 'web')->exists()) {
            return $without ? $query : $query->whereRaw('1 = 0');
        }

        return $this->spatieScopeRole($query, $roles, $guard, $without);
    }

    protected string $guard_name = 'web';

    public function isSuperAdmin(): bool
    {
        return $this->hasRole(Role::SUPER_ADMIN, 'web');
    }

    public function isOpsManager(): bool
    {
        return $this->hasRole(Role::OPS_MANAGER, 'web');
    }

    public function isFinanceManager(): bool
    {
        return $this->hasRole(Role::FINANCE_MANAGER, 'web');
    }

    public function isVendor(): bool
    {
        return $this->hasRole(Role::VENDOR, 'web');
    }

    public function isStaff(): bool
    {
        $this->loadMissing('roles');

        return $this->roles->contains(fn (Role $role) => $role->guard_name === 'web' && $role->is_staff);
    }

    public function staffCan(string $permission): bool
    {
        $code = str_starts_with($permission, 'staff.') ? $permission : 'staff.'.$permission;

        return $this->isStaff() && array_key_exists($code, config('rbac.permissions')) && $this->can($code);
    }

    public function hasPermission(string $permission): bool
    {
        return $this->isStaff() ? $this->staffCan($permission) : $this->can($permission);
    }

    public function getPrimaryRole(): ?Role
    {
        return $this->roles()->orderBy('roles.id')->first();
    }

    public function getRoleDisplayName(): string
    {
        return $this->getPrimaryRole()->display_name ?? 'No Role';
    }
}
