<?php

namespace Tests;

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    public function createApplication()
    {
        $this->enforceTestingEnvironment();

        $app = require __DIR__.'/../bootstrap/app.php';
        $app->make(Kernel::class)->bootstrap();

        // Check isolation before Laravel initializes database-writing test traits.
        $connection = $app->make('db')->connection();
        if ($app->configurationIsCached()
            || $connection->getDriverName() !== 'sqlite'
            || $connection->getDatabaseName() !== ':memory:'
            || config('cache.default') !== 'array'
            || config('session.driver') !== 'array'
            || config('mail.default') !== 'array'
            || config('queue.default') !== 'sync') {
            throw new \RuntimeException('Database-writing tests require uncached SQLite :memory: with array cache/session/mail and sync queue.');
        }

        return $app;
    }

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware([
            \Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class,
            \Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
        ]);
    }

    private function enforceTestingEnvironment(): void
    {
        $overrides = [
            'APP_ENV' => 'testing',
            'APP_CONFIG_CACHE' => sys_get_temp_dir().'/vms-tests-uncached-'.getmypid().'.php',
            'APP_LOCALE' => 'en',
            'APP_FALLBACK_LOCALE' => 'en',
            'DB_CONNECTION' => 'sqlite',
            'DB_DATABASE' => ':memory:',
            'CACHE_STORE' => 'array',
            'SESSION_DRIVER' => 'array',
            'QUEUE_CONNECTION' => 'sync',
            'MAIL_MAILER' => 'array',
            'BROADCAST_CONNECTION' => 'log',
        ];

        foreach ($overrides as $key => $value) {
            putenv("{$key}={$value}");
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }
    }
}
