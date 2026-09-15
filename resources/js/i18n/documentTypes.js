// Start Update 15 September 2026, by @WNP: Reuse the shared VMS master-data resolver for document types.
import { translateSystemMasterDataField } from './systemMasterData.js';

// Start Update 15 September 2026, by @WNP: Translate master document labels while preserving custom database entries verbatim.
export function translateDocumentTypeLabel(language, documentType, fallback = '') {
    return translateSystemMasterDataField(
        language,
        'document_types',
        documentType,
        'display_name',
        fallback
    );
}

// Start Update 15 September 2026, by @WNP: Translate only descriptions belonging to fixed master document types.
export function translateDocumentTypeDescription(language, documentType) {
    return translateSystemMasterDataField(language, 'document_types', documentType, 'description');
}
