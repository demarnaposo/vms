<?php

namespace App\Providers;

use App\Models\PaymentRequest;
use App\Models\Role;
use App\Models\User;
use App\Models\Vendor;
use App\Models\VendorDocument;
use App\Policies\PaymentRequestPolicy;
use App\Policies\VendorDocumentPolicy;
use App\Policies\VendorPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Console\Events\CommandStarting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use RuntimeException;
use Symfony\Component\Console\Input\InputInterface;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(
            \App\Interfaces\VendorRepositoryInterface::class,
            \App\Repositories\VendorRepository::class
        );
        $this->app->bind(
            \App\Interfaces\PaymentRepositoryInterface::class,
            \App\Repositories\PaymentRepository::class
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->registerDestructiveCommandGuard();

        RateLimiter::for('contact-form', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        RateLimiter::for('guest-auth', function (Request $request) {
            return Limit::perHour(20)->by($request->ip());
        });

        RateLimiter::for('document-access', function (Request $request) {
            $user = $request->user();
            $userId = $user instanceof User ? $user->id : 'guest';

            return Limit::perMinute(120)->by($userId.'|'.$request->ip());
        });

        RateLimiter::for('sensitive-action', function (Request $request) {
            // Keep rate-limited form actions on their current page with visible feedback.
            return Limit::perMinute(10)
                ->by($request->user()?->id.'|'.$request->ip())
                ->response(fn (Request $request, array $headers) => back()
                    ->with('error', __('alerts.too_many_requests'))
                    ->withHeaders($headers));
        });

        RateLimiter::for('login', function (Request $request) {
            $throttleKey = strtolower((string) $request->input('email')).'|'.$request->ip();

            return Limit::perMinute(5)->by($throttleKey);
        });

        RateLimiter::for('account-delete', function (Request $request) {
            return Limit::perHour(3)->by($request->user()?->id.'|'.$request->ip());
        });

        Gate::policy(Vendor::class, VendorPolicy::class);
        Gate::policy(VendorDocument::class, VendorDocumentPolicy::class);
        Gate::policy(PaymentRequest::class, PaymentRequestPolicy::class);

        foreach ([
            'viewDashboard' => 'dashboard.view', 'viewReports' => 'reports.view', 'exportReports' => 'reports.export',
            'viewPerformance' => 'performance.view', 'ratePerformance' => 'performance.rate',
            'viewCompliance' => 'compliance.access', 'runCompliance' => 'compliance.evaluate',
            'viewDocuments' => 'documents.list', 'viewSystemHealth' => 'system.health',
        ] as $ability => $permission) {
            Gate::define($ability, fn (User $user) => $user->staffCan($permission));
        }
        Gate::define('manageComplianceRules', fn (User $user) => $user->isSuperAdmin());
        Gate::define('viewAuditLogs', fn (User $user) => $user->isSuperAdmin());

        Gate::before(function (User $user) {
            return $user->hasRole(Role::SUPER_ADMIN) ? true : null;
        });

        // production
        if (str_starts_with(config('app.url'), 'https://')) {
            URL::forceScheme('https');
        }
    }

    private function registerDestructiveCommandGuard(): void
    {
        if (! $this->app->runningInConsole()
            || $this->app->runningUnitTests()
            || $this->app->environment('testing')
            || $this->isRunningPhpUnit()) {
            return;
        }

        Event::listen(CommandStarting::class, function (CommandStarting $event): void {
            $destructiveCommands = [
                'db:wipe',
                'migrate:fresh',
                'migrate:refresh',
                'migrate:reset',
            ];

            if (! in_array($event->command, $destructiveCommands, true)) {
                return;
            }

            if ($this->app->runningUnitTests() || $this->app->environment('testing') || $this->isRunningPhpUnit()) {
                return;
            }

            if ($this->isDestructiveCommandOverrideEnabled()) {
                return;
            }

            $connectionName = $this->resolveConnectionNameFromInput($event->input);
            if ($connectionName === '') {
                $connectionName = (string) config('database.default');
            }

            $connectionConfig = config("database.connections.{$connectionName}");
            if (! is_array($connectionConfig)) {
                return;
            }

            $driver = strtolower((string) ($connectionConfig['driver'] ?? ''));
            $database = strtolower((string) ($connectionConfig['database'] ?? ''));

            if ($this->isSafeDestructiveTarget($driver, $database)) {
                return;
            }

            throw new RuntimeException(
                "Blocked '{$event->command}' on connection '{$connectionName}' (database: '{$database}'). ".
                'Set ALLOW_DESTRUCTIVE_DB_COMMANDS=true to allow this intentionally.'
            );
        });
    }

    private function isRunningPhpUnit(): bool
    {
        if (defined('PHPUNIT_COMPOSER_INSTALL') || defined('__PHPUNIT_PHAR__')) {
            return true;
        }

        $argv = $_SERVER['argv'] ?? [];

        if (! is_array($argv) || $argv === []) {
            return false;
        }

        $commandLine = strtolower(implode(' ', $argv));

        return str_contains($commandLine, 'phpunit')
            || str_contains($commandLine, 'pest')
            || str_contains($commandLine, 'artisan test');
    }

    private function resolveConnectionNameFromInput(InputInterface $input): string
    {
        if (! $input->hasOption('database')) {
            return '';
        }

        return (string) ($input->getOption('database') ?? '');
    }

    private function isDestructiveCommandOverrideEnabled(): bool
    {
        $value = config('app.allow_destructive_db_commands', false);

        return filter_var($value, FILTER_VALIDATE_BOOLEAN) === true;
    }

    private function isSafeDestructiveTarget(string $driver, string $database): bool
    {
        if ($driver === 'sqlite') {
            return $database === ':memory:'
                || str_ends_with($database, '_test.sqlite')
                || str_ends_with($database, '_testing.sqlite');
        }

        return str_ends_with($database, '_test')
            || str_ends_with($database, '_testing');
    }
}
