import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { translateMessage } from '../../resources/js/i18n/translations.js';

const readProjectFile = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('application metadata and the global Inertia title use VMS', () => {
    assert.match(readProjectFile('.env.example'), /^APP_NAME=VMS$/m);
    assert.match(readProjectFile('config/app.php'), /env\('APP_NAME', 'VMS'\)/);
    assert.match(readProjectFile('resources/views/app.blade.php'), /<title inertia>VMS<\/title>/);
    assert.match(
        readProjectFile('resources/js/app.jsx'),
        /title: \(title\) => \(title \? `\$\{title\} - VMS` : 'VMS'\)/
    );
});

test('documented and display-oriented metadata use the canonical product identity', () => {
    const readme = readProjectFile('README.md');
    const composer = JSON.parse(readProjectFile('composer.json'));
    const command = readProjectFile('app/Console/Commands/VerifyVendorFlowFeatures.php');

    assert.match(readme, /^# VMS \(Vendor Management System\)$/m);
    assert.match(composer.description, /^VMS \(Vendor Management System\)/);
    assert.match(
        readProjectFile('resources/views/welcome.blade.php'),
        /config\('app\.name', 'VMS'\)/
    );
    assert.match(command, /protected \$description = 'Verify implemented VMS features';/);
    assert.doesNotMatch(command, /description = '.*VendorFlow/i);
});

test('contextual browser titles remain bilingual and receive one global VMS suffix', () => {
    const examples = [
        ['Dashboard', 'Dashboard', 'Dasbor'],
        ['About', 'About', 'Tentang'],
        ['Contact', 'Contact', 'Kontak'],
        ['Clean Vendor Operations', 'Clean Vendor Operations', 'Operasional Vendor yang Rapi'],
        ['Privacy Policy', 'Privacy Policy', 'Kebijakan Privasi'],
        ['Terms of Service', 'Terms of Service', 'Ketentuan Layanan'],
    ];

    for (const [source, english, indonesian] of examples) {
        assert.equal(`${translateMessage('en', source)} - VMS`, `${english} - VMS`);
        assert.equal(`${translateMessage('id', source)} - VMS`, `${indonesian} - VMS`);
    }

    const titleSources = [
        'resources/js/Components/GuestLayout.jsx',
        'resources/js/Pages/About.jsx',
        'resources/js/Pages/Contact.jsx',
        'resources/js/Pages/Welcome.jsx',
        'resources/js/Pages/Privacy.jsx',
        'resources/js/Pages/Terms.jsx',
        'resources/js/Pages/Auth/ForgotPassword.jsx',
        'resources/js/Pages/Auth/Login.jsx',
        'resources/js/Pages/Auth/Register.jsx',
        'resources/js/Pages/Auth/ResetPassword.jsx',
        'resources/js/Pages/Auth/VerifyEmail.jsx',
    ].map(readProjectFile);

    for (const source of titleSources) {
        assert.doesNotMatch(source, /VendorFlow/);
        assert.doesNotMatch(source, /(?:Head|GuestLayout) title=.*- VMS/);
    }

    assert.match(titleSources[0], /<Head title=\{t\(title\)\} \/>/);
});
