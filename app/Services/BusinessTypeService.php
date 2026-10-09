<?php

namespace App\Services;

use App\Http\Requests\Admin\SaveBusinessTypeRequest;
use App\Models\AuditLog;
use App\Models\BusinessType;
use App\Models\User;
use App\Models\Vendor;
use App\Models\VendorApplication;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class BusinessTypeService
{
    public static function locked(callable $action): mixed
    {
        return DB::transaction(function () use ($action) {
            // A permanent bootstrap row serializes catalogue changes and string/JSON writers,
            // including when the catalogue is empty and there is no foreign key to lock.
            DB::table('master_data_initializations')->where('name', 'business_types')->lockForUpdate()->firstOrFail();

            return $action();
        });
    }

    public function options(?string $current = null): Collection
    {
        $types = BusinessType::query()->where(function ($query) use ($current): void {
            $query->where('is_active', true);
            if (filled($current)) {
                $query->orWhere('code', $current);
            }
        })->orderBy('display_name')->get(['id', 'code', 'display_name', 'is_active']);

        if (filled($current) && ! $types->contains('code', $current)) {
            $types->push(new BusinessType(['code' => $current, 'display_name' => $current, 'is_active' => false]));
        }

        return $types;
    }

    public function validateSelection(?string $value, array $previous = []): void
    {
        if (filled($value) && (in_array($value, array_filter($previous, 'is_string'), true)
            || BusinessType::query()->where('code', $value)->where('is_active', true)->first()?->code === $value)) {
            return;
        }

        throw ValidationException::withMessages(['business_type' => 'Please select an active business type.']);
    }

    public function previousValues(User $user): array
    {
        return [
            Vendor::query()->where('user_id', $user->id)->value('business_type'),
            VendorApplication::query()->where('user_id', $user->id)->where('status', 'draft')
                ->latest('id')->first()?->data['step1']['business_type'] ?? null,
        ];
    }

    public function save(array $data, User $actor, ?BusinessType $target = null): void
    {
        abort_unless($actor->isSuperAdmin(), 403);
        self::locked(function () use ($data, $target): void {
            $type = $target ? BusinessType::findOrFail($target->id) : new BusinessType;
            $request = new SaveBusinessTypeRequest;
            $data = Validator::make($data, $request->typeRules($target ? $type : null), $request->messages())->validate();
            $type->fill($data)->save();
        });
    }

    public function delete(BusinessType $target, User $actor): bool
    {
        abort_unless($actor->isSuperAdmin(), 403);

        return self::locked(function () use ($target): bool {
            $type = BusinessType::findOrFail($target->id);
            if (Vendor::withTrashed()->where('business_type', $type->code)->exists()
                || VendorApplication::query()->where('data->step1->business_type', $type->code)->exists()
                || AuditLog::query()->where(function ($query) use ($type): void {
                    $query->where('old_values->business_type', $type->code)
                        ->orWhere('new_values->business_type', $type->code);
                })->exists()) {
                return false;
            }

            $type->delete();

            return true;
        });
    }
}
