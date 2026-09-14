<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class ReactivateVendor extends Command
{
    protected $signature = 'vendor:reactivate {email}';

    protected $description = 'Simulate Admin Reactivation for a terminated vendor';

    public function handle()
    {
        $email = $this->argument('email');
        $user = User::where('email', $email)->first();

        if (! $user) {
            $this->error("User with email {$email} not found.");

            return;
        }

        if (! $user->vendor) {
            $this->error('This user does not have a vendor profile attached.');

            return;
        }

        $admin = User::first(); // Dummy admin

        $this->info("Currently status: {$user->vendor->status}. is_active: ".($user->is_active ? 'True' : 'False'));

        // Start Update 13 September 2026, by @WNP: Mark this command-generated appeal note for selective timeline localization.
        $user->vendor->transitionTo('under_review', $admin, 'Admin reviewed termination appeal and restored access.', 'APPEAL_APPROVED', automaticComment: true);

        $user->refresh();

        $this->info("Successfully moved Vendor to 'under_review'.");
        $this->info('User is_active: '.($user->is_active ? 'True' : 'False'));
        $this->info('The vendor can now login again!');
    }
}
