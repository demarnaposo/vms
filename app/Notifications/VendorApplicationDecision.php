<?php

namespace App\Notifications;

use App\Models\Vendor;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use InvalidArgumentException;

class VendorApplicationDecision extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly string $decision,
        private readonly string $companyName,
        private readonly ?string $reason = null,
    ) {
        if (! in_array($decision, [Vendor::STATUS_APPROVED, Vendor::STATUS_REJECTED], true)
            || ($decision === Vendor::STATUS_REJECTED && blank($reason))) {
            throw new InvalidArgumentException('A valid vendor decision and rejection reason are required.');
        }
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $key = 'mail.vendor_decision.'.$this->decision;
        $mail = (new MailMessage)
            ->subject(__($key.'.subject', ['company' => $this->companyName]))
            ->line(__($key.'.intro', ['company' => $this->companyName]));

        if ($this->decision === Vendor::STATUS_APPROVED) {
            return $mail
                ->line(__($key.'.next'))
                ->action(__($key.'.action'), route('vendor.dashboard'));
        }

        return $mail
            ->line(__($key.'.reason'))
            ->line($this->reason);
    }
}
