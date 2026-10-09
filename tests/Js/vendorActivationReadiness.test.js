import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { translateMessage } from '../../resources/js/i18n/translations.js';

const source = readFileSync(
    new URL('../../resources/js/Pages/Admin/Vendors/Show.jsx', import.meta.url),
    'utf8'
);

test('activation button uses backend readiness instead of rebuilding eligibility in JSX', () => {
    assert.match(source, /activationReadiness\.allowed === true/);
    assert.match(source, /disabled=\{!isReadyForActivation \|\| isVendorActionProcessing\}/);
    assert.doesNotMatch(
        source,
        /allMandatoryDocsVerified && vendor\?\.compliance_status === 'compliant'/
    );
});

test('disabled activation uses the shared accessible explanation and prioritizes pending', () => {
    const tooltip = readFileSync(
        new URL('../../resources/js/Components/DisabledActionTooltip.jsx', import.meta.url),
        'utf8'
    );
    assert.match(source, /disabledReason=/);
    assert.match(source, /isVendorActionProcessing \? \(/);
    assert.match(tooltip, /createPortal\(/);
    assert.match(tooltip, /document\.body/);
    assert.match(tooltip, /role="tooltip"/);
    assert.match(tooltip, /tabIndex=\{0\}/);
    assert.match(tooltip, /aria-describedby=\{tooltipId\}/);
    assert.match(tooltip, /onFocus=\{show\}/);
    assert.match(tooltip, /data-placement=\{position\.placement\}/);
});

test('activation readiness reasons have Indonesian translations', () => {
    const messages = [
        'Activation requirements',
        'All mandatory documents must be verified and valid before activation.',
        'The vendor must be compliant with a score of at least :score before activation.',
        'Resolve all open compliance issues before activation.',
    ];

    for (const message of messages) {
        assert.notEqual(translateMessage('id', message, { score: 80 }), message);
    }
});
