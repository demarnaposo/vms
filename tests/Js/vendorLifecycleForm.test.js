import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { translateMessage } from '../../resources/js/i18n/translations.js';

const source = readFileSync(
    new URL('../../resources/js/Pages/Admin/Vendors/Show.jsx', import.meta.url),
    'utf8'
);

// Start Update 16 September 2026, by @WNP: Verify optional lifecycle comments have bilingual labels.
test('optional lifecycle comment label is localized', () => {
    assert.equal(translateMessage('en', 'Comment (Optional)'), 'Comment (Optional)');
    assert.equal(translateMessage('id', 'Comment (Optional)'), 'Komentar (Opsional)');
});

// Start Update 16 September 2026, by @WNP: Guard required actions and prevent duplicate manual asterisks.
test('vendor lifecycle comment requirement matches backend rules', () => {
    assert.match(
        source,
        /const isCommentRequired = \['reject', 'suspend', 'terminate', 'reactivate'\]\.includes/
    );
    assert.match(source, /label=\{isCommentRequired \? 'Comment' : 'Comment \(Optional\)'\}/);
    assert.match(source, /required=\{isCommentRequired\}/);
    assert.doesNotMatch(source, /label=(?:"[^"\n]*\*"|\{`[^`\n]*\*[^`\n]*`\})/);
});

// Start Update 16 September 2026, by @WNP: Guard evaluation and lifecycle actions against overlapping submissions.
test('vendor actions are disabled while evaluation or lifecycle requests are processing', () => {
    assert.match(source, /const evaluationForm = useForm\(\{\}\)/);
    assert.match(
        source,
        /const isVendorActionProcessing = actionForm\.processing \|\| evaluationForm\.processing/
    );
    assert.match(source, /const vendorActionInFlight = useRef\(false\)/);
    assert.match(
        source,
        /if \(!vendor\?\.id \|\| vendorActionInFlight\.current \|\| isVendorActionProcessing\) return/
    );
    assert.match(source, /vendorActionInFlight\.current = true/);
    assert.match(source, /onFinish: \(\) => \{\s*vendorActionInFlight\.current = false/);
    assert.match(source, /disabled=\{isVendorActionProcessing\}/);
    assert.match(source, /evaluationForm\.processing \? 'Evaluating\.\.\.' : 'Run Evaluation'/);
});
