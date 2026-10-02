# Agent Guidelines for VMS

This document applies to the entire VMS (Vendor Management System) repository. Before working on a file, read any applicable instructions in its parent subdirectories; more specific instructions take precedence within their scope. The user's latest request takes precedence if it conflicts with this guide, subject to system and developer instructions and tool permissions.

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
- Use the existing Composer and npm dependencies and lockfiles. Before adding packages or upgrading dependencies, explain why the change is needed, perform a dry-run where supported, and obtain explicit user approval unless the current request already authorizes that dependency change. Do not change dependencies or lockfiles merely to complete an unrelated task.
- For production use, prefer an actively supported LTS version when the package or runtime provides one; otherwise, choose an actively maintained stable release compatible with the project's PHP, Laravel, Node.js, React, and other dependency requirements. Verify release status, support status, and compatibility in official documentation before recommending or installing a version. Do not select deprecated or unsupported releases, or alpha, beta, RC, nightly, dev, or other prerelease versions unless the user explicitly authorizes the exception. Do not assume that the newest major release is the appropriate production choice.
- Before substantive implementation or review work, inspect `.agents/skills` and read the complete `SKILL.md` for every skill relevant to the request. Apply those instructions throughout the task rather than treating them as optional references.
- If a relevant skill is missing or unreadable, report the exact path and limitation. Continue work that does not depend on it; if it is necessary to complete the request, report the blocked portion rather than claiming the skill was applied.
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

- Do not run standalone migration, seeding, reset, wipe, or other data-changing commands against application databases. This includes `php artisan migrate`, `migrate:fresh`, `migrate:refresh`, and `db:wipe`. If a schema change is required, create a safe migration, check its syntax, and remind the user to run it manually.
- Do not run `composer setup`: its current script runs `php artisan migrate --force`. Inspect other setup or wrapper scripts before execution; do not assume they are safe based on their names.
- Tests may create schema and write data only inside a confirmed isolated test database. Before running any database-writing test, including tests using `RefreshDatabase`, verify the effective database connection and database name after Laravel boots and before test writes begin. If isolation cannot be confirmed, do not run the test and report why.
- The current `phpunit.xml` and `tests/TestCase.php` configure SQLite `:memory:`, array cache/session/mail, and a sync queue. Confirm those effective settings rather than relying only on the files: cached Laravel configuration can override environment settings. Use an uncached test configuration, for example by setting `APP_CONFIG_CACHE` to a nonexistent temporary path, without deleting or modifying the application's cached configuration. Never use the local application, QA, or production database for tests that write data.

## Verification and result reporting standards

- For every UI change, preserve responsive behavior on mobile, tablet, and desktop using the existing Tailwind breakpoints and shared components. Check narrow and wide viewports, long content, and both English and Indonesian text. Forms, navigation, dialogs, tables, and action controls must remain readable and usable with touch and keyboard; prevent unintended page-level horizontal scrolling and use contained scrolling where wide tables require it.
- Target cross-browser compatibility on supported stable Chrome, Edge, Firefox, and Safari, including Chrome on Android and Safari on iOS. Use standards-based HTML, CSS, and JavaScript compatible with the existing Vite and Tailwind configuration. Verify support for newly introduced browser features and provide a fallback when required; avoid browser-specific behavior that breaks core flows. If the request requires older browser versions, establish their compatibility with the project's current framework and build targets before implementation.
- For UI verification, check the affected flow at representative mobile, tablet, and desktop sizes and across the target browsers available in the environment. Report the browsers, versions, and viewport sizes actually tested, and identify any targets that could not be tested. A successful build or Dusk run in one browser does not prove compatibility with all browsers; do not claim universal browser support without evidence.
- Verify changes proportionally and begin with checks for the changed files and affected behavior:
  - PHP: run `php -l <changed-file.php>` and `vendor/bin/pint --test <changed-file-or-directory>`. Run relevant tests with `vendor/bin/phpunit tests/Unit/<test>.php` or `vendor/bin/phpunit tests/Feature/<test>.php`, after the required database-isolation checks.
  - JS/JSX: run `npx prettier --check <changed-file>` and `npm run lint`. For focused linting, use `npx eslint <changed-file.js-or-jsx>`; state whether focused or full lint was run. Do not use `npm run format` for a narrow change: it rewrites all of `resources/js`.
  - Frontend tests: run relevant files with `node --test tests/Js/<test>.test.js`; use `node --test tests/Js/*.test.js` when broader coverage is warranted. There is currently no `npm test` script.
  - UI changes: run `npm run build`. Run relevant Dusk tests only after verifying browser-test database isolation; do not assume PHPUnit's in-memory settings also isolate the running browser application.
  - Documentation-only changes: check the content, referenced paths or commands, and `git diff --check`; application tests and builds are not required unless application behavior also changed.
- Run `git diff --check` at the end. Preserve unrelated worktree changes, and distinguish pre-existing failures from failures caused by this task. Do not fix unrelated failures without authorization or claim checks passed when they were skipped or blocked.
- Report the files changed, behavior corrected, tests actually run, tests not run and the reasons why, and any manual steps required from the user.
