import test from 'node:test';
import assert from 'node:assert/strict';
import { translateTimelineComment } from '../../resources/js/i18n/timelineComments.js';

// Start Update 13 September 2026, by @WNP: Verify known automatic comments translate without modifying source log values.
test('translates automatic vendor timeline comments in Indonesian', () => {
    const examples = [
        [
            'Vendor application submitted for review',
            'submitted',
            'Pengajuan vendor dikirim untuk ditinjau',
        ],
        ['Vendor approved and activated', 'active', 'Vendor disetujui dan diaktifkan'],
        ['Vendor approved', 'approved', 'Vendor disetujui'],
        [
            'Vendor moved to review before rejection',
            'under_review',
            'Vendor dipindahkan ke peninjauan sebelum ditolak',
        ],
        ['Vendor activated', 'active', 'Vendor diaktifkan'],
    ];

    for (const [comment, to_status, translated] of examples) {
        const log = {
            comment,
            to_status,
            reason_code: null,
            metadata: { comment_source: 'system' },
        };
        assert.equal(translateTimelineComment('id', log), translated);
        assert.equal(log.comment, comment);
        assert.equal(translateTimelineComment('en', log), comment);
    }

    // Start Update 13 September 2026, by @WNP: Support legacy automatic logs that predate source metadata.
    assert.equal(
        translateTimelineComment('id', {
            comment: 'Vendor approved',
            to_status: 'approved',
            reason_code: null,
        }),
        'Vendor disetujui'
    );
});

// Start Update 13 September 2026, by @WNP: Keep manual comments verbatim even when their wording resembles a system comment.
test('preserves free-text and nonmatching timeline comments', () => {
    assert.equal(
        translateTimelineComment('id', {
            comment: 'Approved after discussing the contract',
            to_status: 'approved',
            reason_code: null,
        }),
        'Approved after discussing the contract'
    );
    assert.equal(
        translateTimelineComment('id', {
            comment: 'Vendor approved',
            to_status: 'suspended',
            reason_code: null,
        }),
        'Vendor approved'
    );
    assert.equal(
        translateTimelineComment('id', {
            comment: 'Vendor approved',
            to_status: 'approved',
            reason_code: 'MANUAL_NOTE',
        }),
        'Vendor approved'
    );
    // Start Update 13 September 2026, by @WNP: A user-entered exact match must not be mistaken for a system comment.
    assert.equal(
        translateTimelineComment('id', {
            comment: 'Vendor approved',
            to_status: 'approved',
            reason_code: null,
            metadata: { comment_source: 'user' },
        }),
        'Vendor approved'
    );
});

// Start Update 13 September 2026, by @WNP: Require the existing appeal reason code for command-generated history text.
test('distinguishes automatic appeal text from an ordinary comment', () => {
    const comment = 'Admin reviewed termination appeal and restored access.';

    assert.equal(
        translateTimelineComment('id', {
            comment,
            to_status: 'under_review',
            reason_code: 'APPEAL_APPROVED',
            metadata: { comment_source: 'system' },
        }),
        'Admin meninjau banding penghentian dan memulihkan akses.'
    );
    assert.equal(
        translateTimelineComment('id', {
            comment,
            to_status: 'under_review',
            reason_code: null,
            metadata: { comment_source: 'user' },
        }),
        comment
    );
});
