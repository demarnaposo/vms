<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveVendorCategoryRequest;
use App\Models\VendorCategory;
use App\Services\VendorCategoryService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VendorCategoryController extends Controller
{
    public function index(Request $request, VendorCategoryService $service): Response
    {
        abort_unless($request->user()?->isSuperAdmin(), 403);

        return Inertia::render('Admin/VendorCategories/Index', [
            'categories' => VendorCategory::query()->withCount('vendors')->ordered()->get()->map(fn ($category) => [...$category->toArray(), 'in_use' => $service->referenced($category)]),
        ]);
    }

    public function store(SaveVendorCategoryRequest $request, VendorCategoryService $service): RedirectResponse
    {
        $service->save($request->validated(), $request->user());

        return back()->with('success', 'Vendor category created.');
    }

    public function update(SaveVendorCategoryRequest $request, VendorCategory $vendorCategory, VendorCategoryService $service): RedirectResponse
    {
        $service->save($request->validated(), $request->user(), $vendorCategory);

        return back()->with('success', 'Vendor category updated.');
    }

    public function destroy(Request $request, VendorCategory $vendorCategory, VendorCategoryService $service): RedirectResponse
    {
        if (! $service->delete($vendorCategory, $request->user())) {
            return back()->withErrors(['category' => 'This category is in use. Deactivate it instead.']);
        }

        return back()->with('success', 'Vendor category deleted.');
    }
}
