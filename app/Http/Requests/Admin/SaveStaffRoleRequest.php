<?php

namespace App\Http\Requests\Admin;

use App\Models\Permission;
use App\Models\Role;
use App\Support\PaymentsModule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveStaffRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        if ($this->user()?->isSuperAdmin() !== true) {
            return false;
        }

        abort_if(! PaymentsModule::enabled() && $this->route('staffRole')?->name === Role::FINANCE_MANAGER, 404);

        return true;
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

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if (PaymentsModule::enabled() || ! is_array($this->input('permission_ids'))) {
                return;
            }
            $ids = array_filter($this->input('permission_ids'), fn ($id) => is_int($id) || (is_string($id) && ctype_digit($id)));
            $blockedIds = Permission::where('guard_name', 'web')->whereIn('id', $ids)->get()
                ->filter(fn (Permission $permission) => PaymentsModule::isPaymentPermission($permission->name, $permission->group))
                ->pluck('id')->all();
            if ($blockedIds !== []) {
                foreach ($this->input('permission_ids') as $index => $id) {
                    if (in_array($id, $blockedIds)) {
                        $validator->errors()->forget('permission_ids.'.$index);
                    }
                }
                $validator->errors()->add('permission_ids', __('staff.payments_disabled'));
            }
        });
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
