<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VendorState extends Model
{
    use HasFactory;

    public const STATE_PENDING = 'pending';

    public const STATE_ACTIVE = 'active';

    public const STATE_SUSPENDED = 'suspended';

    public const STATE_DISMISSED = 'dismissed';

    public const STATE_TERMINATED = 'terminated';

    protected $fillable = [
        'name',
        'display_name',
        'is_terminal',
        'sort_order',
    ];

    protected $casts = [
        'is_terminal' => 'boolean',
    ];
}
