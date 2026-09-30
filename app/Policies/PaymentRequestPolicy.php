<?php

namespace App\Policies;

use App\Models\PaymentRequest;
use App\Models\User;

class PaymentRequestPolicy
{
    public function view(User $user, PaymentRequest $paymentRequest): bool
    {
        if ($user->isStaff()) {
            return $user->staffCan('payments.view');
        }

        return $user->isVendor() && $paymentRequest->vendor->user_id === $user->id;
    }

    public function validateOps(User $user, PaymentRequest $paymentRequest): bool
    {
        return $user->staffCan('payments.validate');
    }

    public function approveFinance(User $user, PaymentRequest $paymentRequest): bool
    {
        return $user->staffCan('payments.approve');
    }

    public function markPaid(User $user, PaymentRequest $paymentRequest): bool
    {
        return $user->staffCan('payments.disburse');
    }
}
