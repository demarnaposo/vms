<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use InvalidArgumentException;

class Vendor extends Model
{
    use Auditable, HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'company_name',
        'registration_number',
        'tax_id',
        'pan_number',
        'business_type',
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
        'bank_ifsc',
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
        'pan_number',
        'bank_account_number',
        'bank_ifsc',
        'internal_notes',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'approved_at' => 'datetime',
        'activated_at' => 'datetime',
        'suspended_at' => 'datetime',
        'terminated_at' => 'datetime',
        'tax_id' => 'encrypted',
        'pan_number' => 'encrypted',
        'bank_account_number' => 'encrypted',
        'bank_ifsc' => 'encrypted',
    ];

    // Status constants
    const STATUS_DRAFT = 'draft';

    const STATUS_SUBMITTED = 'submitted';

    const STATUS_UNDER_REVIEW = 'under_review';

    const STATUS_APPROVED = 'approved';

    const STATUS_ACTIVE = 'active';

    const STATUS_SUSPENDED = 'suspended';

    const STATUS_TERMINATED = 'terminated';

    const STATUS_REJECTED = 'rejected';

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
    // Start Update 13 September 2026, by @WNP: Tag new timeline comments as system or user-authored without changing their stored text.
    public function transitionTo(string $newStatus, User $user, ?string $comment = null, ?string $reasonCode = null, bool $automaticComment = false): bool
    {
        if (! $this->canTransitionTo($newStatus)) {
            throw new InvalidArgumentException("Invalid vendor status transition: {$this->status} -> {$newStatus}");
        }

        if (in_array($newStatus, [self::STATUS_REJECTED, self::STATUS_SUSPENDED, self::STATUS_TERMINATED], true) && blank($comment)) {
            throw new InvalidArgumentException('A comment is required when rejecting, suspending, or terminating a vendor.');
        }

        // Start Update 13 September 2026, by @WNP: Carry comment provenance into the immutable state log.
        return \Illuminate\Support\Facades\DB::transaction(function () use ($newStatus, $user, $comment, $reasonCode, $automaticComment) {
            $oldStatus = $this->status;
            $this->status = $newStatus;

            // Set relevant timestamps
            match ($newStatus) {
                self::STATUS_SUBMITTED => $this->submitted_at = now(),
                self::STATUS_APPROVED => $this->approved_at = now(),
                self::STATUS_ACTIVE => $this->activated_at = now(),
                self::STATUS_SUSPENDED => $this->suspended_at = now(),
                self::STATUS_TERMINATED => $this->terminated_at = now(),
                default => null,
            };

            if ($newStatus === self::STATUS_APPROVED) {
                $this->approved_by = $user->id;
            }

            // Action: Revoke user access if terminated or rejected/dismissed
            if (in_array($newStatus, [self::STATUS_TERMINATED, self::STATUS_REJECTED], true) && $this->user) {
                $this->user->update(['is_active' => false]);
            }

            // Action: Reactivate user access if bouncing back from a terminated/rejected state
            if (in_array($oldStatus, [self::STATUS_TERMINATED, self::STATUS_REJECTED], true) &&
                ! in_array($newStatus, [self::STATUS_TERMINATED, self::STATUS_REJECTED], true) &&
                $this->user) {
                $this->user->update(['is_active' => true]);
            }

            $this->save();

            // Log the transition
            $this->stateLogs()->create([
                'user_id' => $user->id,
                'actioned_by_user_id' => $user->id,
                'from_status' => $oldStatus,
                'to_status' => $newStatus,
                'comment' => $comment,
                'reason_code' => $reasonCode,
                // Start Update 13 September 2026, by @WNP: Keep language-neutral provenance separate from user-entered comment content.
                'metadata' => ['comment_source' => $automaticComment ? 'system' : 'user'],
            ]);

            AuditLog::log(
                AuditLog::EVENT_STATE_CHANGED,
                $this,
                ['status' => $oldStatus],
                ['status' => $newStatus, 'reason_code' => $reasonCode],
                $comment
            );

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
