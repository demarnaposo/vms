<?php

namespace App\Models;

use App\Services\VendorNumberGenerator;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class Vendor extends Model
{
    use Auditable, HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'company_name',
        'business_identification_number',
        'tax_id',
        // Store the vendor deed number under its actual business meaning.
        'deed_number',
        'business_type',
        'category_id',
        'experience',
        'contact_person',
        'contact_email',
        'contact_phone',
        'address',
        'city',
        'state',
        'country',
        'pincode',
        'bank_name',
        'bank_account_number',
        'code_bank',
        'bank_branch',
        'status',
        'compliance_status',
        'compliance_score',
        'performance_score',
    ];

    /**
     * Sensitive state fields excluded from mass assignment.
     * Use dedicated methods to modify these.
     */
    protected $hidden = [
        'tax_id',
        'deed_number',
        'bank_account_number',
        'code_bank',
        'internal_notes',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'approved_at' => 'datetime',
        'activated_at' => 'datetime',
        'suspended_at' => 'datetime',
        'terminated_at' => 'datetime',
        'tax_id' => 'encrypted',
        'deed_number' => 'encrypted',
        'bank_account_number' => 'encrypted',
    ];

    protected static function booted(): void
    {
        static::creating(function (Vendor $vendor): void {
            $vendor->vendor_number = app(VendorNumberGenerator::class)->next();
        });

        static::updating(function (Vendor $vendor): void {
            if ($vendor->isDirty('vendor_number')) {
                throw new InvalidArgumentException('Vendor ID is immutable.');
            }
        });
    }

    public function businessTypeRecord(): BelongsTo
    {
        return $this->belongsTo(BusinessType::class, 'business_type', 'code');
    }

    // Status constants
    const STATUS_DRAFT = 'draft';

    const STATUS_SUBMITTED = 'submitted';

    const STATUS_UNDER_REVIEW = 'under_review';

    const STATUS_APPROVED = 'approved';

    const STATUS_ACTIVE = 'active';

    const STATUS_SUSPENDED = 'suspended';

    const STATUS_TERMINATED = 'terminated';

    const STATUS_REJECTED = 'rejected';

    public const ACCESS_BLOCKED_STATUSES = [
        self::STATUS_SUSPENDED,
        self::STATUS_TERMINATED,
        self::STATUS_REJECTED,
    ];

    // Compliance status constants
    const COMPLIANCE_PENDING = 'pending';

    const COMPLIANCE_COMPLIANT = 'compliant';

    const COMPLIANCE_AT_RISK = 'at_risk';

    const COMPLIANCE_NON_COMPLIANT = 'non_compliant';

    const COMPLIANCE_BLOCKED = 'blocked';

    /**
     * Valid state transitions
     */
    protected static array $validTransitions = [
        self::STATUS_DRAFT => [self::STATUS_SUBMITTED],
        self::STATUS_SUBMITTED => [self::STATUS_UNDER_REVIEW, self::STATUS_DRAFT, self::STATUS_REJECTED],
        self::STATUS_UNDER_REVIEW => [self::STATUS_APPROVED, self::STATUS_SUBMITTED, self::STATUS_REJECTED],
        self::STATUS_APPROVED => [self::STATUS_ACTIVE],
        self::STATUS_ACTIVE => [self::STATUS_SUSPENDED, self::STATUS_TERMINATED],
        self::STATUS_SUSPENDED => [self::STATUS_ACTIVE, self::STATUS_TERMINATED],
        self::STATUS_TERMINATED => [self::STATUS_UNDER_REVIEW, self::STATUS_SUBMITTED], // Allow admin to reactivate into review
        self::STATUS_REJECTED => [self::STATUS_DRAFT, self::STATUS_SUBMITTED], // Allow re-submission
    ];

    // Relationships

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function vendorCategory(): BelongsTo
    {
        return $this->belongsTo(VendorCategory::class, 'category_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * @return HasMany<VendorDocument, $this>
     */
    public function documents(): HasMany
    {
        return $this->hasMany(VendorDocument::class);
    }

    /**
     * @return HasMany<VendorStateLog, $this>
     */
    public function stateLogs(): HasMany
    {
        return $this->hasMany(VendorStateLog::class)->orderBy('created_at', 'desc');
    }

    /**
     * @return HasMany<PaymentRequest, $this>
     */
    public function paymentRequests(): HasMany
    {
        return $this->hasMany(PaymentRequest::class);
    }

    /**
     * @return HasMany<ComplianceResult, $this>
     */
    public function complianceResults(): HasMany
    {
        return $this->hasMany(ComplianceResult::class);
    }

    /**
     * @return HasMany<ComplianceFlag, $this>
     */
    public function complianceFlags(): HasMany
    {
        return $this->hasMany(ComplianceFlag::class);
    }

    /**
     * @return HasMany<PerformanceScore, $this>
     */
    public function performanceScores(): HasMany
    {
        return $this->hasMany(PerformanceScore::class);
    }

    /**
     * @return HasMany<ScoreHistory, $this>
     */
    public function scoreHistory(): HasMany
    {
        return $this->hasMany(ScoreHistory::class);
    }

    /**
     * @return HasOne<VendorBond, $this>
     */
    public function bond(): HasOne
    {
        return $this->hasOne(VendorBond::class);
    }

    // State Machine Methods

    /**
     * Check if transition is valid.
     */
    public function canTransitionTo(string $newStatus): bool
    {
        $allowedTransitions = self::$validTransitions[$this->status] ?? [];

        return in_array($newStatus, $allowedTransitions);
    }

    /**
     * Transition to a new status.
     */
    // Tag new timeline comments as system or user-authored without changing their stored text.
    public function transitionTo(string $newStatus, User $user, ?string $comment = null, ?string $reasonCode = null, bool $automaticComment = false): bool
    {
        // Carry comment provenance into the immutable state log.
        return \Illuminate\Support\Facades\DB::transaction(function () use ($newStatus, $user, $comment, $reasonCode, $automaticComment) {
            $vendor = self::query()->lockForUpdate()->findOrFail($this->getKey());

            if (! $vendor->canTransitionTo($newStatus)) {
                throw new InvalidArgumentException("Invalid vendor status transition: {$vendor->status} -> {$newStatus}");
            }

            if (in_array($newStatus, [self::STATUS_REJECTED, self::STATUS_SUSPENDED, self::STATUS_TERMINATED], true) && blank($comment)) {
                throw new InvalidArgumentException('A comment is required when rejecting, suspending, or terminating a vendor.');
            }

            $oldStatus = $vendor->status;
            $vendor->status = $newStatus;

            // Set relevant timestamps
            match ($newStatus) {
                self::STATUS_SUBMITTED => $vendor->submitted_at = now(),
                self::STATUS_APPROVED => $vendor->approved_at = now(),
                self::STATUS_ACTIVE => $vendor->activated_at = now(),
                self::STATUS_SUSPENDED => $vendor->suspended_at = now(),
                self::STATUS_TERMINATED => $vendor->terminated_at = now(),
                default => null,
            };

            if ($newStatus === self::STATUS_APPROVED) {
                $vendor->approved_by = $user->id;
            }

            $blocksAccess = in_array($newStatus, self::ACCESS_BLOCKED_STATUSES, true);
            $previouslyBlockedAccess = in_array($oldStatus, self::ACCESS_BLOCKED_STATUSES, true);

            if ($blocksAccess && $vendor->user) {
                $vendor->user->is_active = false;
                $vendor->user->setRememberToken(Str::random(60));
                $vendor->user->save();

                if (config('session.driver') === 'database') {
                    DB::connection(config('session.connection'))
                        ->table(config('session.table', 'sessions'))
                        ->where('user_id', $vendor->user->id)
                        ->delete();
                }
            }

            if ($previouslyBlockedAccess && ! $blocksAccess && $vendor->user) {
                $vendor->user->update(['is_active' => true]);
            }

            $vendor->save();

            // Log the transition
            $vendor->stateLogs()->create([
                'user_id' => $user->id,
                'actioned_by_user_id' => $user->id,
                'from_status' => $oldStatus,
                'to_status' => $newStatus,
                'comment' => $comment,
                'reason_code' => $reasonCode,
                // Keep language-neutral provenance separate from user-entered comment content.
                'metadata' => ['comment_source' => $automaticComment ? 'system' : 'user'],
            ]);

            AuditLog::log(
                AuditLog::EVENT_STATE_CHANGED,
                $vendor,
                ['status' => $oldStatus],
                ['status' => $newStatus, 'reason_code' => $reasonCode],
                $comment
            );

            $this->setRawAttributes($vendor->getAttributes(), true);

            return true;
        });
    }

    // Query Scopes

    public function scopeStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    public function scopeCompliant($query)
    {
        return $query->where('compliance_status', self::COMPLIANCE_COMPLIANT);
    }

    public function scopeNonCompliant($query)
    {
        return $query->whereIn('compliance_status', [
            self::COMPLIANCE_NON_COMPLIANT,
            self::COMPLIANCE_BLOCKED,
        ]);
    }

    // Helper Methods

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function blocksUserAccess(): bool
    {
        return in_array($this->status, self::ACCESS_BLOCKED_STATUSES, true);
    }

    public function isCompliant(): bool
    {
        return $this->compliance_status === self::COMPLIANCE_COMPLIANT;
    }

    public function canRequestPayment(): bool
    {
        $allowedStatuses = [self::STATUS_ACTIVE, self::STATUS_APPROVED];
        $allowedCompliance = [self::COMPLIANCE_COMPLIANT, self::COMPLIANCE_PENDING];

        return in_array($this->status, $allowedStatuses, true)
            && in_array($this->compliance_status, $allowedCompliance, true);
    }

    public function getStatusBadgeClass(): string
    {
        $classes = [
            self::STATUS_DRAFT => 'badge-draft',
            self::STATUS_SUBMITTED => 'badge-submitted',
            self::STATUS_UNDER_REVIEW => 'badge-review',
            self::STATUS_APPROVED => 'badge-approved',
            self::STATUS_ACTIVE => 'badge-active',
            self::STATUS_SUSPENDED => 'badge-suspended',
            self::STATUS_TERMINATED => 'badge-terminated',
            self::STATUS_REJECTED => 'badge-rejected',
        ];

        $status = (string) $this->getAttribute('status');

        return $classes[$status] ?? 'badge-draft';
    }
}
