<?php

namespace App\Notifications;

// Use the centralized currency formatter in payment alerts.
use App\Support\Currency;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class PaymentDelayAlert extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly int $delayedCount,
        private readonly float $totalAmount,
        private readonly int $delayDays,
        private readonly bool $vendorFacing = false
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
        // Format delayed totals as Indonesian Rupiah.
        $formattedAmount = Currency::format($this->totalAmount);

        $message = $this->vendorFacing
            ? "{$this->delayedCount} approved payment(s) totaling {$formattedAmount} are delayed beyond {$this->delayDays} days."
            : "{$this->delayedCount} approved payment(s) totaling {$formattedAmount} are delayed beyond {$this->delayDays} days and need action.";

        return [
            'title' => 'Payment Delay Alert',
            'message' => $message,
            'type' => 'payment',
            'delayed_count' => $this->delayedCount,
            'total_amount' => $this->totalAmount,
            'delay_days' => $this->delayDays,
            'severity' => $this->delayedCount >= 10 ? 'critical' : 'high',
        ];
    }
}
