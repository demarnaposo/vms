<?php

namespace Tests\Feature;

use App\Models\JobLog;
use App\Models\PaymentRequest;
use App\Models\Role;
use App\Models\User;
use App\Models\Vendor;
use App\Notifications\PaymentDelayAlert;
use App\Notifications\PendingPaymentApprovalsAlert;
use App\Notifications\WeeklySummaryGenerated;
use App\Services\DashboardService;
use App\Services\ReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PaymentsModuleAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['features.payments.enabled' => false]);
    }

    public function test_disabled_endpoints_return_404_for_every_role_before_binding_or_writes(): void
    {
        $owner = User::factory()->create();
        $vendor = Vendor::factory()->create(['user_id' => $owner->id]);
        $payment = PaymentRequest::create(['vendor_id' => $vendor->id, 'requested_by' => $owner->id, 'reference_number' => 'PAY-HISTORY', 'amount' => 100, 'description' => 'Synthetic history', 'status' => PaymentRequest::STATUS_PENDING_OPS]);
        $endpoints = [
            ['GET', '/vendor/payments'],
            ['HEAD', '/vendor/payments'],
            ['POST', '/vendor/payments/request'],
            ['GET', '/admin/payments'],
            ['GET', '/admin/payments/'.$payment->id],
            ['POST', '/admin/payments/'.$payment->id.'/validate-ops'],
            ['POST', '/admin/payments/'.$payment->id.'/approve-finance'],
            ['POST', '/admin/payments/'.$payment->id.'/mark-paid'],
            ['GET', '/admin/reports/payment'],
            ['GET', '/admin/reports/export/payment'],
            ['GET', '/admin/reports/export/PAYMENT'],
            ['GET', '/admin/reports/export/%70ayment'],
        ];
        $roles = [null, Role::VENDOR, Role::OPS_MANAGER, Role::FINANCE_MANAGER, Role::SUPER_ADMIN, 'custom_staff'];
        foreach ($roles as $name) {
            $user = User::factory()->create();
            if ($name !== null) {
                $role = Role::firstOrCreate(['name' => $name], ['display_name' => $name, 'is_staff' => $name !== Role::VENDOR]);
                $user->roles()->attach($role);
            }
            $this->actingAs($user);
            foreach ($endpoints as [$method, $url]) {
                $this->call($method, $url, ['amount' => 5000, 'description' => 'Synthetic request', 'action' => 'approve'])
                    ->assertNotFound();
            }
        }
        auth()->forgetGuards();
        foreach ($endpoints as [$method, $url]) {
            $this->call($method, $url)->assertNotFound();
        }
        $this->assertDatabaseCount('payment_requests', 1);
        $this->assertSame(PaymentRequest::STATUS_PENDING_OPS, $payment->refresh()->status);
        $this->assertSame(100.0, (float) $payment->amount);
        $this->get('/admin/payments/999999')->assertNotFound();
        $this->assertDatabaseCount('payment_approvals', 0);
        $this->assertDatabaseCount('payment_logs', 0);
    }

    public function test_shared_reports_and_other_exports_still_work_without_payment_statistics(): void
    {
        $user = $this->staff(Role::SUPER_ADMIN);
        foreach (['vendor', 'vendor_summary', 'compliance', 'compliance_report', 'performance', 'document_expiry'] as $type) {
            $this->actingAs($user)->get('/admin/reports/export/'.$type)->assertOk();
        }
        $this->actingAs($user)->get('/admin/reports')->assertInertia(fn ($page) => $page
            ->where('features.payments.enabled', false)
            ->missing('stats.pending_payments')->missing('stats.total_paid'));
        $this->actingAs($user)->get('/admin/dashboard')->assertInertia(fn ($page) => $page
            ->where('features.payments.enabled', false)
            ->missing('stats.pending_payments')->missing('stats.approved_payments')
            ->where('pendingPayments', []));
        $this->get('/')->assertInertia(fn ($page) => $page->where('features.payments.enabled', false));
        $this->assertArrayNotHasKey('pending_payments', app(DashboardService::class)->stats());
    }

    public function test_reenabled_endpoints_keep_original_permissions(): void
    {
        config(['features.payments.enabled' => true]);
        foreach ([Role::OPS_MANAGER, Role::FINANCE_MANAGER, Role::SUPER_ADMIN] as $name) {
            $this->actingAs($this->staff($name))->get('/admin/payments')->assertOk();
            $this->get('/admin/reports/export/payment')->assertOk();
        }
        $vendor = User::factory()->create();
        $role = Role::firstOrCreate(['name' => Role::VENDOR], ['display_name' => 'Vendor']);
        $vendor->roles()->attach($role);
        $this->actingAs($vendor)->get('/admin/payments')->assertForbidden();
        $this->actingAs($this->staff('custom_staff'))->get('/admin/payments')->assertForbidden();
        $this->get('/admin/reports/export/payment')->assertForbidden();
    }

    public function test_vendor_dashboard_remains_available_without_payment_data(): void
    {
        $user = User::factory()->create();
        $role = Role::firstOrCreate(['name' => Role::VENDOR], ['display_name' => 'Vendor']);
        $user->roles()->attach($role);
        Vendor::factory()->create(['user_id' => $user->id, 'status' => Vendor::STATUS_ACTIVE]);
        $this->actingAs($user)->get('/vendor/dashboard')->assertInertia(fn ($page) => $page
            ->component('Vendor/Dashboard')->where('features.payments.enabled', false)
            ->missing('stats.pending_payments')->missing('stats.total_paid')
            ->where('recentPayments', []));
        $this->get('/vendor/documents')->assertOk();
        $this->get('/vendor/performance')->assertOk();
    }

    public function test_reenabled_actions_keep_operations_and_finance_permissions_separate(): void
    {
        config(['features.payments.enabled' => true]);
        $owner = User::factory()->create();
        $vendor = Vendor::factory()->create(['user_id' => $owner->id]);
        $payment = PaymentRequest::create(['vendor_id' => $vendor->id, 'requested_by' => $owner->id, 'reference_number' => 'PAY-AUTH', 'amount' => 100, 'description' => 'Synthetic permission check', 'status' => PaymentRequest::STATUS_PENDING_FINANCE]);
        $this->actingAs($this->staff(Role::OPS_MANAGER))->post('/admin/payments/'.$payment->id.'/approve-finance', ['action' => 'approve'])->assertForbidden();
        $this->post('/admin/payments/'.$payment->id.'/mark-paid', ['payment_reference' => 'SYNTHETIC'])->assertForbidden();
        $this->actingAs($this->staff(Role::FINANCE_MANAGER))->post('/admin/payments/'.$payment->id.'/validate-ops', ['action' => 'approve'])->assertForbidden();
        $this->assertSame(PaymentRequest::STATUS_PENDING_FINANCE, $payment->refresh()->status);
    }

    public function test_disabled_automation_and_queued_alerts_do_not_write_notifications_or_job_logs(): void
    {
        Notification::fake();
        $this->artisan('vendors:payment-alerts')->assertSuccessful();
        Notification::assertNothingSent();
        $this->assertDatabaseCount('jobs_log', 0);
        foreach ([new PaymentDelayAlert(1, 100, 7), new PendingPaymentApprovalsAlert('ops', 1, 24)] as $alert) {
            $this->assertSame([], $alert->via(new \stdClass));
            $this->assertFalse($alert->shouldSend(new \stdClass, 'database'));
            config(['features.payments.enabled' => true]);
            $this->assertSame(['database'], $alert->via(new \stdClass));
            $this->assertTrue($alert->shouldSend(new \stdClass, 'database'));
            config(['features.payments.enabled' => false]);
        }
    }

    public function test_shared_weekly_summary_keeps_vendor_and_compliance_sections(): void
    {
        Notification::fake();
        $this->artisan('vendors:weekly-summary')->assertSuccessful();
        $summary = JobLog::latest('id')->firstOrFail()->result;
        $this->assertArrayHasKey('vendors', $summary);
        $this->assertArrayHasKey('compliance', $summary);
        $this->assertArrayNotHasKey('payments', $summary);
        $queued = new WeeklySummaryGenerated(['period' => 'Synthetic week', 'vendors' => ['new_this_week' => 2], 'payments' => ['approved' => 1]]);
        $data = $queued->toArray(new \stdClass);
        $this->assertArrayNotHasKey('payments', $data['summary']);
        $this->assertStringNotContainsString('payments', $data['message']);
    }

    public function test_payment_export_service_also_rejects_direct_calls_when_disabled(): void
    {
        $this->expectException(\Symfony\Component\HttpKernel\Exception\NotFoundHttpException::class);
        app(ReportService::class)->exportCsvByType(Request::create('/'), 'PAYMENT');
    }

    private function staff(string $name): User
    {
        $role = Role::firstOrCreate(['name' => $name], ['display_name' => $name, 'is_staff' => true]);
        $user = User::factory()->create();
        $user->roles()->attach($role);

        return $user;
    }
}
