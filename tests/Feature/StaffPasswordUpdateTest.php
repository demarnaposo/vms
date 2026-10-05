<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
use App\Services\SystemMasterDataService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class StaffPasswordUpdateTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $target;

    public function createApplication()
    {
        $app = parent::createApplication();
        $connection = $app['config']->get('database.default');
        if ($connection !== 'sqlite' || $app['config']->get('database.connections.sqlite.database') !== ':memory:'
            || $app->configurationIsCached() || $app['config']->get('cache.default') !== 'array'
            || $app['config']->get('session.driver') !== 'array' || $app['config']->get('mail.default') !== 'array'
            || $app['config']->get('queue.default') !== 'sync') {
            throw new \RuntimeException('Staff password tests require uncached isolated test configuration.');
        }

        return $app;
    }

    protected function setUp(): void
    {
        parent::setUp();
        (new SystemMasterDataService)->syncRolesAndPermissions();
        $this->admin = User::factory()->create();
        $this->admin->assignRole(Role::SUPER_ADMIN);
        $this->target = User::factory()->create();
        $this->target->assignRole('ops_manager');
    }

    private function payload(): array
    {
        return ['name' => 'Updated Staff', 'email' => $this->target->email, 'role_ids' => [Role::where('name', 'finance_manager')->value('id')]];
    }

    public static function emptyPasswords(): array
    {
        return ['omitted' => [[]], 'empty' => [['password' => '', 'password_confirmation' => '']], 'null' => [['password' => null, 'password_confirmation' => null]]];
    }

    #[DataProvider('emptyPasswords')]
    public function test_empty_password_preserves_hash_and_updates_other_fields(array $passwords): void
    {
        $hash = $this->target->password;
        $this->actingAs($this->admin)->put('/admin/staff-users/'.$this->target->id, [...$this->payload(), ...$passwords])->assertSessionHasNoErrors()->assertSessionHas('success', __('alerts.rbac_user_updated'));
        $this->assertTrue($hash === $this->target->fresh()->password);
        $this->assertSame('Updated Staff', $this->target->fresh()->name);
        $this->assertTrue($this->target->fresh()->hasRole('finance_manager'));
    }

    public function test_valid_password_is_hashed_and_not_exposed(): void
    {
        $oldHash = $this->target->password;
        $password = 'TestOnlyPassword123!';
        $this->actingAs($this->admin)->put('/admin/staff-users/'.$this->target->id, [...$this->payload(), 'password' => $password, 'password_confirmation' => $password])->assertSessionHasNoErrors()->assertSessionHas('success', __('alerts.rbac_user_password_updated'));
        $newHash = $this->target->fresh()->password;
        $this->assertTrue($oldHash !== $newHash && Hash::check($password, $newHash));
        $this->assertArrayNotHasKey('password_confirmation', $this->target->fresh()->getAttributes());
        $response = $this->get('/admin/staff-users');
        $response->assertOk();
        $this->assertFalse(str_contains($response->getContent(), $newHash) || str_contains($response->getContent(), $password));
        $detail = $this->get('/admin/staff-users/'.$this->target->id);
        $detail->assertOk();
        $this->assertFalse(str_contains($detail->getContent(), $newHash) || str_contains($detail->getContent(), $password));
        $audit = AuditLog::latest('id')->first();
        $this->assertFalse(str_contains($audit->toJson(), $password) || str_contains($audit->toJson(), $newHash));
    }

    public static function invalidPasswords(): array
    {
        return [
            'missing confirmation' => [['password' => 'TestOnlyPassword123!'], 'password_confirmation'],
            'blank confirmation' => [['password' => 'TestOnlyPassword123!', 'password_confirmation' => ''], 'password_confirmation'],
            'mismatch' => [['password' => 'TestOnlyPassword123!', 'password_confirmation' => 'DifferentPassword123!'], 'password_confirmation'],
            'confirmation only' => [['password_confirmation' => 'TestOnlyPassword123!'], 'password'],
            'weak password' => [['password' => 'short', 'password_confirmation' => 'short'], 'password'],
        ];
    }

    #[DataProvider('invalidPasswords')]
    public function test_invalid_password_does_not_change_any_fields(array $passwords, string $error): void
    {
        $attributes = $this->target->fresh()->getAttributes();
        $roles = $this->target->roles->pluck('id')->all();
        $this->actingAs($this->admin)->put('/admin/staff-users/'.$this->target->id, [...$this->payload(), ...$passwords])->assertSessionHasErrors($error);
        $this->assertSame([$error], session('errors')->getBag('default')->keys());
        $this->assertTrue($attributes === $this->target->fresh()->getAttributes());
        $this->assertSame($roles, $this->target->fresh()->roles->pluck('id')->all());
        $this->assertDatabaseCount('audit_logs', 0);
        $this->assertFalse(session()->hasOldInput('password') || session()->hasOldInput('password_confirmation'));
    }

    public function test_unauthorized_password_update_is_rejected(): void
    {
        $attributes = $this->admin->fresh()->getAttributes();
        $this->actingAs($this->target)->put('/admin/staff-users/'.$this->admin->id, [...$this->payload(), 'password' => 'TestOnlyPassword123!', 'password_confirmation' => 'TestOnlyPassword123!'])->assertForbidden();
        $this->assertTrue($attributes === $this->admin->fresh()->getAttributes());
    }

    public function test_last_admin_protection_also_preserves_password(): void
    {
        $attributes = $this->admin->fresh()->getAttributes();
        $this->actingAs($this->admin)->put('/admin/staff-users/'.$this->admin->id, [
            ...$this->payload(), 'email' => $this->admin->email,
            'password' => 'TestOnlyPassword123!', 'password_confirmation' => 'TestOnlyPassword123!',
        ])->assertSessionHasErrors('role_ids');
        $this->assertTrue($attributes === $this->admin->fresh()->getAttributes());
        $this->assertTrue($this->admin->fresh()->hasRole(Role::SUPER_ADMIN));
    }

    public function test_create_still_requires_password_and_confirmation(): void
    {
        $payload = [...$this->payload(), 'email' => 'new-staff@example.com'];
        $this->actingAs($this->admin)->post('/admin/staff-users', $payload)->assertSessionHasErrors('password');
        $this->post('/admin/staff-users', [...$payload, 'password' => 'TestOnlyPassword123!'])->assertSessionHasErrors('password_confirmation');
        $this->assertDatabaseMissing('users', ['email' => 'new-staff@example.com']);
    }
}
