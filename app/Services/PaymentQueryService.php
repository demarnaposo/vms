<?php

namespace App\Services;

use App\Models\PaymentRequest;
use Illuminate\Http\Request;

class PaymentQueryService
{
    /**
     * @return array<string, mixed>
     */
    public function adminIndexData(Request $request): array
    {
        $filters = $request->validate([
            'status' => ['nullable', \Illuminate\Validation\Rule::in(['all', PaymentRequest::STATUS_REQUESTED, PaymentRequest::STATUS_PENDING_OPS, PaymentRequest::STATUS_PENDING_FINANCE, PaymentRequest::STATUS_APPROVED, PaymentRequest::STATUS_PAID, PaymentRequest::STATUS_REJECTED, PaymentRequest::STATUS_CANCELLED])],
        ]);
        $status = $filters['status'] ?? 'all';

        $query = PaymentRequest::with(['vendor:id,company_name', 'requester:id,name'])
            ->orderBy('created_at', 'desc');

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        $payments = $query->paginate(15)->appends($filters);

        $stats = [
            'pending' => PaymentRequest::whereIn('status', [
                PaymentRequest::STATUS_REQUESTED,
                PaymentRequest::STATUS_PENDING_OPS,
                PaymentRequest::STATUS_PENDING_FINANCE,
            ])->count(),
            'approved' => PaymentRequest::where('status', PaymentRequest::STATUS_APPROVED)->count(),
            'paid' => (float) PaymentRequest::where('status', PaymentRequest::STATUS_PAID)->sum('amount'),
            'total' => PaymentRequest::count(),
        ];

        return [
            'payments' => $payments,
            'stats' => $stats,
            'currentStatus' => $status,
        ];
    }
}
