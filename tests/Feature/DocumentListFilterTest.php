<?php

namespace Tests\Feature;

use App\Models\DocumentType;
use App\Models\Role;
use App\Models\User;
use App\Models\Vendor;
use App\Models\VendorDocument;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DocumentListFilterTest extends TestCase
{
    use RefreshDatabase;

    private function staff(string $role = 'ops_manager'): User
    {
        Role::firstOrCreate(['name' => $role], ['display_name' => $role]);
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    private function type(string $name, bool $active = true): DocumentType
    {
        return DocumentType::create(['name' => $name, 'display_name' => $name, 'is_active' => $active]);
    }

    private function document(DocumentType $type, string $status = 'pending', string $company = 'PPM Manajemen'): VendorDocument
    {
        return VendorDocument::create([
            'vendor_id' => Vendor::factory()->create(['company_name' => $company])->id,
            'document_type_id' => $type->id,
            'verification_status' => $status,
            'file_name' => 'sample.pdf',
            'file_path' => 'test/sample.pdf',
            'file_hash' => str_repeat('a', 64),
            'file_size' => 100,
            'mime_type' => 'application/pdf',
        ]);
    }

    public function test_type_status_and_search_are_combined_and_all_types_preserves_status(): void
    {
        $a = $this->type('custom_a');
        $b = $this->type('custom_b');
        $match = $this->document($a);
        $this->document($a, 'verified');
        $this->document($a, 'pending', 'Other Company');
        $this->document($b);
        $this->actingAs($this->staff());

        $this->get(route('admin.documents.index', ['document_type_id' => $a->id, 'status' => 'pending', 'search' => 'PPM']))
            ->assertOk()->assertInertia(fn (Assert $page) => $page
            ->has('documents.data', 1)->where('documents.data.0.id', $match->id));
        $this->get(route('admin.documents.index', ['document_type_id' => $a->id, 'status' => 'all']))
            ->assertOk()->assertInertia(fn (Assert $page) => $page->has('documents.data', 3));
        $this->get(route('admin.documents.index', ['status' => 'pending', 'search' => 'PPM']))
            ->assertOk()->assertInertia(fn (Assert $page) => $page->has('documents.data', 2));
    }

    public function test_inactive_historical_types_are_available_but_deleted_documents_do_not_supply_options(): void
    {
        $historical = $this->type('historical', false);
        $unused = $this->type('unused', false);
        $this->document($unused)->delete();
        $match = $this->document($historical);
        $this->actingAs($this->staff())->get(route('admin.documents.index', ['document_type_id' => $historical->id]))
            ->assertOk()->assertInertia(fn (Assert $page) => $page
            ->has('documentTypes', 1)->where('documentTypes.0.id', $historical->id)
            ->where('documentTypes.0.display_name', 'historical')
            ->has('documents.data', 1)->where('documents.data.0.id', $match->id));
    }

    public function test_pagination_preserves_combined_filters_and_empty_results_are_valid(): void
    {
        $type = $this->type('custom');
        for ($i = 0; $i < 16; $i++) {
            $this->document($type);
        }
        $params = ['document_type_id' => $type->id, 'status' => 'pending', 'search' => 'PPM'];
        $this->actingAs($this->staff())->get(route('admin.documents.index', $params + ['page' => 2]))
            ->assertOk()->assertInertia(function (Assert $page) use ($params) {
                $page->has('documents.data', 1)->where('documents.current_page', 2)
                    ->where('documents.prev_page_url', function ($url) use ($params) {
                        parse_str(parse_url($url, PHP_URL_QUERY), $query);

                        return $query == $params + ['page' => '1'];
                    });
            });
        $this->get(route('admin.documents.index', ['document_type_id' => $type->id, 'status' => 'rejected']))
            ->assertOk()->assertInertia(fn (Assert $page) => $page->has('documents.data', 0));
        $this->get(route('admin.documents.index'))->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('currentStatus', 'pending')->has('filters', 0));
    }

    public function test_invalid_filter_values_return_validation_errors(): void
    {
        $this->actingAs($this->staff());
        foreach (['abc', '999999', ['1']] as $value) {
            $this->getJson(route('admin.documents.index', ['document_type_id' => $value]))
                ->assertUnprocessable()->assertJsonValidationErrors('document_type_id');
        }
        $this->getJson(route('admin.documents.index', ['status' => ['pending']]))
            ->assertUnprocessable()->assertJsonValidationErrors('status');
    }

    public function test_filter_does_not_grant_access_to_unauthorized_staff(): void
    {
        $type = $this->type('custom');
        $this->document($type);
        $this->actingAs($this->staff('finance_manager'))
            ->get(route('admin.documents.index', ['document_type_id' => $type->id, 'status' => 'all']))
            ->assertForbidden();
    }
}
