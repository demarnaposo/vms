<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Vendor;

class VendorPolicy
{
    public function view(User $user, Vendor $vendor): bool
    {
        if ($user->isStaff()) {
            return $user->staffCan('vendors.view');
        }

        return $user->isVendor() && $vendor->user_id === $user->id;
    }

    public function approve(User $user, Vendor $vendor): bool
    {
        return $user->staffCan('vendors.approve');
    }

    public function reject(User $user, Vendor $vendor): bool
    {
        return $user->staffCan('vendors.reject');
    }

    public function activate(User $user, Vendor $vendor): bool
    {
        return $user->staffCan('vendors.activate');
    }

    public function suspend(User $user, Vendor $vendor): bool
    {
        return $user->staffCan('vendors.suspend');
    }

    public function terminate(User $user, Vendor $vendor): bool
    {
        return $user->staffCan('vendors.terminate');
    }

    public function updateNotes(User $user, Vendor $vendor): bool
    {
        return $user->staffCan('vendors.notes');
    }
}
