<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use InvalidArgumentException;

class BusinessType extends Model
{
    use Auditable;

    protected $fillable = ['code', 'display_name', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    protected static function booted(): void
    {
        static::updating(function (BusinessType $type): void {
            if ($type->isDirty('code')) {
                throw new InvalidArgumentException('Business type codes cannot be changed after creation.');
            }
        });
    }

    public function vendors(): HasMany
    {
        return $this->hasMany(Vendor::class, 'business_type', 'code');
    }
}
