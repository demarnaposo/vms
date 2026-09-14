<?php

namespace App\Services;

use App\Models\PaymentRequest;
use App\Models\Vendor;
use App\Models\VendorDocument;
// Start Update 11 September 2026, by @WNP: Use centralized currency metadata and formatting in payment exports.
use App\Support\Currency;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ReportService
{
    /**
     * @return array<string, int|float>
     */
    public function dashboardStats(): array
    {
        $totalVendors = Vendor::count();
        $compliantVendors = Vendor::where('compliance_status', Vendor::COMPLIANCE_COMPLIANT)->count();

        return [
            'total_vendors' => $totalVendors,
            'active_vendors' => Vendor::where('status', Vendor::STATUS_ACTIVE)->count(),
            'compliance_rate' => round(($compliantVendors / max($totalVendors, 1)) * 100),
            'pending_payments' => PaymentRequest::whereIn('status', [
                PaymentRequest::STATUS_REQUESTED,
                PaymentRequest::STATUS_PENDING_OPS,
                PaymentRequest::STATUS_PENDING_FINANCE,
            ])->count(),
            'total_paid' => PaymentRequest::where('status', PaymentRequest::STATUS_PAID)->sum('amount'),
        ];
    }

    /**
     * @return array{payments: \Illuminate\Contracts\Pagination\LengthAwarePaginator, stats: array<string, int|float>, filters: array<string, mixed>}
     */
    public function paymentReportData(Request $request): array
    {
        $query = PaymentRequest::with('vendor:id,company_name');

        if ($request->filled('start_date')) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $pendingStatuses = [
            PaymentRequest::STATUS_REQUESTED,
            PaymentRequest::STATUS_PENDING_OPS,
            PaymentRequest::STATUS_PENDING_FINANCE,
        ];

        $statsQuery = PaymentRequest::query();
        if ($request->filled('start_date')) {
            $statsQuery->whereDate('created_at', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $statsQuery->whereDate('created_at', '<=', $request->end_date);
        }

        return [
            'payments' => $query->orderBy('created_at', 'desc')->paginate(20),
            'stats' => [
                'total_amount' => (clone $statsQuery)->sum('amount'),
                'pending_count' => (clone $statsQuery)->whereIn('status', $pendingStatuses)->count(),
                'pending_amount' => (clone $statsQuery)->whereIn('status', $pendingStatuses)->sum('amount'),
                'approved_count' => (clone $statsQuery)->where('status', PaymentRequest::STATUS_APPROVED)->count(),
                'approved_amount' => (clone $statsQuery)->where('status', PaymentRequest::STATUS_APPROVED)->sum('amount'),
                'paid_count' => (clone $statsQuery)->where('status', PaymentRequest::STATUS_PAID)->count(),
                'paid_amount' => (clone $statsQuery)->where('status', PaymentRequest::STATUS_PAID)->sum('amount'),
                'rejected_count' => (clone $statsQuery)->where('status', PaymentRequest::STATUS_REJECTED)->count(),
            ],
            'filters' => [
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'status' => $request->status ?? 'all',
            ],
        ];
    }

    public function exportCsvByType(Request $request, string $type): Response
    {
        return match (strtolower($type)) {
            'payment' => $this->exportPaymentCsv($request),
            'vendor_summary', 'vendor' => $this->exportVendorCsv($request),
            'performance' => $this->exportPerformanceCsv($request),
            'compliance', 'compliance_report' => $this->exportComplianceCsv($request),
            'document_expiry' => $this->exportDocumentExpiryCsv($request),
            default => abort(404, 'Report type not found'),
        };
    }

    public function exportPaymentCsv(Request $request): Response
    {
        $query = PaymentRequest::with('vendor:id,company_name');

        if ($request->filled('start_date')) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $payments = $query->orderBy('created_at', 'desc')->get();

        // Start Update 11 September 2026, by @WNP: Label and format exported payment amounts using the configured currency.
        $headers = ['ID', 'Vendor', 'Invoice Number', 'Amount ('.Currency::code().')', 'Status', 'Requested Date', 'Notes'];
        $rows = [];

        foreach ($payments as $payment) {
            $rows[] = [
                $payment->id,
                $payment->vendor->company_name ?? 'N/A',
                $payment->invoice_number ?? 'N/A',
                Currency::format($payment->amount),
                ucfirst(str_replace('_', ' ', $payment->status)),
                $payment->created_at->format('Y-m-d H:i'),
                $payment->rejection_reason ?? '',
            ];
        }

        return $this->csvResponse('payment_report', $headers, $rows);
    }

    public function exportVendorCsv(Request $request): Response
    {
        $query = Vendor::query();

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }
        if ($request->filled('compliance') && $request->compliance !== 'all') {
            $query->where('compliance_status', $request->compliance);
        }

        $vendors = $query->orderBy('created_at', 'desc')->get();

        $headers = ['ID', 'Company Name', 'Contact Person', 'Email', 'Status', 'Compliance Status', 'Compliance Score', 'Performance Score', 'Registered On'];
        $rows = [];

        foreach ($vendors as $vendor) {
            $rows[] = [
                $vendor->id,
                $vendor->company_name,
                $vendor->contact_person ?? 'N/A',
                $vendor->contact_email ?? 'N/A',
                ucfirst(str_replace('_', ' ', $vendor->status)),
                ucfirst(str_replace('_', ' ', $vendor->compliance_status ?? Vendor::COMPLIANCE_PENDING)),
                $vendor->compliance_score ?? 0,
                $vendor->performance_score ?? 0,
                $vendor->created_at->format('Y-m-d'),
            ];
        }

        return $this->csvResponse('vendor_summary', $headers, $rows);
    }

    public function exportPerformanceCsv(Request $request): Response
    {
        $query = Vendor::where('status', Vendor::STATUS_ACTIVE);

        if ($request->filled('min_score')) {
            $query->where('performance_score', '>=', $request->min_score);
        }

        $vendors = $query->orderBy('performance_score', 'desc')->get();

        $headers = ['Rank', 'Company Name', 'Performance Score', 'Compliance Score', 'Status'];
        $rows = [];

        $rank = 1;
        foreach ($vendors as $vendor) {
            $rows[] = [
                $rank++,
                $vendor->company_name,
                $vendor->performance_score ?? 0,
                $vendor->compliance_score ?? 0,
                ucfirst($vendor->status),
            ];
        }

        return $this->csvResponse('performance_report', $headers, $rows);
    }

    public function exportComplianceCsv(Request $request): Response
    {
        $query = Vendor::query();

        if ($request->filled('compliance_status') && $request->compliance_status !== 'all') {
            $query->where('compliance_status', $request->compliance_status);
        }

        $vendors = $query->orderBy('compliance_score', 'asc')->get();

        $headers = ['ID', 'Company Name', 'Compliance Status', 'Compliance Score', 'Vendor Status', 'Registered On'];
        $rows = [];

        foreach ($vendors as $vendor) {
            $rows[] = [
                $vendor->id,
                $vendor->company_name,
                ucfirst(str_replace('_', ' ', $vendor->compliance_status ?? Vendor::COMPLIANCE_PENDING)),
                $vendor->compliance_score ?? 0,
                ucfirst($vendor->status),
                $vendor->created_at->format('Y-m-d'),
            ];
        }

        return $this->csvResponse('compliance_report', $headers, $rows);
    }

    public function exportDocumentExpiryCsv(Request $request): Response
    {
        $query = VendorDocument::with(['vendor', 'documentType'])
            ->where('is_current', true)
            ->whereNotNull('expiry_date')
            ->whereHas('documentType', fn ($q) => $q->where('has_expiry', true));

        $startDate = $request->filled('start_date') ? $request->start_date : now()->format('Y-m-d');
        $endDate = $request->filled('end_date') ? $request->end_date : now()->addDays(30)->format('Y-m-d');

        $query->whereBetween('expiry_date', [$startDate, $endDate]);

        $documents = $query->orderBy('expiry_date', 'asc')->get();

        $headers = ['Vendor', 'Document Type', 'File Name', 'Expiry Date', 'Days Until Expiry'];
        $rows = [];

        foreach ($documents as $doc) {
            $daysUntil = $doc->expiry_date ? now()->diffInDays($doc->expiry_date, false) : null;
            $rows[] = [
                optional($doc->vendor)->company_name ?? 'N/A',
                optional($doc->documentType)->display_name ?? 'N/A',
                $doc->file_name,
                $doc->expiry_date ? $doc->expiry_date->format('Y-m-d') : 'N/A',
                $daysUntil !== null ? ($daysUntil < 0 ? 'Expired' : $daysUntil.' days') : 'Unknown',
            ];
        }

        return $this->csvResponse('document_expiry', $headers, $rows);
    }

    /**
     * @return array{vendors: \Illuminate\Contracts\Pagination\LengthAwarePaginator, stats: array<string, int|float>, filters: array<string, mixed>}
     */
    public function vendorSummaryReportData(Request $request): array
    {
        $query = Vendor::query();

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }
        if ($request->filled('compliance') && $request->compliance !== 'all') {
            $query->where('compliance_status', $request->compliance);
        }

        $vendors = $query->select([
            'id',
            'company_name',
            'contact_person',
            'contact_email',
            'status',
            'compliance_status',
            'compliance_score',
            'performance_score',
            'created_at',
        ])->orderBy('created_at', 'desc')->paginate(20);

        return [
            'vendors' => $vendors,
            'stats' => [
                'total' => Vendor::count(),
                'active' => Vendor::where('status', Vendor::STATUS_ACTIVE)->count(),
                'pending' => Vendor::whereIn('status', [Vendor::STATUS_SUBMITTED, Vendor::STATUS_UNDER_REVIEW])->count(),
                'suspended' => Vendor::where('status', Vendor::STATUS_SUSPENDED)->count(),
                'compliant' => Vendor::where('compliance_status', Vendor::COMPLIANCE_COMPLIANT)->count(),
                'non_compliant' => Vendor::where('compliance_status', Vendor::COMPLIANCE_NON_COMPLIANT)->count(),
                'avg_compliance_score' => round(Vendor::avg('compliance_score') ?? 0),
                'avg_performance_score' => round(Vendor::avg('performance_score') ?? 0),
            ],
            'filters' => [
                'status' => $request->status ?? 'all',
                'compliance' => $request->compliance ?? 'all',
            ],
        ];
    }

    /**
     * @return array{vendors: \Illuminate\Contracts\Pagination\LengthAwarePaginator, stats: array<string, int|float|string>, filters: array<string, mixed>}
     */
    public function performanceReportData(Request $request): array
    {
        $query = Vendor::where('status', Vendor::STATUS_ACTIVE);

        if ($request->filled('min_score')) {
            $query->where('performance_score', '>=', $request->min_score);
        }

        return [
            'vendors' => $query->select([
                'id',
                'company_name',
                'performance_score',
                'compliance_score',
                'status',
                'created_at',
            ])->orderBy('performance_score', 'desc')->paginate(20),
            'stats' => [
                'total_active' => Vendor::where('status', Vendor::STATUS_ACTIVE)->count(),
                'avg_performance' => round(Vendor::where('status', Vendor::STATUS_ACTIVE)->avg('performance_score') ?? 0),
                'high_performers' => Vendor::where('status', Vendor::STATUS_ACTIVE)->where('performance_score', '>=', 80)->count(),
                'medium_performers' => Vendor::where('status', Vendor::STATUS_ACTIVE)->whereBetween('performance_score', [50, 79])->count(),
                'low_performers' => Vendor::where('status', Vendor::STATUS_ACTIVE)->where('performance_score', '<', 50)->count(),
                'top_scorer' => optional(Vendor::where('status', Vendor::STATUS_ACTIVE)->orderBy('performance_score', 'desc')->first())->company_name ?? 'N/A',
            ],
            'filters' => [
                'min_score' => $request->min_score ?? '',
            ],
        ];
    }

    /**
     * @return array{vendors: \Illuminate\Contracts\Pagination\LengthAwarePaginator, stats: array<string, int|float>, filters: array<string, mixed>}
     */
    public function complianceReportData(Request $request): array
    {
        $query = Vendor::query();

        if ($request->filled('compliance_status') && $request->compliance_status !== 'all') {
            $query->where('compliance_status', $request->compliance_status);
        }

        return [
            'vendors' => $query->select([
                'id',
                'company_name',
                'compliance_status',
                'compliance_score',
                'status',
                'created_at',
            ])->orderBy('compliance_score', 'asc')->paginate(20),
            'stats' => [
                'total_vendors' => Vendor::count(),
                'compliant' => Vendor::where('compliance_status', Vendor::COMPLIANCE_COMPLIANT)->count(),
                'non_compliant' => Vendor::where('compliance_status', Vendor::COMPLIANCE_NON_COMPLIANT)->count(),
                'pending' => Vendor::where(function ($q) {
                    $q->where('compliance_status', Vendor::COMPLIANCE_PENDING)
                        ->orWhereNull('compliance_status');
                })->count(),
                'avg_score' => round(Vendor::avg('compliance_score') ?? 0),
            ],
            'filters' => [
                'compliance_status' => $request->compliance_status ?? 'all',
            ],
        ];
    }

    /**
     * @return array{documents: \Illuminate\Contracts\Pagination\LengthAwarePaginator, stats: array<string, int>, filters: array<string, string>}
     */
    public function documentExpiryReportData(Request $request): array
    {
        $query = VendorDocument::with(['vendor', 'documentType'])
            ->where('is_current', true)
            ->whereNotNull('expiry_date')
            ->whereHas('documentType', fn ($q) => $q->where('has_expiry', true));

        $startDate = $request->filled('start_date') ? $request->start_date : now()->format('Y-m-d');
        $endDate = $request->filled('end_date') ? $request->end_date : now()->addDays(30)->format('Y-m-d');

        $query->whereBetween('expiry_date', [$startDate, $endDate]);

        $documents = $query->orderBy('expiry_date', 'asc')->paginate(20);

        $documents->getCollection()->transform(function ($doc) {
            $doc->setAttribute('expiry_formatted', $doc->expiry_date ? $doc->expiry_date->format('Y-m-d') : 'N/A');
            $doc->setAttribute('days_until_expiry', $doc->expiry_date ? now()->diffInDays($doc->expiry_date, false) : null);

            return $doc;
        });

        return [
            'documents' => $documents,
            'stats' => [
                'expiring_7_days' => VendorDocument::whereNotNull('expiry_date')
                    ->where('is_current', true)
                    ->whereHas('documentType', fn ($q) => $q->where('has_expiry', true))
                    ->whereBetween('expiry_date', [now(), now()->addDays(7)])->count(),
                'expiring_30_days' => VendorDocument::whereNotNull('expiry_date')
                    ->where('is_current', true)
                    ->whereHas('documentType', fn ($q) => $q->where('has_expiry', true))
                    ->whereBetween('expiry_date', [now(), now()->addDays(30)])->count(),
                'expired' => VendorDocument::whereNotNull('expiry_date')
                    ->where('is_current', true)
                    ->whereHas('documentType', fn ($q) => $q->where('has_expiry', true))
                    ->where('expiry_date', '<', now())->count(),
                'total_with_expiry' => VendorDocument::whereNotNull('expiry_date')
                    ->where('is_current', true)
                    ->whereHas('documentType', fn ($q) => $q->where('has_expiry', true))
                    ->count(),
            ],
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ];
    }

    /**
     * @param  array<int, string>  $headers
     * @param  array<int, array<int, mixed>>  $rows
     */
    private function csvResponse(string $prefix, array $headers, array $rows): Response
    {
        $filename = $prefix.'_'.now()->format('Y-m-d_His').'.csv';
        $handle = fopen('php://temp', 'r+');

        fputcsv($handle, $headers);
        foreach ($rows as $row) {
            fputcsv($handle, $row);
        }

        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }
}
