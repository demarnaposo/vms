<?php

namespace App\Notifications;

// Start Update 11 September 2026, by @WNP: Use the centralized currency formatter in payment alerts.
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

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        // Start Update 11 September 2026, by @WNP: Format delayed totals as Indonesian Rupiah.
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
