<?php

namespace App\Console\Commands;

use App\Services\VendorCategoryAlignment;
use Illuminate\Console\Command;

class AlignVendorCategories extends Command
{
    protected $signature = 'vendor-categories:align-baseline {--apply : Add missing defaults and fill eligible descriptions}';

    protected $description = 'Inspect or safely align vendor category defaults without deleting or remapping existing categories';

    public function handle(VendorCategoryAlignment $alignment): int
    {
        try {
            $this->line(json_encode($alignment->align((bool) $this->option('apply')), JSON_PRETTY_PRINT));
        } catch (\RuntimeException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
