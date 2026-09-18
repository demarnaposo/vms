<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Models\Vendor;
use App\Models\VendorApplication;
use App\Models\VendorBond;
use App\Services\ProposalGenerationService;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class VerifyVendorFlowFeatures extends Command
{
    protected $signature = 'verify:features';

    protected $description = 'Verify implemented vendor flow features';

    public function handle()
    {
        $this->info('starting feature verification...');

        // 1. Create dummy user and vendor
        $user = User::create([
            'name' => 'Test Vendor User',
            'email' => 'vendor_test_'.Str::random(5).'@example.com',
            'password' => bcrypt('password'),
            'is_active' => true,
        ]);

        $vendor = Vendor::create([
            'user_id' => $user->id,
            'company_name' => 'Demo Company LLC',
            // Start Update 16 September 2026, by @WNP: Use Indonesian company identifiers in the verification fixture.
            'registration_number' => '1234567890123',
            'tax_id' => '0123456789012345',
            // Start Update 16 September 2026, by @WNP: Include the required deed number in the verification fixture.
            'deed_number' => 'DEED-000001',
            'contact_person' => 'John Doe',
            'contact_email' => 'contact@democompany.com',
            'contact_phone' => '1234567890',
            'status' => 'draft',
            // Start Update 16 September 2026, by @WNP: Use an Indonesian-compatible numeric account fixture.
            'bank_account_number' => '1234567890',
            // Start Update 11 September 2026, by @WNP: Use an Indonesian bank code in the verification fixture.
            'bank_ifsc' => '008',
        ]);

        // 2. Test VendorBond
        $bond = VendorBond::create([
            'vendor_id' => $vendor->id,
            'total_amount' => 5000.00,
            'current_balance' => 5000.00,
            'status' => 'PENDING',
        ]);

        $this->info("✔ VendorBond created successfully. ID: {$bond->id}");

        // 3. Test Proposal Generation
        $app = VendorApplication::create([
            'user_id' => $user->id,
            'current_step' => 3,
            'data' => tap(new \stdClass, fn ($d) => $d->company_name = 'Demo Company LLC'),
        ]);

        $service = new ProposalGenerationService;
        $proposal = $service->generateProposal($app, 5000.00, 10.5);

        $this->info("✔ Proposal generated successfully. File: {$proposal->document_path}");

        // 4. Test state change and user deactivation
        $admin = User::first() ?? $user; // Use any user as admin

        $vendor->status = 'active'; // force active
        $vendor->save();

        $vendor->transitionTo('terminated', $admin, 'Testing termination functionality', 'POLICY_BREACH');

        $user->refresh();
        if ($user->is_active === false) {
            $this->info('✔ Vendor Terminated. User cleanly deactivated.');
        } else {
            $this->error('✖ User WAS NOT deactivated!');
        }

        $this->info('Verification Complete.');
    }
}
