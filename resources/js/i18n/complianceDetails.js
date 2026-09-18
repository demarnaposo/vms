import { SYSTEM_MASTER_DATA } from './systemMasterData.js';
import { translateMessage } from './translations.js';

// Start Update 16 September 2026, by @WNP: Resolve only fixed document master labels embedded in automatic compliance details.
const DOCUMENT_LABELS = new Map(
    Object.values(SYSTEM_MASTER_DATA.document_types).map((definition) => [
        definition.display_name,
        definition.display_name,
    ])
);

// Start Update 16 September 2026, by @WNP: Normalize legacy automatic document labels to the complete identifier labels.
DOCUMENT_LABELS.set('NPWP Document', 'Taxpayer Identification Number (NPWP) Document');
DOCUMENT_LABELS.set('NIB Document', 'Business Identification Number (NIB) Document');

const translateDocumentList = (language, documentList) =>
    documentList
        .split(',')
        .map((label) => label.trim())
        .map((label) =>
            DOCUMENT_LABELS.has(label)
                ? translateMessage(language, DOCUMENT_LABELS.get(label))
                : label
        )
        .join(', ');

// Start Update 16 September 2026, by @WNP: Translate known system-generated result patterns and preserve unknown database details verbatim.
export function translateComplianceDetails(language, rule, details) {
    if (typeof details !== 'string' || !rule?.name) return details;

    if (rule.name === 'mandatory_documents') {
        if (details === 'All mandatory documents are verified.') {
            return translateMessage(language, details);
        }

        const prefix = 'Missing mandatory documents: ';
        if (details.startsWith(prefix) && details.length > prefix.length) {
            return translateMessage(language, 'Missing mandatory documents: :documents', {
                documents: translateDocumentList(language, details.slice(prefix.length)),
            });
        }
    }

    if (rule.name === 'document_expiry_check') {
        if (details === 'No document expiry issues.') {
            return translateMessage(language, details);
        }

        const patterns = [
            ['Expired documents: ', 'Expired documents: :documents'],
            ['Documents expiring soon: ', 'Documents expiring soon: :documents'],
        ];

        for (const [prefix, message] of patterns) {
            if (details.startsWith(prefix) && details.length > prefix.length) {
                return translateMessage(language, message, {
                    documents: translateDocumentList(language, details.slice(prefix.length)),
                });
            }
        }
    }

    if (rule.name === 'minimum_performance') {
        const performanceMatch = details.match(
            /^Performance score \(([^)]+)\) (meets|below) threshold \(([^)]+)\)\.$/
        );

        if (performanceMatch) {
            const [, score, comparison, threshold] = performanceMatch;
            const message =
                comparison === 'meets'
                    ? 'Performance score (:score) meets threshold (:threshold).'
                    : 'Performance score (:score) below threshold (:threshold).';

            return translateMessage(language, message, { score, threshold });
        }
    }

    return details;
}
