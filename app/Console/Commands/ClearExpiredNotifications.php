<?php

namespace App\Console\Commands;

use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ClearExpiredNotifications extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'notifications:clear-expired';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clear expired notifications based on .env configuration';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $readDays = (int) config('app.notifications_expire_read_days', 30);
        $unreadDays = (int) config('app.notifications_expire_unread_days', 90);

        $this->info('Starting expired notifications cleanup...');

        $readThreshold = Carbon::now()->subDays($readDays);
        $readDeleted = DB::table('notifications')
            ->whereNotNull('read_at')
            ->where('created_at', '<', $readThreshold)
            ->delete();

        $this->info("Deleted {$readDeleted} read notifications older than {$readDays} days.");

        $unreadThreshold = Carbon::now()->subDays($unreadDays);
        $unreadDeleted = DB::table('notifications')
            ->whereNull('read_at')
            ->where('created_at', '<', $unreadThreshold)
            ->delete();

        $this->info("Deleted {$unreadDeleted} unread notifications older than {$unreadDays} days.");

        $this->info('Cleanup completed.');
    }
}
