<?php

namespace Tests\Feature;

use App\Models\RazorpayTransaction;
use App\Models\User;
use App\Models\Vendor;
use App\Models\VendorBond;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class RazorpayConfigurationTest extends TestCase
{
    use RefreshDatabase;

    // Start Update 16 September 2026, by @WNP: Verify the retained legacy gateway stays disabled and has no HTTP endpoint.
    public function test_razorpay_is_disabled_and_not_exposed_by_route(): void
    {
        $this->assertFalse((bool) config('services.razorpay.enabled'));

        $hasRazorpayRoute = collect(Route::getRoutes())->contains(
            fn ($route) => str_contains(strtolower($route->uri()), 'razorpay')
        );

        $this->assertFalse($hasRazorpayRoute);
    }

    // Start Update 16 September 2026, by @WNP: Preserve the migrated bond relationship for historical records or future reactivation.
    public function test_legacy_razorpay_transaction_relationship_remains_intact(): void
    {
        $user = User::factory()->create();
        $vendor = Vendor::factory()->create(['user_id' => $user->id]);
        $bond = VendorBond::create([
            'vendor_id' => $vendor->id,
            'total_amount' => 1000000,
            'current_balance' => 1000000,
        ]);
        $transaction = RazorpayTransaction::create([
            'vendor_bond_id' => $bond->id,
            'amount' => 1000000,
        ]);

        $this->assertTrue($bond->transactions()->whereKey($transaction->id)->exists());
        $this->assertTrue($transaction->bond->is($bond));
        $this->assertSame('IDR', $transaction->fresh()->currency);
    }
}
