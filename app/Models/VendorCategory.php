<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VendorCategory extends Model
{
    use Auditable;

    protected $fillable = ['code', 'display_name', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    public function vendors(): HasMany
    {
        return $this->hasMany(Vendor::class, 'category_id');
    }
}
