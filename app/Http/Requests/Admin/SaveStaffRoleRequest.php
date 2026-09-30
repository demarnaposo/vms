<?php

namespace App\Http\Requests\Admin;

use App\Models\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveStaffRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isSuperAdmin() === true;
    }

    public function rules(): array
    {
        $role = $this->route('staffRole');

        return [
            'name' => $role ? ['required', Rule::in([$role->name])] : ['required', 'string', 'max:100', 'regex:/^[a-z][a-z0-9_]*$/', Rule::notIn(Role::builtInNames()), Rule::unique('roles', 'name')],
            'display_name' => ['required', 'string', 'max:255'], 'description' => ['nullable', 'string', 'max:1000'],
            'permission_ids' => ['present', 'array'],
            'permission_ids.*' => ['required', 'integer', 'distinct', Rule::exists('permissions', 'id')->where('guard_name', 'web')->whereIn('name', array_keys(config('rbac.permissions')))],
            'guard_name' => ['prohibited'], 'is_staff' => ['prohibited'],
        ];
    }

    public function attributes(): array
    {
        return [
            'name' => __('staff.role_code'), 'display_name' => __('staff.role_name'),
            'permission_ids' => __('staff.permissions'), 'permission_ids.*' => __('staff.permission'),
            'guard_name' => __('staff.guard'), 'is_staff' => __('staff.staff_scope'),
        ];
    }

    public function messages(): array
    {
        return [
            'permission_ids.present' => __('staff.permissions_present'),
            'name.not_in' => __('staff.builtin_role_code'),
        ];
    }
}
