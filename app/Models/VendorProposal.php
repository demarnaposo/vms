<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VendorProposal extends Model
{
    use HasFactory;

    protected $fillable = [
        'vendor_application_id',
        'document_path',
        'proposal_hash',
        'status',
        'ip_address',
        'signed_at',
    ];

    protected $casts = [
        'signed_at' => 'datetime',
    ];

    /**
     * @return BelongsTo<VendorApplication, $this>
     */
    public function application(): BelongsTo
    {
        return $this->belongsTo(VendorApplication::class, 'vendor_application_id');
    }
}
