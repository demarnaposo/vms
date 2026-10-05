<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class PendingPaymentApprovalsAlert extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly string $stage,
        private readonly int $count,
        private readonly int $thresholdHours
    ) {}

    // [VMS_PAYMENTS_DISABLED] Also suppress already queued payment alerts when config/features.php disables the module.
    public function shouldSend(object $notifiable, string $channel): bool
    {
        return \App\Support\PaymentsModule::enabled();
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return \App\Support\PaymentsModule::enabled() ? ['database'] : [];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $stageLabel = $this->stage === 'ops' ? 'Ops Validation' : 'Finance Approval';
        $severity = $this->count >= 10 ? 'high' : 'medium';

        return [
            'title' => 'Pending Payment Approvals',
            'message' => "{$this->count} payment request(s) are pending {$stageLabel} for more than {$this->thresholdHours} hours.",
            'type' => 'payment',
            'stage' => $this->stage,
            'count' => $this->count,
            'threshold_hours' => $this->thresholdHours,
            'severity' => $severity,
        ];
    }
}
