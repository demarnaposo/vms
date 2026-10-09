<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveBusinessTypeRequest;
use App\Models\BusinessType;
use App\Services\BusinessTypeService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BusinessTypeController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()?->isSuperAdmin(), 403);
        $filters = $request->validate(['search' => ['nullable', 'string', 'max:255']]);
        $search = trim($filters['search'] ?? '');

        return Inertia::render('Admin/BusinessTypes/Index', [
            'types' => BusinessType::query()->withCount('vendors')
                ->when($search !== '', fn ($query) => $query->where(fn ($query) => $query
                    ->where('code', 'like', '%'.$search.'%')->orWhere('display_name', 'like', '%'.$search.'%')))
                ->orderBy('display_name')->orderBy('id')->paginate(10)->withQueryString(),
            'filters' => ['search' => $search],
        ]);
    }

    public function store(SaveBusinessTypeRequest $request, BusinessTypeService $service): RedirectResponse
    {
        $service->save($request->validated(), $request->user());

        return back()->with('success', 'Business type added.');
    }

    public function update(SaveBusinessTypeRequest $request, BusinessType $businessType, BusinessTypeService $service): RedirectResponse
    {
        $service->save($request->validated(), $request->user(), $businessType);

        return back()->with('success', 'Business type updated.');
    }

    public function destroy(Request $request, BusinessType $businessType, BusinessTypeService $service): RedirectResponse
    {
        if (! $service->delete($businessType, $request->user())) {
            return back()->with('error', 'This business type is used by vendors, applications or history. Deactivate it instead.');
        }

        return back()->with('success', 'Business type deleted.');
    }
}
