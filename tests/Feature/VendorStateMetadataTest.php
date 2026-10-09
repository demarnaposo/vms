<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class VendorStateMetadataTest extends TestCase
{
    use RefreshDatabase;

    public function test_metadata_correction_preserves_vendor_data_and_other_states(): void
    {
        $vendor = Vendor::factory()->create([
            'user_id' => User::factory()->create()->id,
            'status' => Vendor::STATUS_TERMINATED,
        ]);
        $originalVendor = DB::table('vendors')->where('id', $vendor->id)->first();
        foreach (['terminated' => true, 'suspended' => false, 'custom_final' => true] as $name => $terminal) {
            DB::table('vendor_states')->updateOrInsert(['name' => $name], [
                'display_name' => $name,
                'is_terminal' => $terminal,
                'sort_order' => 1,
            ]);
        }

        $migration = require database_path('migrations/2026_10_05_000001_align_terminated_vendor_state_metadata.php');
        $migration->up();
        $migration->up();

        $this->assertDatabaseHas('vendor_states', ['name' => 'terminated', 'is_terminal' => false]);
        $this->assertDatabaseHas('vendor_states', ['name' => 'suspended', 'is_terminal' => false]);
        $this->assertDatabaseHas('vendor_states', ['name' => 'custom_final', 'is_terminal' => true]);
        $this->assertEquals($originalVendor, DB::table('vendors')->where('id', $vendor->id)->first());

        $migration->down();
        $this->assertDatabaseHas('vendor_states', ['name' => 'terminated', 'is_terminal' => true]);
        $this->assertDatabaseHas('vendor_states', ['name' => 'custom_final', 'is_terminal' => true]);
        $this->assertEquals($originalVendor, DB::table('vendors')->where('id', $vendor->id)->first());
    }
}
