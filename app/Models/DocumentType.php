<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DocumentType extends Model
{
    use HasFactory;

    protected static function booted(): void
    {
        static::updating(function (self $type): void {
            if ($type->isDirty('name')) {
                throw \Illuminate\Validation\ValidationException::withMessages(['name' => 'Document type codes cannot be changed after creation.']);
            }
        });
        foreach (['saved', 'deleted'] as $event) {
            static::$event(function (): void {
                \Illuminate\Support\Facades\DB::afterCommit(fn () => \Illuminate\Support\Facades\Cache::forget('document_types_active'));
            });
        }
    }

    protected $fillable = [
        'name',
        'display_name',
        'description',
        'is_mandatory',
        'has_expiry',
        'expiry_warning_days',
        'allowed_extensions',
        'max_file_size_mb',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_mandatory' => 'boolean',
        'has_expiry' => 'boolean',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
        'expiry_warning_days' => 'integer',
        'max_file_size_mb' => 'integer',
        'allowed_extensions' => 'array',
    ];

    /**
     * Get all documents of this type.
     */
    /**
     * @return HasMany<VendorDocument, $this>
     */
    public function documents(): HasMany
    {
        return $this->hasMany(VendorDocument::class);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }

    /**
     * Scope for active document types.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for mandatory document types.
     */
    public function scopeMandatory($query)
    {
        return $query->where('is_mandatory', true);
    }
}
