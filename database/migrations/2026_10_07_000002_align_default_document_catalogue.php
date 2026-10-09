<?php

use App\Models\DocumentType;
use App\Services\DocumentTypeUsage;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const OBSOLETE_CODES = [
        'company_registration', 'bank_account_proof', 'insurance', 'nda',
        'service_agreement', 'experience_portfolio', 'business_license', 'bank_account_letter',
    ];

    private const PREVIOUS_LABELS = [
        'company_deed' => 'Company Deed of Establishment',
        'nib_oss' => 'Business Identification Number (NIB) Document',
        'npwp' => 'Taxpayer Identification Number (NPWP) Document',
        'pkp_certificate' => 'PKP Certificate (if applicable)',
        'pic_identity_card' => 'PIC Identity Card (KTP)',
        'domicile_letter' => 'Company Domicile Letter',
    ];

    public function up(): void
    {
        DB::transaction(function (): void {
            $types = DocumentType::query()->orderBy('id')->lockForUpdate()->get()->keyBy('name');
            // Leave an empty installation to the normal one-time seeder bootstrap.
            if ($types->isEmpty()) {
                return;
            }
            $obsolete = $types->filter(fn ($type) => in_array($type->name, self::OBSOLETE_CODES, true));
            $usage = app(DocumentTypeUsage::class);
            $blocked = $obsolete->filter(fn ($type) => $usage->exists($type))->keys();
            if ($blocked->isNotEmpty()) {
                throw new RuntimeException('Document catalogue alignment aborted: referenced legacy types: '.$blocked->implode(', ').'. Preserve their documents, drafts and history; resolve manually before retrying.');
            }

            // Every reference check completes before any catalogue data is changed.
            DB::table('document_types')->whereIn('id', $obsolete->pluck('id'))->delete();
            $baseline = require database_path('data/system_master_data.php');
            foreach ($baseline['document_types'] as $definition) {
                $existing = $types->get($definition['name']);
                if (! $existing) {
                    $definition['allowed_extensions'] = json_encode($definition['allowed_extensions'], JSON_THROW_ON_ERROR);
                    DB::table('document_types')->insert($definition + ['created_at' => now(), 'updated_at' => now()]);

                    continue;
                }
                $changes = ['sort_order' => $definition['sort_order']];
                if ($existing->display_name === (self::PREVIOUS_LABELS[$existing->name] ?? $definition['display_name'])) {
                    $changes['display_name'] = $definition['display_name'];
                }
                DB::table('document_types')->where('id', $existing->id)->update($changes);
            }
            DB::afterCommit(fn () => Cache::forget('document_types_active'));
        });
    }

    public function down(): void
    {
        throw new RuntimeException('Document catalogue rollback requires a data-preserving review; automatic restoration is disabled.');
    }
};
