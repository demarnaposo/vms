<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Support\PaymentsModule;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\PermissionRegistrar;

class RbacService
{
    public function locked(callable $action): mixed
    {
        return DB::transaction(function () use ($action) {
            // All admin-count mutations, including profile deletion, serialize on this protected row.
            Role::where('name', Role::SUPER_ADMIN)->where('guard_name', 'web')->lockForUpdate()->first();
            $result = $action();
            DB::afterCommit(fn () => app(PermissionRegistrar::class)->forgetCachedPermissions());

            return $result;
        });
    }

    private function clearUserCaches(array $ids): void
    {
        DB::afterCommit(function () use ($ids): void {
            foreach ($ids as $id) {
                \App\Http\Middleware\HandleInertiaRequests::clearAuthCache($id);
            }
        });
    }

    private function assertManager(): void
    {
        $actor = auth()->user()?->fresh();
        abort_unless($actor?->isSuperAdmin(), 403);
    }

    public function assertNotLastAdmin(User $user, array $newRoleIds = [], string $field = 'role_ids'): void
    {
        $adminRole = Role::where('name', Role::SUPER_ADMIN)->where('guard_name', 'web')->first();
        if ($adminRole && $user->isSuperAdmin() && ! in_array($adminRole->id, $newRoleIds, true)
            && User::role(Role::SUPER_ADMIN)->count() <= 1) {
            throw ValidationException::withMessages([$field => __('alerts.rbac_last_admin')]);
        }
    }

    public function saveUser(array $data, ?User $target = null): User
    {
        return $this->locked(function () use ($data, $target) {
            $this->assertManager();
            $user = $target ? User::lockForUpdate()->findOrFail($target->id) : new User;
            if ($target) {
                abort_unless($user->isStaff() && ! $user->isVendor(), 404);
            }
            $roles = Role::whereIn('id', $data['role_ids'])->where('guard_name', 'web')->where('is_staff', true)->where('name', '!=', Role::VENDOR)->lockForUpdate()->get();
            if ($roles->count() !== count($data['role_ids'])) {
                throw ValidationException::withMessages(['role_ids' => __('alerts.rbac_invalid_role')]);
            }
            $old = $target ? ['role_ids' => $user->roles->pluck('id')->all()] : null;
            if ($target) {
                $this->assertNotLastAdmin($user, $roles->pluck('id')->all());
            }
            if ($target && $user->email !== $data['email']) {
                $user->email_verified_at = null;
            }
            $user->fill(collect($data)->only($target ? ['name', 'email'] : ['name', 'email', 'password'])->all());
            if ($target && filled($data['password'] ?? null)) {
                $user->password = $data['password'];
            }
            $user->save();
            $user->syncRoles($roles);
            $this->clearUserCaches([$user->id]);
            AuditLog::log($target ? AuditLog::EVENT_UPDATED : AuditLog::EVENT_CREATED, $user, $old, ['role_ids' => $roles->pluck('id')->all()], $target ? 'Staff user updated' : 'Internal staff user created');

            return $user;
        });
    }

    public function deleteUser(User $target): void
    {
        $this->locked(function () use ($target): void {
            $this->assertManager();
            $user = User::lockForUpdate()->findOrFail($target->id);
            abort_unless($user->isStaff() && ! $user->isVendor(), 404);
            $this->assertNotLastAdmin($user, [], 'user');
            $deletion = app(AccountDeletionService::class);
            $deletion->assertStaffDeletionReady($user);
            $deletion->revokeStaffCredentials($user);
            AuditLog::log(AuditLog::EVENT_DELETED, $user, ['name' => $user->name, 'role_ids' => $user->roles->pluck('id')->all()], null, 'Staff user deleted permanently');
            $user->delete();
            $this->clearUserCaches([$user->id]);
        });
    }

    public function saveRole(array $data, ?Role $target = null): Role
    {
        return $this->locked(function () use ($data, $target) {
            $this->assertManager();
            $role = $target ? Role::lockForUpdate()->findOrFail($target->id) : new Role;
            abort_unless(! $target || ($role->guard_name === 'web' && $role->is_staff && $role->name !== Role::VENDOR), 404);
            abort_if(! PaymentsModule::enabled() && $role->name === Role::FINANCE_MANAGER, 404);
            $codes = array_keys(config('rbac.permissions'));
            $submitted = Permission::whereIn('id', $data['permission_ids'])->where('guard_name', 'web')->get();
            if (! PaymentsModule::enabled() && $submitted->contains(fn (Permission $permission) => PaymentsModule::isPaymentPermission($permission->name, $permission->group))) {
                throw ValidationException::withMessages(['permission_ids' => __('staff.payments_disabled')]);
            }
            $permissions = $submitted->whereIn('name', $codes);
            if ($permissions->count() !== count($data['permission_ids'])) {
                throw ValidationException::withMessages(['permission_ids' => __('alerts.rbac_invalid_permission')]);
            }
            $old = $target ? ['name' => $role->name, 'permission_ids' => $role->permissions->pluck('id')->all()] : null;
            $role->fill(['name' => $target ? $role->name : $data['name'], 'display_name' => $data['display_name'], 'description' => $data['description'] ?? null, 'is_staff' => true, 'guard_name' => 'web']);
            $role->save();
            if ($role->name !== Role::SUPER_ADMIN) {
                // Hidden payment grants and dormant legacy grants are preserved from server state.
                $preserved = $role->permissions()->get()->filter(fn (Permission $permission) => ! in_array($permission->name, $codes, true)
                    || (! PaymentsModule::enabled() && PaymentsModule::isPaymentPermission($permission->name, $permission->group)));
                $role->syncPermissions($permissions->merge($preserved)->unique('id'));
            }
            $this->clearUserCaches($role->users()->pluck('users.id')->all());
            AuditLog::log($target ? AuditLog::EVENT_UPDATED : AuditLog::EVENT_CREATED, $role, $old, ['name' => $role->name, 'permission_ids' => $role->permissions()->pluck('permissions.id')->all()], 'Staff role saved');

            return $role;
        });
    }

    public function deleteRole(Role $target): void
    {
        $this->locked(function () use ($target): void {
            $this->assertManager();
            $role = Role::lockForUpdate()->findOrFail($target->id);
            abort_unless($role->guard_name === 'web' && $role->is_staff, 404);
            abort_if(! PaymentsModule::enabled() && $role->name === Role::FINANCE_MANAGER, 404);
            if (in_array($role->name, Role::builtInNames(), true) || $role->users()->exists()) {
                throw ValidationException::withMessages(['role' => __('alerts.rbac_role_in_use')]);
            }
            AuditLog::log(AuditLog::EVENT_DELETED, $role, ['name' => $role->name], null, 'Unused staff role deleted');
            $role->delete();
        });
    }
}
