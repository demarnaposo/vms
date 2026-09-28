# Agent Guidelines for VMS

This document applies to the entire VMS (Vendor Management System) repository. Read any more specific instructions in subdirectories when present. The user's latest request takes precedence if it conflicts with this guide.

## Project context

- Backend: PHP 8.2+, Laravel 12, Inertia.js 2. Frontend: React 19, Vite, Tailwind CSS 4.
- Routes are defined in `routes/web.php`; controllers and Form Requests are in `app/Http`; business rules are in `app/Services`; policies and middleware handle authorization.
- Inertia pages are in `resources/js/Pages`, shared components are in `resources/js/Components`, and frontend utilities are in `resources/js/utils`.
- Built-in master data is in `database/data/system_master_data.php`. Migrations, factories, and seeders are in `database/`.
- PHP tests are in `tests/Unit` and `tests/Feature`; Laravel Dusk browser tests are in `tests/Browser`; Node-based frontend tests are in `tests/Js`.

## Working practices and scope boundaries

- Before changing code, check `git status` and inspect the code path actually in use. The worktree may contain user changes; preserve all unrelated changes.
- Limit changes to the user's request. Do not perform broad refactors, alter unrelated business logic, or change historical data without a clear need.
- Never add `Start Update`, `End Update`, `@WNP`, or similar change-history markers. Add comments only when they explain a non-obvious reason or behavior of the code; do not use comments to record dates, authors, or edit history.
- Record every feature, fix, configuration change, or documentation change actually made in `CHANGELOG.md` as part of the same task. Add a brief `YYYY-MM-DD` entry under the appropriate `[Unreleased]` category. Do not invent older history, describe planned work as completed, or record review activity that made no changes.
- Use `VMS` or `Vendor Management System` for the product name in interface text, new documentation, and new comments. Do not reintroduce the previous product name or unnecessary country references. Do not mass-rename legacy technical identifiers when doing so could break routes, databases, integrations, or history.
- Follow the repository's existing `.editorconfig`, `.prettierrc`, ESLint, and Laravel Pint configuration. Do not manually edit generated files in `public/build`.
- Before substantive implementation or review work, inspect `.agents/skills` and read the complete `SKILL.md` for every skill relevant to the request. Apply those instructions throughout the task rather than treating them as optional references.
- For React work, always apply `.agents/skills/vercel-react-best-practices/SKILL.md`. Also apply `vercel-composition-patterns` when designing or refactoring component APIs, shared component composition, context providers, render props, or components with proliferating boolean props.
- For UI, UX, design, or accessibility reviews, apply `.agents/skills/web-design-guidelines/SKILL.md`. Use only the skills relevant to the current scope and do not broaden the requested change merely to satisfy unrelated guidance.

## Language, i18n, master data, and currency conventions

- The interface supports English (`en`) and Indonesian (`id`). Use English for static source text and add its Indonesian equivalent in `resources/js/i18n/translations.js` or `lang/id`, depending on where the text is produced.
- In React, use `useLanguage()` and `t(...)` for static text. Also check alerts, errors, validation messages, modals, buttons, placeholders, and empty states. Some shared components already translate `title` or `children`; inspect their implementation before adding another `t(...)` call.
- Keep form placeholders consistent across a flow. Manual-entry fields use concise, field-specific examples prefixed with `e.g.,` in English and lowercase `contoh:` in Indonesian. Selects and other choice controls use instructional placeholders such as `Select...` / `Pilih...` without examples. Use PPM Manajemen as the example organization wherever an organization identity is semantically relevant. Use suitable fictional values for people, banks, account numbers, legal identifiers, and other fields where the organization name would be misleading or sensitive.
- Do not translate vendor names, comments, notes, messages, or other manual database input. Keep stored enum values and codes stable; translate only their display labels.
- Fixed `system_master_data` records may be translated by known category and key through `resources/js/i18n/systemMasterData.js`. Display custom or unknown records unchanged.
- Store language preferences using the existing VMS keys (`vms_locale` and `vms.preferences.v1`); do not create new keys using the previous product name.
- The default currency is IDR/Rp. Use `config/currency.php`, `App\Support\Currency`, and `resources/js/utils/currencyFormatters.js`; do not hardcode monetary formatting in pages.
- Preserve the established official terminology and validation formats for business, tax, bank, and contact fields. Do not change stored values merely to translate a label.

## Business flows, security, and historical data preservation

- For changes to vendor, compliance, document, performance, or payment actions, trace the flow from the UI through routes, validation, policies, services, and responses. Show both success and failure outcomes to the user.
- Do not rely only on hiding an option in the UI: server-side validation and authorization must still reject invalid or unauthorized input.
- Distinguish current status from history. An inactive rule must not count as a current compliance failure; preserve historical evaluation results and immutable audit trails.
- Keep sensitive data such as identity details, bank information, and credentials out of unnecessary logs, audit payloads, and test output. Do not expose `.env` contents or secrets.

## Prohibited automatic database operations

- Do not run `php artisan migrate`, `migrate:fresh`, `migrate:refresh`, `db:wipe`, seeders, or any other command that automatically changes data. If a schema change is required, create a safe migration, check its syntax, and remind the user to run it manually.
- Do not run `composer setup`: that script runs migrations. Before running a feature test that uses `RefreshDatabase`, confirm that it targets an isolated test database. If this cannot be confirmed, do not run the test and report why.
- If cached configuration directs tests to a local non-test database, use uncached test configuration and verify the target before running tests. Never use a QA or production database for tests that write data.

## Verification and result reporting standards

- Verify changes proportionally: use `php -l` and `vendor/bin/pint --test` for PHP; `npx prettier --check` and `npm run lint` for JS/JSX; `node --test tests/Js/*.test.js` for frontend tests; relevant PHP or Dusk tests when the test environment is safe; `npm run build` when the UI changes; and `git diff --check` at the end.
- Report the files changed, behavior corrected, tests actually run, tests not run and the reasons why, and any manual steps required from the user.
