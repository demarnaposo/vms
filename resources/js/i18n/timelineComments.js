import { translateMessage } from './translations.js';

// Start Update 13 September 2026, by @WNP: Identify only known application-generated history comments and their transitions.
const AUTOMATIC_COMMENTS = new Map([
    ['Vendor application submitted for review', { statuses: ['submitted'], reasonCode: null }],
    [
        'Vendor approved and activated',
        { statuses: ['under_review', 'approved', 'active'], reasonCode: null },
    ],
    ['Vendor approved', { statuses: ['under_review', 'approved'], reasonCode: null }],
    ['Vendor moved to review before rejection', { statuses: ['under_review'], reasonCode: null }],
    ['Vendor activated', { statuses: ['active'], reasonCode: null }],
    [
        'Admin reviewed termination appeal and restored access.',
        { statuses: ['under_review'], reasonCode: 'APPEAL_APPROVED' },
    ],
]);

// Start Update 13 September 2026, by @WNP: Translate only exact system-comment matches; preserve user-authored history verbatim.
export function translateTimelineComment(language, log) {
    const comment = log?.comment;
    if (typeof comment !== 'string') return comment;

    // Start Update 13 September 2026, by @WNP: Never translate comments explicitly marked as user-authored in new logs.
    const commentSource = log.metadata?.comment_source;
    if (commentSource && commentSource !== 'system') return comment;

    const rule = AUTOMATIC_COMMENTS.get(comment);
    if (!rule || !rule.statuses.includes(log.to_status) || log.reason_code !== rule.reasonCode) {
        return comment;
    }

    return translateMessage(language, comment);
}
