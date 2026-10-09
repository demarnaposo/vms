<?php

namespace App\Services;

use App\Http\Requests\Admin\SaveVendorCategoryRequest;
use App\Models\AuditLog;
use App\Models\User;
use App\Models\Vendor;
use App\Models\VendorApplication;
use App\Models\VendorCategory;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class VendorCategoryService
{
    public static function locked(callable $action): mixed
    {
        return DB::transaction(function () use ($action) {
            // A permanent row also protects an empty catalogue and draft JSON writers.
            DB::table('master_data_initializations')->where('name', 'vendor_categories_lock')->lockForUpdate()->firstOrFail();

            return $action();
        }, 3);
    }

    public function previousValues(User $user): array
    {
        $application = VendorApplication::where('user_id', $user->id)->where('status', 'draft')->latest('id')->first();
        $step = $application?->data['step1'] ?? [];
        $legacy = $step['category'] ?? null;
        $mapped = is_string($legacy) ? VendorCategory::whereIn('code', [$legacy, 'legacy_'.hash('sha256', $legacy)])->value('id') : null;

        return array_filter([Vendor::where('user_id', $user->id)->value('category_id'), $step['category_id'] ?? $mapped]);
    }

    public function validateSelection(mixed $id, array $previous = []): void
    {
        $category = VendorCategory::find($id);
        if ($category && ($category->is_active || in_array((int) $id, array_map('intval', $previous), true))) {
            return;
        }
        throw ValidationException::withMessages(['category_id' => 'Please select a valid category.']);
    }

    public function referenced(VendorCategory $category): bool
    {
        if (Vendor::withTrashed()->where('category_id', $category->id)->exists()) {
            return true;
        }
        foreach (VendorApplication::select(['id', 'data'])->cursor() as $application) {
            if ($this->references($application->data, $category)) {
                return true;
            }
        }
        // Master CRUD audits retain their own values after deletion; business snapshots protect references.
        foreach (AuditLog::where('auditable_type', '!=', VendorCategory::class)->select(['old_values', 'new_values'])->cursor() as $audit) {
            if ($this->references($audit->old_values, $category) || $this->references($audit->new_values, $category)) {
                return true;
            }
        }

        return false;
    }

    private function references(mixed $value, VendorCategory $category, string $key = ''): bool
    {
        if (! is_array($value)) {
            return ($key === 'category_id' && (string) $value === (string) $category->id)
                || (in_array($key, ['category', 'category_code'], true) && is_string($value)
                    && ($value === $category->code || 'legacy_'.hash('sha256', $value) === $category->code));
        }
        foreach ($value as $childKey => $child) {
            if ($this->references($child, $category, is_string($childKey) ? $childKey : $key)) {
                return true;
            }
        }

        return false;
    }

    public function save(array $data, User $actor, ?VendorCategory $target = null): void
    {
        abort_unless($actor->isSuperAdmin(), 403);
        self::locked(function () use ($data, $target): void {
            $category = $target ? VendorCategory::findOrFail($target->id) : new VendorCategory;
            $request = new SaveVendorCategoryRequest;
            $data = Validator::make($data, $request->categoryRules($target ? $category : null), $request->messages())->validate();
            $category->fill($data)->save();
        });
    }

    public function delete(VendorCategory $target, User $actor): bool
    {
        abort_unless($actor->isSuperAdmin(), 403);

        return self::locked(function () use ($target): bool {
            $category = VendorCategory::findOrFail($target->id);
            if ($this->referenced($category)) {
                return false;
            }
            $category->delete();

            return true;
        });
    }
}
