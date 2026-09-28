<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveVendorCategoryRequest;
use App\Models\VendorApplication;
use App\Models\VendorCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class VendorCategoryController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/VendorCategories/Index', [
            'categories' => VendorCategory::query()->withCount('vendors')->orderBy('display_name')->get(),
        ]);
    }

    public function store(SaveVendorCategoryRequest $request): RedirectResponse
    {
        VendorCategory::create($request->validated());

        return back()->with('success', 'Vendor category created.');
    }

    public function update(SaveVendorCategoryRequest $request, VendorCategory $vendorCategory): RedirectResponse
    {
        $vendorCategory->update($request->validated());

        return back()->with('success', 'Vendor category updated.');
    }

    public function destroy(VendorCategory $vendorCategory): RedirectResponse
    {
        return DB::transaction(function () use ($vendorCategory): RedirectResponse {
            $vendorCategory = VendorCategory::query()->lockForUpdate()->findOrFail($vendorCategory->id);
            $usedInDraft = VendorApplication::query()
                ->where('data->step1->category_id', $vendorCategory->id)
                ->orWhere('data->step1->category', $vendorCategory->code)
                ->exists();

            if ($vendorCategory->vendors()->withTrashed()->exists() || $usedInDraft) {
                return back()->withErrors(['category' => 'This category is in use. Deactivate it instead.']);
            }

            $vendorCategory->delete();

            return back()->with('success', 'Vendor category deleted.');
        });
    }
}
