<?php

namespace App\Http\Requests\Admin;

use App\Models\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class SaveStaffUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isSuperAdmin() === true;
    }

    protected function prepareForValidation(): void
    {
        // Keep the previous create-form payload compatible during the UI transition.
        if (! $this->has('role_ids') && $this->filled('role')) {
            $id = Role::where('name', $this->input('role'))->where('guard_name', 'web')->value('id');
            $this->merge(['role_ids' => $id ? [$id] : []]);
        }
    }

    public function rules(): array
    {
        $target = $this->route('staffUser');

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', Rule::unique('users', 'email')->ignore($target?->id)],
            'password' => [$target ? 'prohibited' : 'required', 'confirmed', Password::defaults()],
            'role_ids' => ['required', 'array', 'min:1'],
            'role_ids.*' => ['required', 'integer', 'distinct', Rule::exists('roles', 'id')->where('guard_name', 'web')->where('is_staff', true)->whereNot('name', Role::VENDOR)],
            'guard_name' => ['prohibited'], 'is_staff' => ['prohibited'],
        ];
    }

    public function attributes(): array
    {
        return [
            'role_ids' => __('staff.roles'), 'role_ids.*' => __('staff.role'),
            'guard_name' => __('staff.guard'), 'is_staff' => __('staff.staff_scope'),
        ];
    }

    public function messages(): array
    {
        return ['email.lowercase' => __('staff.email_lowercase')];
    }
}
