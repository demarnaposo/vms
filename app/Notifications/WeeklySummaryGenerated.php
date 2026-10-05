<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class WeeklySummaryGenerated extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  array<string, mixed>  $summary
     */
    public function __construct(private readonly array $summary) {}

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
        $period = (string) ($this->summary['period'] ?? 'This week');
        $newVendors = (int) ($this->summary['vendors']['new_this_week'] ?? 0);
        $summary = $this->summary;
        if (! \App\Support\PaymentsModule::enabled()) {
            unset($summary['payments']);
        }
        $approvedPayments = (int) ($summary['payments']['approved'] ?? 0);

        return [
            'title' => 'Weekly Summary Available',
            'message' => isset($summary['payments'])
                ? "Week of {$period}: {$newVendors} new vendors, {$approvedPayments} payments approved."
                : "Week of {$period}: {$newVendors} new vendors.",
            'summary' => $summary,
            'severity' => 'info',
        ];
    }
}
