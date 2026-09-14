<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RazorpayTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'vendor_bond_id',
        'razorpay_order_id',
        'razorpay_payment_id',
        'razorpay_signature',
        'amount',
        'currency',
        'type',
        'status',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    /**
     * @return BelongsTo<VendorBond, $this>
     */
    public function bond(): BelongsTo
    {
        return $this->belongsTo(VendorBond::class, 'vendor_bond_id');
    }
}
