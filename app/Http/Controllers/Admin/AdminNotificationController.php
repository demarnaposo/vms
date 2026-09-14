<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SendNotificationRequest;
use App\Models\User;
use App\Models\Vendor;
use App\Notifications\AdminBroadcastNotification;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class AdminNotificationController extends Controller
{
    /**
     * Show the send notification form.
     */
    public function index(): Response
    {
        $vendors = Vendor::select('id', 'company_name', 'user_id')
            ->with('user:id,name,email')
            ->whereIn('status', [
                Vendor::STATUS_ACTIVE,
                Vendor::STATUS_APPROVED,
                Vendor::STATUS_SUBMITTED,
                Vendor::STATUS_UNDER_REVIEW,
            ])
            ->orderBy('company_name')
            ->get();

        $staffUsers = User::whereHas('roles', function ($q) {
            $q->whereIn('name', ['ops_manager', 'finance_manager', 'super_admin']);
        })
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

        return Inertia::render('Admin/Notifications/Send', [
            'vendors' => $vendors,
            'staffUsers' => $staffUsers,
        ]);
    }

    /**
     * Send a notification to the target audience.
     */
    public function send(SendNotificationRequest $request)
    {
        $validated = $request->validated();
        $sender = $request->user();

        try {
            $notification = new AdminBroadcastNotification(
                title: $validated['title'],
                message: $validated['message'],
                severity: $validated['severity'],
                actionUrl: $validated['action_url'] ?? null,
                sentById: $sender->id,
            );

            $recipientCount = 0;

            if ($validated['target'] === 'all_vendors') {
                $vendorUsers = User::whereHas('roles', function ($q) {
                    $q->where('name', 'vendor');
                })
                    ->whereHas('vendor', function ($q) {
                        $q->whereIn('status', [
                            Vendor::STATUS_ACTIVE,
                            Vendor::STATUS_APPROVED,
                        ]);
                    })
                    ->get();

                foreach ($vendorUsers as $user) {
                    $user->notify(clone $notification);
                    $recipientCount++;
                }
            } else {
                $targetUser = User::findOrFail($validated['target_id']);
                $targetUser->notify($notification);
                $recipientCount = 1;
            }

            Log::info('Admin notification sent', [
                'sender_id' => $sender->id,
                'target' => $validated['target'],
                'recipient_count' => $recipientCount,
            ]);

            // Start Update 12 September 2026, by @WNP: Localize the notification count alert for the selected language.
            return back()->with('success', __('alerts.notification_sent', ['count' => $recipientCount]));
        } catch (\Throwable $e) {
            Log::error('Admin notification send failed', ['error' => $e->getMessage()]);

            return back()->withErrors(['send' => 'Failed to send notification. Please try again.']);
        }
    }
}
