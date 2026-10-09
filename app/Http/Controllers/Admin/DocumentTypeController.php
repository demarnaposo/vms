<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveDocumentTypeRequest;
use App\Models\DocumentType;
use App\Services\DocumentTypeUsage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DocumentTypeController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/DocumentTypes/Index', [
            'documentTypes' => DocumentType::query()->withCount(['documents' => fn ($query) => $query->withTrashed()])->ordered()->get(),
        ]);
    }

    public function store(SaveDocumentTypeRequest $request): RedirectResponse
    {
        DB::transaction(fn () => DocumentType::create($request->validated()));

        return back()->with('success', 'Document type created.');
    }

    public function update(SaveDocumentTypeRequest $request, DocumentType $documentType): RedirectResponse
    {
        DB::transaction(fn () => $documentType->update($request->validated()));

        return back()->with('success', 'Document type updated.');
    }

    public function destroy(DocumentType $documentType, DocumentTypeUsage $usage): RedirectResponse
    {
        return DB::transaction(function () use ($documentType, $usage): RedirectResponse {
            $type = DocumentType::query()->lockForUpdate()->findOrFail($documentType->id);
            if ($usage->exists($type)) {
                return back()->withErrors(['document_type' => 'This document type is in use. Deactivate it instead.']);
            }
            $type->delete();

            return back()->with('success', 'Document type deleted.');
        });
    }
}
