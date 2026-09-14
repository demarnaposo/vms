<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class SendNotificationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasAnyRole(['ops_manager', 'super_admin']) ?? false;
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'message' => 'required|string|max:2000',
            'severity' => 'required|in:info,warning,critical',
            'target' => 'required|in:all_vendors,specific_vendor,specific_user',
            'target_id' => 'required_unless:target,all_vendors|nullable|integer|exists:users,id',
            'action_url' => 'nullable|url|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'target_id.required_unless' => 'Please select a recipient.',
            'target_id.exists' => 'The selected recipient does not exist.',
        ];
    }
}
