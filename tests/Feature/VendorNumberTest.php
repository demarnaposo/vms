<?php

namespace Tests\Feature;

use App\Interfaces\VendorRepositoryInterface;
use App\Models\User;
use App\Models\Vendor;
use App\Services\VendorNumberGenerator;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use Tests\TestCase;

class VendorNumberTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_vendors_receive_sequential_public_ids(): void
    {
        $first = Vendor::factory()->create();
        $second = Vendor::factory()->create();

        $this->assertSame('V001', $first->vendor_number);
        $this->assertSame('V002', $second->vendor_number);
    }

    public function test_vendor_number_uses_minimum_three_digit_padding(): void
    {
        $generator = app(VendorNumberGenerator::class);

        $this->assertSame('V001', $generator->format(1));
        $this->assertSame('V999', $generator->format(999));
        $this->assertSame('V1000', $generator->format(1000));
    }

    public function test_sequence_continues_to_v1000(): void
    {
        DB::table('vendor_number_sequences')->insert([
            'id' => 999,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->assertSame('V1000', Vendor::factory()->create()->vendor_number);
    }

    public function test_soft_deleted_vendor_number_is_not_reused(): void
    {
        $first = Vendor::factory()->create();
        $first->delete();

        $this->assertSame('V002', Vendor::factory()->create()->vendor_number);
    }

    public function test_supplied_vendor_number_is_ignored_and_existing_number_is_immutable(): void
    {
        $vendor = Vendor::factory()->create(['vendor_number' => 'V999']);
        $this->assertSame('V001', $vendor->vendor_number);

        $this->expectException(InvalidArgumentException::class);
        $vendor->forceFill(['vendor_number' => 'V777'])->save();
    }

    public function test_database_unique_constraint_rejects_duplicate_vendor_numbers(): void
    {
        $first = Vendor::factory()->create();
        $second = Vendor::factory()->create();

        $this->expectException(QueryException::class);
        DB::table('vendors')->where('id', $second->id)->update([
            'vendor_number' => $first->vendor_number,
        ]);
    }

    public function test_repository_update_preserves_vendor_number(): void
    {
        $vendor = Vendor::factory()->create();

        app(VendorRepositoryInterface::class)->updateOrCreate(
            ['user_id' => $vendor->user_id],
            ['company_name' => 'Updated Company']
        );

        $this->assertSame('V001', $vendor->fresh()->vendor_number);
    }

    public function test_legacy_vendor_without_public_id_remains_readable(): void
    {
        $user = User::factory()->create();
        $id = DB::table('vendors')->insertGetId([
            'user_id' => $user->id,
            'vendor_number' => null,
            'company_name' => 'Legacy Vendor',
            'contact_person' => 'Legacy Contact',
            'contact_email' => 'legacy@example.test',
            'contact_phone' => '081234567890',
            'status' => Vendor::STATUS_DRAFT,
            'compliance_status' => Vendor::COMPLIANCE_PENDING,
            'compliance_score' => 0,
            'performance_score' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->assertNull(Vendor::findOrFail($id)->vendor_number);
    }
}
