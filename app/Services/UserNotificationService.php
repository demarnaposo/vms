<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Pagination\LengthAwarePaginator;

class UserNotificationService
{
    /**
     * @return array{notifications: LengthAwarePaginator, unreadCount: int, totalCount: int}
     */
    public function indexData(User $user, string $filter = 'all'): array
    {
        $query = $user->notifications()->orderBy('created_at', 'desc');
        if ($filter === 'unread') {
            $query->whereNull('read_at');
        } elseif ($filter !== 'all') {
            $query->where('data->type', $filter);
        }

        $notifications = $query->paginate(20)->appends(['filter' => $filter]);

        return [
            'notifications' => $notifications,
            'unreadCount' => $this->unreadCount($user),
            'totalCount' => $user->notifications()->count(),
        ];
    }

    public function markAsRead(User $user, string $id): void
    {
        /** @var DatabaseNotification|null $notification */
        $notification = $user->notifications()
            ->where('id', $id)
            ->first();

        if ($notification && $notification->read_at === null) {
            $notification->markAsRead();
        }
    }

    public function markAllAsRead(User $user): void
    {
        $user->unreadNotifications()->update(['read_at' => now()]);
    }

    public function unreadCount(User $user): int
    {
        return $user->unreadNotifications()->count();
    }
}
