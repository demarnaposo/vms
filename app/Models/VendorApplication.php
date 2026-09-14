<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class VendorApplication extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'current_step',
        'data',
        'status',
    ];

    protected $casts = [
        'data' => 'array',
        'current_step' => 'integer',
    ];

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasOne<VendorProposal, $this>
     */
    public function proposal(): HasOne
    {
        return $this->hasOne(VendorProposal::class);
    }
}
