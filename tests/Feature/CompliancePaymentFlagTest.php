<?php

namespace Tests\Feature;

use App\Models\ComplianceFlag;
use App\Models\ComplianceResult;
use App\Models\ComplianceRule;
use App\Models\Role;
use App\Models\User;
use App\Models\Vendor;
use App\Services\ComplianceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class CompliancePaymentFlagTest extends TestCase
{
    use RefreshDatabase;

    private function rule(array $attributes = []): ComplianceRule
    {
        return ComplianceRule::create(array_merge([
            'name' => 'payment_flag_test',
            'description' => 'Performance requirement',
            'type' => ComplianceRule::TYPE_PERFORMANCE_THRESHOLD,
            'conditions' => ['min_score' => 80],
            'severity' => ComplianceRule::SEVERITY_MEDIUM,
            'penalty_points' => 5,
            'blocks_payment' => true,
            'blocks_activation' => false,
            'is_active' => true,
        ], $attributes));
    }

    private function admin(): User
    {
        $role = Role::firstOrCreate(['name' => Role::SUPER_ADMIN, 'guard_name' => 'web'], [
            'display_name' => 'Super Admin', 'is_staff' => true,
        ]);
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    public static function disabledPayloads(): array
    {
        return [
            'Indonesian true' => ['id', true],
            'English false' => ['en', false],
            'English null' => ['en', null],
        ];
    }

    #[DataProvider('disabledPayloads')]
    public function test_disabled_payment_setting_rejects_direct_requests_without_partial_saves(string $locale, ?bool $value): void
    {
        config()->set('features.payments.enabled', false);
        $rule = $this->rule();
        $expected = $locale === 'id'
            ? 'Pengaturan pemblokiran pembayaran tidak dapat diubah saat modul pembayaran dinonaktifkan. Anda tetap dapat mengubah pengaturan aturan lainnya.'
            : 'Payment blocking cannot be changed while the payments module is disabled. You can still update the other rule settings.';

        $this->actingAs($this->admin())->withUnencryptedCookie('vms_locale', $locale)
            ->patch(route('admin.compliance.rules.update', $rule), [
                'blocks_payment' => $value, 'penalty_points' => 20,
            ])->assertSessionHasErrors(['blocks_payment' => $expected]);

        $this->assertTrue($rule->fresh()->blocks_payment);
        $this->assertSame(5, $rule->fresh()->penalty_points);
    }

    public function test_other_settings_remain_editable_and_payment_setting_returns_when_enabled(): void
    {
        $rule = $this->rule();
        $admin = $this->admin();
        config()->set('features.payments.enabled', false);
        $this->actingAs($admin)->patch(route('admin.compliance.rules.update', $rule), [
            'penalty_points' => 10, 'blocks_activation' => true,
        ])->assertSessionHasNoErrors()->assertSessionHas('success');
        $this->assertTrue($rule->fresh()->blocks_payment);
        $this->assertTrue($rule->fresh()->blocks_activation);
        $this->assertSame(10, $rule->fresh()->penalty_points);
        $this->get(route('admin.compliance.rules'))->assertInertia(fn ($page) => $page
            ->component('Admin/Compliance/Rules')->where('features.payments.enabled', false)
            ->where('rules.0.blocks_payment', true));

        config()->set('features.payments.enabled', true);
        $this->get(route('admin.compliance.rules'))->assertInertia(fn ($page) => $page
            ->where('features.payments.enabled', true)->where('rules.0.blocks_payment', true));
        $this->patch(route('admin.compliance.rules.update', $rule), ['blocks_payment' => false])
            ->assertSessionHasNoErrors()->assertSessionHas('success');
        $this->assertFalse($rule->fresh()->blocks_payment);
    }

    public function test_enabled_payment_setting_still_requires_boolean_validation_and_admin_authorization(): void
    {
        config()->set('features.payments.enabled', true);
        $rule = $this->rule();
        $this->actingAs($this->admin())->patch(route('admin.compliance.rules.update', $rule), [
            'blocks_payment' => 'invalid', 'penalty_points' => 20,
        ])->assertSessionHasErrors('blocks_payment');
        $this->assertTrue($rule->fresh()->blocks_payment);
        $this->assertSame(5, $rule->fresh()->penalty_points);

        $staff = User::factory()->create();
        $staff->assignRole(Role::firstOrCreate(['name' => Role::OPS_MANAGER, 'guard_name' => 'web'], [
            'display_name' => 'Operations Manager', 'is_staff' => true,
        ]));
        foreach ([false, true] as $enabled) {
            config()->set('features.payments.enabled', $enabled);
            $this->actingAs($staff)->patch(route('admin.compliance.rules.update', $rule), [
                'blocks_payment' => false,
            ])->assertForbidden();
        }
        $this->assertTrue($rule->fresh()->blocks_payment);
    }

    public function test_payment_blocking_follows_flag_without_losing_penalty_flags_or_history(): void
    {
        $rule = $this->rule();
        $vendor = Vendor::factory()->create(['performance_score' => 40]);
        config()->set('features.payments.enabled', false);
        $disabled = app(ComplianceService::class)->evaluateVendor($vendor);
        $this->assertSame(Vendor::COMPLIANCE_COMPLIANT, $disabled['status']);
        $this->assertSame(95, $disabled['score']);
        $this->assertSame(1, $disabled['failures']);
        $this->assertSame(1, $disabled['open_flags']);
        $history = ComplianceResult::where('vendor_id', $vendor->id)->firstOrFail()->getAttributes();

        config()->set('features.payments.enabled', true);
        $enabled = app(ComplianceService::class)->evaluateVendor($vendor->fresh());
        $this->assertSame(Vendor::COMPLIANCE_BLOCKED, $enabled['status']);
        $this->assertSame(95, $enabled['score']);
        $this->assertSame(1, $enabled['open_flags']);
        $this->assertTrue($rule->fresh()->blocks_payment);
        $this->assertDatabaseCount('compliance_results', 2);
        $this->assertEquals($history, ComplianceResult::findOrFail($history['id'])->getAttributes());

        config()->set('features.payments.enabled', false);
        $rule->update(['blocks_activation' => true]);
        $this->assertSame(Vendor::COMPLIANCE_BLOCKED, app(ComplianceService::class)->evaluateVendor($vendor->fresh())['status']);
    }

    public function test_score_and_open_flags_can_still_block_or_reduce_compliance_without_payments(): void
    {
        config()->set('features.payments.enabled', false);
        $this->rule(['penalty_points' => 60]);
        $vendor = Vendor::factory()->create(['performance_score' => 40]);
        $result = app(ComplianceService::class)->evaluateVendor($vendor);
        $this->assertSame(40, $result['score']);
        $this->assertSame(Vendor::COMPLIANCE_NON_COMPLIANT, $result['status']);

        foreach (['First manual issue', 'Second manual issue'] as $reason) {
            ComplianceFlag::create([
                'vendor_id' => $vendor->id, 'severity' => 'high', 'status' => 'open',
                'reason' => $reason, 'flagged_at' => now(),
            ]);
        }
        $result = app(ComplianceService::class)->evaluateVendor($vendor->fresh());
        $this->assertSame(3, $result['open_flags']);
        $this->assertSame(Vendor::COMPLIANCE_BLOCKED, $result['status']);
    }
}
