<?php

namespace App\Services;

use App\Models\DocumentType;
use App\Models\VendorDocument;
use Illuminate\Support\Facades\DB;

class DocumentTypeUsage
{
    public function exists(DocumentType $type): bool
    {
        if (VendorDocument::withTrashed()->where('document_type_id', $type->id)->exists()) {
            return true;
        }
        foreach (['vendor_applications' => 'data', 'compliance_rules' => 'conditions', 'compliance_results' => 'metadata', 'compliance_flags' => 'metadata'] as $table => $column) {
            foreach (DB::table($table)->select(['id', $column])->orderBy('id')->cursor() as $row) {
                $value = $row->$column;
                $data = is_string($value) ? json_decode($value, true) : $value;
                // Unknown JSON must be repaired explicitly before deleting master data.
                if ($value !== null && $data === null && $value !== 'null') {
                    return true;
                }
                if ($this->references((array) $data, $type, $table)) {
                    return true;
                }
            }
        }

        return false;
    }

    private function references(array $data, DocumentType $type, string $table): bool
    {
        foreach ($data as $key => $value) {
            if (in_array($key, ['document_type_id', 'document_type_ids'], true)
                || ($key === 'missing_document_ids' && in_array($table, ['compliance_results', 'compliance_flags'], true))) {
                if (in_array((string) $type->id, array_map('strval', (array) $value), true)) {
                    return true;
                }
            }
            if (in_array($key, ['document_type_name', 'document_type_names'], true) && in_array($type->name, (array) $value, true)) {
                return true;
            }
            if (is_array($value) && $this->references($value, $type, $table)) {
                return true;
            }
        }

        return false;
    }
}
