<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string|null $description
 */
class VendorCategory extends Model
{
    use Auditable;

    protected $fillable = ['code', 'display_name', 'description', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    protected static function booted(): void
    {
        static::updating(function (self $category): void {
            if ($category->isDirty('code')) {
                throw \Illuminate\Validation\ValidationException::withMessages(['code' => 'Category codes cannot be changed after creation.']);
            }
        });
    }

    public function scopeOrdered($query)
    {
        $baseline = require database_path('data/system_master_data.php');
        $codes = array_column($baseline['vendor_categories'] ?? [], 'code');
        if ($codes !== []) {
            $cases = implode(' ', array_map(fn ($index) => 'WHEN ? THEN '.$index, array_keys($codes)));
            $query->orderByRaw('CASE code '.$cases.' ELSE '.count($codes).' END', $codes);
        }

        return $query->orderBy('display_name')->orderBy('id');
    }

    public function vendors(): HasMany
    {
        return $this->hasMany(Vendor::class, 'category_id');
    }
}
