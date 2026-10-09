<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\VendorCategory;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

class VendorCategoryAlignment
{
    public function align(bool $apply = false): array
    {
        if (! Schema::hasColumn('vendor_categories', 'description')) {
            throw new RuntimeException('Run the vendor category description migration manually before alignment.');
        }

        return VendorCategoryService::locked(function () use ($apply): array {
            $baseline = (require database_path('data/system_master_data.php'))['vendor_categories'];
            $plan = ['insert' => [], 'fill_description' => [], 'preserved' => [], 'referenced' => []];
            $updates = [];
            foreach ($baseline as $row) {
                $category = VendorCategory::where('code', $row['code'])->lockForUpdate()->first();
                if (! $category) {
                    $plan['insert'][] = $row['code'];
                    $updates[] = ['new' => $row];

                    continue;
                }
                if (app(VendorCategoryService::class)->referenced($category)) {
                    $plan['referenced'][] = $category->id;
                }
                // Match only an explicit stable code AND exact source label, never a similar legacy name.
                // An audited description edit (including clearing it) is an administrator setting.
                $edited = AuditLog::where('auditable_type', VendorCategory::class)->where('auditable_id', $category->id)
                    ->where('event', AuditLog::EVENT_UPDATED)->get()->contains(fn ($audit) => array_key_exists('description', $audit->new_values ?? []));
                if ($category->display_name === $row['display_name'] && $category->description === null && ! $edited) {
                    $plan['fill_description'][] = $category->id;
                    $updates[] = ['category' => $category, 'description' => $row['description']];
                } else {
                    $plan['preserved'][] = $category->id;
                }
            }
            // All references are checked before mutation. No category or relationship is ever deleted/remapped.
            if ($apply) {
                foreach ($updates as $change) {
                    if (isset($change['new'])) {
                        DB::table('vendor_categories')->insert($change['new'] + ['created_at' => now(), 'updated_at' => now()]);
                    } else {
                        $change['category']->update(['description' => $change['description']]);
                    }
                }
                DB::table('master_data_initializations')->insertOrIgnore(['name' => 'vendor_categories', 'initialized_at' => now()]);
            }

            return ['status' => $apply ? 'aligned' : 'dry run', ...$plan];
        });
    }
}
