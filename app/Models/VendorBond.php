<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VendorBond extends Model
{
    use HasFactory;

    protected $fillable = [
        'vendor_id',
        'total_amount',
        'current_balance',
        'currency',
        'status',
        'valid_until',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'current_balance' => 'decimal:2',
        'valid_until' => 'datetime',
    ];

    /**
     * @return BelongsTo<Vendor, $this>
     */
    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }

    /**
     * @return HasMany<RazorpayTransaction, $this>
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(RazorpayTransaction::class);
    }

    /**
     * @return HasMany<BondDeduction, $this>
     */
    public function deductions(): HasMany
    {
        return $this->hasMany(BondDeduction::class);
    }
}
