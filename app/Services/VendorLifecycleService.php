<?php

namespace App\Services;

use App\Models\ComplianceFlag;
use App\Models\DocumentType;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class VendorLifecycleService
{
    private const MIN_ACTIVATION_COMPLIANCE_SCORE = 80;

    /**
     * Move a submitted/reviewed/approved vendor to active through valid transitions.
     */
    public function approveAndActivate(Vendor $vendor, User $actor, ?string $comment = null): void
    {
        DB::transaction(function () use ($vendor, $actor, $comment) {
            $note = $comment ?: 'Vendor approved and activated';

            if ($vendor->status === Vendor::STATUS_SUBMITTED) {
                // Start Update 13 September 2026, by @WNP: Record whether the approval timeline note is automatic or user-entered.
                $vendor->transitionTo(Vendor::STATUS_UNDER_REVIEW, $actor, $note, automaticComment: blank($comment));
                $vendor->refresh();
            }

            if ($vendor->status === Vendor::STATUS_UNDER_REVIEW) {
                // Start Update 13 September 2026, by @WNP: Preserve the approval note's origin across transitions.
                $vendor->transitionTo(Vendor::STATUS_APPROVED, $actor, $note, automaticComment: blank($comment));
                $vendor->refresh();
            }

            if ($vendor->status === Vendor::STATUS_APPROVED) {
                $this->assertReadyForActivation($vendor);
                // Start Update 13 September 2026, by @WNP: Preserve the activation note's origin across transitions.
                $vendor->transitionTo(Vendor::STATUS_ACTIVE, $actor, $note, automaticComment: blank($comment));

                return;
            }

            // Start Update 12 September 2026, by @WNP: Localize the blocked approval alert while preserving the vendor status.
            throw new InvalidArgumentException(__('alerts.vendor_transition', ['action' => __('alerts.actions.approved'), 'status' => $vendor->status]));
        });
    }

    /**
     * Approve a vendor without activating (transitions to approved state only).
     * Activation is a separate step that requires compliance/doc readiness.
     */
    public function approve(Vendor $vendor, User $actor, ?string $comment = null): void
    {
        DB::transaction(function () use ($vendor, $actor, $comment) {
            $note = $comment ?: 'Vendor approved';

            if ($vendor->status === Vendor::STATUS_SUBMITTED) {
                // Start Update 13 September 2026, by @WNP: Tag the initial approval note by its actual source.
                $vendor->transitionTo(Vendor::STATUS_UNDER_REVIEW, $actor, $note, automaticComment: blank($comment));
                $vendor->refresh();
            }

            if ($vendor->status === Vendor::STATUS_UNDER_REVIEW) {
                // Start Update 13 September 2026, by @WNP: Tag the final approval note by its actual source.
                $vendor->transitionTo(Vendor::STATUS_APPROVED, $actor, $note, automaticComment: blank($comment));

                return;
            }

            // Start Update 12 September 2026, by @WNP: Localize the blocked approval alert while preserving the vendor status.
            throw new InvalidArgumentException(__('alerts.vendor_transition', ['action' => __('alerts.actions.approved'), 'status' => $vendor->status]));
        });
    }

    /**
     * Reject a vendor with mandatory reason.
     */
    public function reject(Vendor $vendor, User $actor, string $reason): void
    {
        DB::transaction(function () use ($vendor, $actor, $reason) {
            if ($vendor->status === Vendor::STATUS_SUBMITTED) {
                // Start Update 13 September 2026, by @WNP: Mark the fixed pre-rejection transition comment as automatic.
                $vendor->transitionTo(Vendor::STATUS_UNDER_REVIEW, $actor, 'Vendor moved to review before rejection', automaticComment: true);
                $vendor->refresh();
            }

            if ($vendor->status !== Vendor::STATUS_UNDER_REVIEW) {
                // Start Update 12 September 2026, by @WNP: Localize the blocked rejection alert while preserving the vendor status.
                throw new InvalidArgumentException(__('alerts.vendor_transition', ['action' => __('alerts.actions.rejected'), 'status' => $vendor->status]));
            }

            $vendor->transitionTo(Vendor::STATUS_REJECTED, $actor, $reason);
        });
    }

    /**
     * Activate a vendor from approved or suspended state.
     *
     * For approved vendors (initial activation), only mandatory document
     * verification is required — compliance evaluation hasn't run yet.
     * For suspended vendors (reactivation), full compliance checks apply.
     */
    public function activate(Vendor $vendor, User $actor, ?string $comment = null): void
    {
        // Start Update 16 September 2026, by @WNP: Serialize activation requests so concurrent submissions cannot transition twice.
        DB::transaction(function () use ($vendor, $actor, $comment): void {
            $lockedVendor = Vendor::query()->lockForUpdate()->findOrFail($vendor->getKey());

            if (! in_array($lockedVendor->status, [Vendor::STATUS_APPROVED, Vendor::STATUS_SUSPENDED], true)) {
                // Start Update 12 September 2026, by @WNP: Localize the blocked activation alert while preserving the vendor status.
                throw new InvalidArgumentException(__('alerts.vendor_transition', ['action' => __('alerts.actions.activated'), 'status' => $lockedVendor->status]));
            }

            $this->assertReadyForActivation($lockedVendor);

            // Start Update 13 September 2026, by @WNP: Tag the activation note without altering the comment itself.
            $lockedVendor->transitionTo(Vendor::STATUS_ACTIVE, $actor, $comment ?: 'Vendor activated', automaticComment: blank($comment));
        });
    }

    /**
     * Suspend an active vendor with mandatory reason.
     */
    public function suspend(Vendor $vendor, User $actor, string $reason): void
    {
        if ($vendor->status !== Vendor::STATUS_ACTIVE) {
            // Start Update 12 September 2026, by @WNP: Localize the blocked suspension alert while preserving the vendor status.
            throw new InvalidArgumentException(__('alerts.vendor_transition', ['action' => __('alerts.actions.suspended'), 'status' => $vendor->status]));
        }

        $vendor->transitionTo(Vendor::STATUS_SUSPENDED, $actor, $reason);
    }

    /**
     * Terminate a vendor from active or suspended state with mandatory reason.
     */
    public function terminate(Vendor $vendor, User $actor, string $reason): void
    {
        if (! in_array($vendor->status, [Vendor::STATUS_ACTIVE, Vendor::STATUS_SUSPENDED], true)) {
            // Start Update 12 September 2026, by @WNP: Localize the blocked termination alert while preserving the vendor status.
            throw new InvalidArgumentException(__('alerts.vendor_transition', ['action' => __('alerts.actions.terminated'), 'status' => $vendor->status]));
        }

        if (blank($reason)) {
            // Start Update 12 September 2026, by @WNP: Localize the missing termination reason alert.
            throw new InvalidArgumentException(__('alerts.termination_reason_required'));
        }

        $vendor->transitionTo(Vendor::STATUS_TERMINATED, $actor, $reason);
    }

    /**
     * Reactivate a terminated vendor back into review state.
     */
    public function reactivate(Vendor $vendor, User $actor, string $reason): void
    {
        if ($vendor->status !== Vendor::STATUS_TERMINATED) {
            // Start Update 12 September 2026, by @WNP: Localize the blocked reactivation alert while preserving the vendor status.
            throw new InvalidArgumentException(__('alerts.vendor_transition', ['action' => __('alerts.actions.reactivated'), 'status' => $vendor->status]));
        }

        if (blank($reason)) {
            // Start Update 12 September 2026, by @WNP: Localize the missing reactivation reason alert.
            throw new InvalidArgumentException(__('alerts.reactivation_reason_required'));
        }

        $vendor->transitionTo(Vendor::STATUS_UNDER_REVIEW, $actor, $reason, 'APPEAL_APPROVED');
    }

    /**
     * Verify that all mandatory documents are uploaded, verified, and not expired.
     */
    private function assertDocumentsReady(Vendor $vendor): void
    {
        $mandatoryTypeIds = DocumentType::where('is_mandatory', true)->where('is_active', true)->pluck('id');

        if ($mandatoryTypeIds->isNotEmpty()) {
            $verifiedCurrentTypeIds = $vendor->documents()
                ->where('is_current', true)
                ->where('verification_status', 'verified')
                ->where(function ($query) {
                    $query->whereDate('expiry_date', '>=', now()->toDateString())
                        ->orWhere(function ($query) {
                            $query->whereNull('expiry_date')
                                ->whereHas('documentType', fn ($typeQuery) => $typeQuery->where('has_expiry', false));
                        });
                })
                ->pluck('document_type_id');

            $missingTypeIds = $mandatoryTypeIds->diff($verifiedCurrentTypeIds);

            if ($missingTypeIds->isNotEmpty()) {
                // Start Update 12 September 2026, by @WNP: Localize the document-readiness alert.
                throw new InvalidArgumentException(__('alerts.documents_required_for_activation'));
            }
        }
    }

    /**
     * Enforce full readiness checks before reactivation (from suspended state).
     * Includes document, compliance, and flag checks.
     */
    private function assertReadyForActivation(Vendor $vendor): void
    {
        $this->assertDocumentsReady($vendor);

        if ($vendor->compliance_status !== Vendor::COMPLIANCE_COMPLIANT || (int) $vendor->compliance_score < self::MIN_ACTIVATION_COMPLIANCE_SCORE) {
            // Start Update 12 September 2026, by @WNP: Localize the compliance-readiness alert.
            throw new InvalidArgumentException(__('alerts.compliance_required_for_activation'));
        }

        $openFlagsCount = ComplianceFlag::where('vendor_id', $vendor->id)
            ->where('status', 'open')
            ->where(function ($query) {
                $query->whereNull('compliance_rule_id')
                    ->orWhereHas('complianceRule', fn ($ruleQuery) => $ruleQuery->where('is_active', true));
            })
            ->count();

        if ($openFlagsCount > 0) {
            // Start Update 12 September 2026, by @WNP: Localize the unresolved-flags alert.
            throw new InvalidArgumentException(__('alerts.flags_block_activation'));
        }
    }
}
