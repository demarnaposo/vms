<?php

namespace Tests\Feature;

use App\Models\PaymentRequest;
use App\Models\RazorpayTransaction;
use App\Models\User;
use App\Models\Vendor;
use App\Models\VendorBond;
use App\Support\Currency;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CurrencyConfigurationTest extends TestCase
{
    use RefreshDatabase;

    // Start Update 11 September 2026, by @WNP: Verify all monetary tables default new records to IDR without requiring callers to set currency.
    public function test_monetary_records_use_idr_as_the_database_default(): void
    {
        $user = User::factory()->create();
        $vendor = Vendor::factory()->create(['user_id' => $user->id]);

        $payment = PaymentRequest::create([
            'vendor_id' => $vendor->id,
            'requested_by' => $user->id,
            'reference_number' => 'PAY-CURRENCY-TEST',
            'amount' => 1000000,
            'description' => 'Currency default verification',
        ]);

        $bond = VendorBond::create([
            'vendor_id' => $vendor->id,
            'total_amount' => 1500000,
            'current_balance' => 1500000,
        ]);

        $transaction = RazorpayTransaction::create([
            'vendor_bond_id' => $bond->id,
            'amount' => 25000000,
        ]);

        $this->assertSame('IDR', $payment->fresh()->currency);
        $this->assertSame('IDR', $bond->fresh()->currency);
        $this->assertSame('IDR', $transaction->fresh()->currency);
    }

    // Start Update 11 September 2026, by @WNP: Verify Rupiah output follows Indonesian digit grouping with no decimal places.
    public function test_currency_formatter_uses_indonesian_rupiah_format(): void
    {
        $this->assertSame('IDR', Currency::code());
        $this->assertSame('Rp 1.000.000', Currency::format(1000000));
        $this->assertSame('Rp 1.500.000', Currency::format(1500000));
        $this->assertSame('Rp 25.000.000', Currency::format(25000000));
    }
}
