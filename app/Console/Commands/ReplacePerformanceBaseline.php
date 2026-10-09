<?php

namespace App\Console\Commands;

use App\Services\PerformanceBaselineReplacement;
use Illuminate\Console\Command;

class ReplacePerformanceBaseline extends Command
{
    protected $signature = 'performance:replace-baseline {--apply : Apply the guarded replacement in maintenance mode}';

    protected $description = 'Inspect or replace the four legacy performance defaults with the six percentage metrics';

    public function handle(PerformanceBaselineReplacement $replacement): int
    {
        if ($this->option('apply') && ! app()->isDownForMaintenance() && ! app()->environment('testing')) {
            $this->error('Enter maintenance mode and stop queue/scheduler workers before applying the replacement.');

            return self::FAILURE;
        }
        try {
            $this->line(json_encode($replacement->replace((bool) $this->option('apply')), JSON_PRETTY_PRINT));
        } catch (\RuntimeException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
