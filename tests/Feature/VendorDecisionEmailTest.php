<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Mockery;
use RuntimeException;
use Symfony\Component\Mailer\Transport\TransportInterface;
use Tests\TestCase;

class VendorDecisionEmailTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Vendor $vendor;

    protected function setUp(): void
    {
        parent::setUp();

        $adminRole = Role::firstOrCreate(['name' => Role::SUPER_ADMIN], ['display_name' => 'Super Admin']);
        $this->admin = User::factory()->create(['preferred_locale' => 'en']);
        $this->admin->roles()->attach($adminRole);

        $vendorUser = User::factory()->create(['preferred_locale' => 'id']);
        $this->vendor = Vendor::factory()->create([
            'user_id' => $vendorUser->id,
            'company_name' => 'PPM Manajemen',
            'status' => Vendor::STATUS_SUBMITTED,
        ]);
    }

    public function test_approval_emails_only_vendor_in_recipient_language_after_final_transition(): void
    {
        $this->actingAs($this->admin)->post(route('admin.vendors.approve', $this->vendor), [
            'comment' => 'Internal approval note',
        ])
            ->assertSessionHas('success');

        $this->assertSame(Vendor::STATUS_APPROVED, $this->vendor->fresh()->status);
        $message = Mail::mailer('array')->getSymfonyTransport()->messages()->sole()->getOriginalMessage();

        $this->assertSame('Pengajuan vendor VMS Anda telah disetujui', $message->getSubject());
        $this->assertSame($this->vendor->user->email, $message->getTo()[0]->getAddress());
        $this->assertStringContainsString('Pengajuan vendor untuk PPM Manajemen telah disetujui.', $message->getHtmlBody());
        $this->assertStringContainsString('Persetujuan belum mengaktifkan akun vendor Anda.', $message->getHtmlBody());
        $this->assertStringContainsString('Lihat Dasbor Vendor', $message->getHtmlBody());
        $this->assertStringNotContainsString('Vendor approved', $message->getHtmlBody());
        $this->assertStringNotContainsString('Internal approval note', $message->getHtmlBody());
    }

    public function test_rejection_email_uses_english_and_preserves_the_reason_without_inaccessible_link(): void
    {
        $this->vendor->user->update(['preferred_locale' => 'en']);
        $reason = 'The submitted certificate is incomplete.';

        $this->actingAs($this->admin)->post(route('admin.vendors.reject', $this->vendor), [
            'comment' => $reason,
        ])->assertSessionHas('success');

        $this->assertSame(Vendor::STATUS_REJECTED, $this->vendor->fresh()->status);
        $message = Mail::mailer('array')->getSymfonyTransport()->messages()->sole()->getOriginalMessage();

        $this->assertSame('Your VMS vendor application has been rejected', $message->getSubject());
        $this->assertSame($this->vendor->user->email, $message->getTo()[0]->getAddress());
        $this->assertStringContainsString($reason, $message->getTextBody());
        $this->assertStringNotContainsString('/vendor/dashboard', $message->getHtmlBody());
    }

    public function test_approval_in_english_and_rejection_in_indonesian_use_recipient_preferences(): void
    {
        $this->vendor->user->update(['preferred_locale' => 'en']);
        $otherVendor = Vendor::factory()->create([
            'user_id' => User::factory()->create(['preferred_locale' => 'id'])->id,
            'status' => Vendor::STATUS_SUBMITTED,
        ]);

        $this->actingAs($this->admin)->post(route('admin.vendors.approve', $this->vendor))
            ->assertSessionHas('success');
        $this->post(route('admin.vendors.reject', $otherVendor), [
            'comment' => 'Dokumen sertifikat belum lengkap.',
        ])->assertSessionHas('success');

        $messages = Mail::mailer('array')->getSymfonyTransport()->messages();
        $this->assertCount(2, $messages);
        $this->assertSame('Your VMS vendor application has been approved', $messages[0]->getOriginalMessage()->getSubject());
        $this->assertStringContainsString('View Vendor Dashboard', $messages[0]->getOriginalMessage()->getHtmlBody());
        $this->assertSame('Pengajuan vendor VMS Anda telah ditolak', $messages[1]->getOriginalMessage()->getSubject());
        $this->assertStringContainsString('Dokumen sertifikat belum lengkap.', $messages[1]->getOriginalMessage()->getTextBody());
        $this->assertStringNotContainsString('/vendor/dashboard', $messages[1]->getOriginalMessage()->getHtmlBody());
    }

    public function test_invalid_or_repeated_decisions_do_not_send_another_email(): void
    {
        $this->actingAs($this->admin)->post(route('admin.vendors.reject', $this->vendor), [])
            ->assertSessionHasErrors('comment');
        $this->assertCount(0, Mail::mailer('array')->getSymfonyTransport()->messages());

        $this->post(route('admin.vendors.approve', $this->vendor))->assertSessionHas('success');
        $this->post(route('admin.vendors.approve', $this->vendor))->assertSessionHasErrors('status');
        $this->post(route('admin.vendors.reject', $this->vendor), ['comment' => 'Late rejection'])
            ->assertSessionHasErrors('status');

        $this->assertCount(1, Mail::mailer('array')->getSymfonyTransport()->messages());
    }

    public function test_vendor_cannot_trigger_a_decision_or_its_email_directly(): void
    {
        $this->actingAs($this->vendor->user)->post(route('admin.vendors.approve', $this->vendor))
            ->assertForbidden();

        $this->assertSame(Vendor::STATUS_SUBMITTED, $this->vendor->fresh()->status);
        $this->assertCount(0, Mail::mailer('array')->getSymfonyTransport()->messages());
    }

    public function test_outer_transaction_rollback_prevents_decision_email(): void
    {
        DB::beginTransaction();

        try {
            $this->actingAs($this->admin)->post(route('admin.vendors.approve', $this->vendor))
                ->assertSessionHas('success');
            $this->assertCount(0, Mail::mailer('array')->getSymfonyTransport()->messages());
        } finally {
            DB::rollBack();
        }

        $this->assertSame(Vendor::STATUS_SUBMITTED, $this->vendor->fresh()->status);
        $this->assertCount(0, Mail::mailer('array')->getSymfonyTransport()->messages());
    }

    public function test_mail_failure_does_not_misreport_a_successful_status_change_as_rolled_back(): void
    {
        $transport = Mockery::mock(TransportInterface::class);
        $transport->shouldReceive('send')->andThrow(new RuntimeException('Simulated transport failure'));
        Mail::mailer('array')->setSymfonyTransport($transport);

        $this->actingAs($this->admin)->post(route('admin.vendors.approve', $this->vendor))
            ->assertSessionHas('success')
            ->assertSessionHas('error', __('alerts.vendor_decision_mail_failed'));

        $this->assertSame(Vendor::STATUS_APPROVED, $this->vendor->fresh()->status);
    }
}
