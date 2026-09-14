<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BondDeduction extends Model
{
    use HasFactory;

    protected $fillable = [
        'vendor_bond_id',
        'amount_deducted',
        'reason',
        'admin_id',
    ];

    protected $casts = [
        'amount_deducted' => 'decimal:2',
    ];

    /**
     * @return BelongsTo<VendorBond, $this>
     */
    public function bond(): BelongsTo
    {
        return $this->belongsTo(VendorBond::class, 'vendor_bond_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }
}
