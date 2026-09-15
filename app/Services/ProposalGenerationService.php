<?php

namespace App\Services;

use App\Models\VendorApplication;
use App\Models\VendorProposal;
// Start Update 11 September 2026, by @WNP: Use the centralized currency formatter for generated proposals.
use App\Support\Currency;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProposalGenerationService
{
    /**
     * Generate a PDF proposal for a given vendor application.
     */
    public function generateProposal(VendorApplication $application, float $bondAmountRequired, float $commissionRate): VendorProposal
    {
        // Gather data for the PDF template
        $data = [
            'application' => $application,
            'vendor_name' => $application->data['company_name'] ?? 'Vendor',
            'date' => Carbon::now()->format('F j, Y'),
            // Start Update 11 September 2026, by @WNP: Provide a fully formatted IDR bond amount to the PDF template.
            'bond_amount' => Currency::format($bondAmountRequired),
            'commission_rate' => $commissionRate,
            'platform_name' => config('app.name', 'VMS'),
        ];

        // Ensure directory exists
        $directory = 'proposals/'.$application->user_id;
        if (! Storage::disk('local')->exists($directory)) {
            Storage::disk('local')->makeDirectory($directory);
        }

        // Generate PDF
        // We assume a 'pdfs.proposal_template' blade file will be created by the front-end team
        $pdf = Pdf::loadView('pdfs.proposal_template', $data);

        $filename = 'Proposal_'.Str::random(10).'_'.time().'.pdf';
        $path = $directory.'/'.$filename;

        Storage::disk('local')->put($path, $pdf->output());

        // Create the record
        $proposal = VendorProposal::create([
            'vendor_application_id' => $application->id,
            'document_path' => $path,
            'proposal_hash' => hash('sha256', $pdf->output()),
            'status' => 'DRAFT',
        ]);

        return $proposal;
    }

    /**
     * Handle the digital signing process by the vendor.
     */
    public function digitallySignProposal(VendorProposal $proposal, string $ipAddress): bool
    {
        if ($proposal->status !== 'SENT') {
            throw new \Exception('Only SENT proposals can be signed.');
        }

        $proposal->update([
            'status' => 'DIGITALLY_SIGNED',
            'ip_address' => $ipAddress,
            'signed_at' => now(),
        ]);

        return true;
    }
}
