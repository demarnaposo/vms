# VMS Changelog

The VMS (Vendor Management System) changelog starts on 2026-09-18. Changes before this date are not reconstructed without verification. Add new entries to `[Unreleased]` under `Added`, `Changed`, `Fixed`, `Removed`, or `Security`; move them to a release version only when that release is actually created.

## [Unreleased]

### Changed

- 2026-10-09 — Restricted VMS themes to Ocean and Midnight across the selector, storage, DOM application and both initial HTML bootstraps; normalized removed/unknown preferences to Ocean without resetting other settings and removed unused theme options, descriptions and CSS; documented the two-theme preference policy in README.

- 2026-10-09 — Removed the active profile tab underline while retaining sidebar gradients, active ring and accessible pressed state.

- 2026-10-09 — Matched profile section tabs to the existing sidebar hover/active gradient and shadow behavior, retaining a neutral inactive state and the danger palette for Danger Zone.

- 2026-10-09 — Standardized profile actions and deletion dialog buttons on compact shared ActionButton variants; applied theme/danger gradients to all three section triggers with pressed state, active underline/ring and responsive wrapping.

- 2026-10-09 — Left-aligned vendor overview information and compliance status in consistent responsive columns; replaced the inline category description with the existing accessible category tooltip while preserving master translations and custom content.

- 2026-10-09 — Aligned all three admin dashboard View All card links with the existing 36px outline ActionLink navigation style; retained the primary View All Vendors header action, translations, destination filters, permissions and payment feature flag.

- 2026-10-08 — Restored the original performance slider initial value of 3/4 and native change behavior as requested; retained only the new integer range 1–4 and backend bounds.

- 2026-10-08 — Removed the visible unselected-score wording from the performance slider; show its score value only after interaction while retaining empty submission state and accessible state information.

- 2026-10-08 — Restored the existing performance rating slider appearance with integer steps 1–4; retained unselected form state until pointer/keyboard interaction and existing backend validation.

- 2026-10-08 — Restricted new performance ratings to integer scores 1–4, removed automatic score defaults while retaining the existing rating slider, localized scale guidance, and distinguished unrated metrics from historical zero values; retained six baseline weights, percentage normalization, thresholds and immutable historical snapshots, with documented caller/rule verification.

- 2026-10-08 — Localized document verification/rejection Sonner outcomes in the active UI language using stable message templates and document master keys, including Company Profile; preserved custom names, existing server flash text and single-toast delivery.

- 2026-10-08 — Aligned vendor registration/onboarding required indicators, accessible inline errors and responsive step layouts; disabled native form validation, moved registration confirmation errors to their field, and revalidated persisted company/bank drafts before final writes while preserving document autosave and upload-first expiry checks; documented the field/rule/error mapping and isolated verification.

- 2026-10-08 — Updated agent verification rules to run live browser checks only on explicit user request, while retaining code review, isolated tests, linting and builds as the default checks.

- 2026-10-08 — Save expiring onboarding documents before enabling expiry entry; allow only initial autosave uploads to omit expiry, retain mandatory expiry checks on Continue/final submission, and verify file extension, MIME and configured size limits.

- 2026-10-08 — Automatically persist onboarding document uploads, replacements, expiry edits and confirmed removals on the server; removed the manual Save Draft action and kept required-document validation on Continue and final submission.

- 2026-10-08 — Standardized all active VMS single-select controls on the shared FormSelect, with form/field/compact sizing, bilingual choice placeholders and empty states, accessible keyboard navigation and modal-contained popups; preserved option codes, typed callbacks, legacy values, dependent selections and report filter/export contracts.

- 2026-10-08 — Replaced the onboarding company/review category description field with an information icon using the existing VMS explanation tooltip; retained selected-master descriptions, custom text and empty legacy compatibility.

- 2026-10-08 — Updated the vendor category verification report with native Arc viewport/keyboard measurements, isolated onboarding/review UI fixtures, reproduced JS-suite failures and remaining MySQL/browser coverage limits.

- 2026-10-08 — Added ten bilingual vendor category defaults with separate optional master descriptions, editable CRUD descriptions and automatic readonly onboarding/review/profile displays; added guarded additive manual alignment, immutable codes and reference-safe deletion while preserving custom categories and historical data; documented relations, verification and manual execution steps.

- 2026-10-08 — Replaced the performance baseline with six bilingual metrics weighted 25/25/25/10/5/10 percent and maximum score four; added atomic, version-checked configuration editing, exact active-weight validation, localized paginated search, preserved score snapshots, and a guarded manual legacy replacement that retains audited defaults.

- 2026-10-08 — Aligned bilingual onboarding instructions with the actual company and bank fields; removed unavailable fields and replaced checklist guidance with the existing document upload step.

- 2026-10-08 — Replaced the company onboarding instructions with the requested bilingual wording and six numbered items, including three nested document/information bullets, while preserving form fields, validation and onboarding behavior.

- 2026-10-07 — Expanded the Send Notification form to the admin content width used by Performance Metrics.

- 2026-10-07 — Aligned category, document-type, staff and notification forms with performance metric controls, retaining red required indicators and adding accessible inline errors without changing backend rules.

- 2026-10-07 — Aligned the default document catalogue to eight bilingual types with explicit backend ordering; added guarded legacy-default cleanup that preserves custom types, upload settings, references and administrator seed protection.

- 2026-10-06 — Localized the vendor upload file chooser and empty selection state through application labels while retaining native file selection, filenames, reset behavior and accessible status/error associations.

- 2026-10-06 — Removed the plus icon from the vendor Documents upload opener and matched its 36px height to the admin compliance evaluation action, preserving its theme styling and upload modal behavior.

- 2026-10-06 — Matched the Rate Performance Back link and vendor-detail compliance evaluation button to 36px controls; replaced Vendor and Contact Messages Search button text with accessible search icons while retaining submission behavior.

- 2026-10-06 — Matched vendor detail Back, Activate, Suspend and Terminate actions and the Compliance dashboard Run Evaluation action to the 36px control height, preserving styling, permissions and behavior.

- 2026-10-06 — Matched the admin Dashboard View All Vendors button and Reports period select to the compact 36px controls, retaining their placement, theme styles and behavior.

- 2026-10-06 — Matched the Vendor and Contact Messages search controls and vendor Performance score badge to the compact document-type filter sizing, preserving their placement, colors and behavior.

- 2026-10-06 — Moved the compact Document Verification document-type filter and adjacent gradient Reset icon below the header, aligned to the right of the status tabs with responsive wrapping.

- 2026-10-06 — Hid the visible Document Verification filter label while retaining its accessible name, and replaced the Reset text button with a labelled theme-gradient reset icon button without changing reset behavior.

- 2026-10-06 — Moved the Document Verification document-type filter and conditional Reset action into responsive page-header actions, with an opt-in action-width class to keep tablet titles readable; preserved filter queries, status tabs, pagination and document actions.

- 2026-10-06 — Removed Master Data submenu icons and their reserved space; applied theme gradients to main sidebar hover/active states and light brand highlights to submenus, preserving navigation, permissions and group controls.

- 2026-10-05 — Matched the Compliance Rules Back link to the vendor detail small outline action link, preserving its compliance dashboard destination and bilingual label.

- 2026-10-05 — Matched Apply Filter buttons across available report pages to the small outline View action, preserving filtering and export behavior.

- 2026-10-05 — Aligned the active Staff Users, Roles and Permissions tabs with the shared theme gradient and white text, preserving tab navigation and inactive styles.

- 2026-10-05 — Aligned active language switches and status/filter controls with the shared sidebar theme gradient, preserving inactive styles, selected values and filter navigation.

- 2026-10-05 — Made Ocean the fallback theme before and after React initialization, retained valid saved themes, and aligned primary buttons and action links with the active sidebar gradient while preserving semantic variants.

### Fixed

- 2026-10-09 — Fixed six PHPStan findings by representing legacy business-type options as unsaved models, declaring the nullable category description and removing redundant guards after established validation; preserved rating bounds, upload defaults and final onboarding validation.

- 2026-10-09 — Fixed default-language feature assertions to inspect the HTML lang attribute independently of attribute order and the existing theme attribute.

- 2026-10-08 — Show bilingual onboarding file-size errors in MB beside the affected document, retain upload context, and turn oversized server POST requests into inline validation errors after authorization instead of a standalone 413 page.

- 2026-10-08 — Enforced every active mandatory onboarding document before continuing and again at final submission, with owned-file validation, per-type errors, atomic upload failure cleanup and an explicit partial-draft action that does not complete the document step.

- 2026-10-07 — Improved admin Profile and Notifications responsive tabs, forms, inline error accessibility, long-content wrapping, action sizing and account dialog without changing vendor views or business behavior.

- 2026-10-07: Added bilingual, accessible disabled-action explanations across VMS forms, business actions and pagination, preserving native disabled controls and existing eligibility rules.

- 2026-10-07 — Improved admin dashboard grids, long-content wrapping, statistic readability and action controls across narrow and wide screens while preserving permissions and payment visibility.

- 2026-10-07 — Improved responsive audit logs, contact messages, notification forms, reports and system health with local table pagination, wrapping controls and accessible field labels/errors, preserving business flows.

- 2026-10-07 — Improved responsive vendor dashboard, profile, documents, compliance, performance and notifications with wrapping actions, bounded dialogs and accessible local form controls, preserving business rules and stored data.

- 2026-10-07 — Improved responsive admin document, compliance and performance layouts, action links, contained tables and dialogs while preserving permissions, payment visibility and business flows.

- 2026-10-07 — Improved vendor-detail responsiveness for long information, wrapped actions and tabs, contained document-table scrolling and viewport-bounded confirmation dialogs without changing business actions.

- 2026-10-07 — Matched the Vendor Categories Active checkbox and label styling to Performance Metrics while preserving its state, validation and submission behavior.

- 2026-10-07 — Translated the built-in Company Profile document type to Profil Perusahaan in Indonesian while preserving English labels, custom records and administrator overrides.

- 2026-10-07 — Hid payment role management and permission catalogues while payments are disabled, rejected direct payment-grant requests, and preserved hidden assignments during staff role edits.

- 2026-10-07 — Hid the compliance dashboard payment-blocking column when the payments module is disabled, restoring its stored values when enabled.

- 2026-10-07 — Fixed fresh migration and seeding by syncing legacy RBAC data without Spatie models before the guard columns exist, leaving operational grants to the later RBAC conversion; added non-testing-path migration/seed regression coverage.

- 2026-10-07 — Gated compliance rule payment-blocking controls, updates and evaluation effects with the existing payments flag, preserving stored settings, penalties, flags, activation blocking and evaluation history.

- 2026-10-07 — Localized blocked vendor status labels in login, existing-session and password-reset errors using existing English/Indonesian translations, preserving account access restrictions and stored status codes.

- 2026-10-06 — Aligned the sidebar logo divider with the measured admin/vendor header height, including vendor status banners and wrapping header content, while preserving sticky headers and the mobile drawer layout.

- 2026-10-05 — Aligned terminated vendor metadata and lifecycle scenarios with reactivation into review; added a targeted metadata migration for existing installations, preserved login while awaiting activation, and associated lifecycle comment errors with their textarea without native required validation.

- 2026-10-05 — Restored white text on admin dashboard Quick Actions with scoped link overrides, preserving destinations, permissions, payment visibility and responsive layout.

- 2026-10-05 — Aligned Artisan/PHPUnit test locale overrides and explicitly enabled payments in payment authorization/RBAC scenarios, fixing CI expectations without changing the Indonesian application default or disabled payment module.

- 2026-10-05 — Displayed staff-user validation once beside each field, moved password mismatch errors to confirmation, and tailored Sonner feedback for user updates and optional password changes.

- 2026-10-02 — Gave the Messages Total, New, Replied and Read summary cards explicit theme-primary backgrounds and shared shadows, retaining status colors, counts and responsive layout.

- 2026-10-02 — Typed the configured RBAC role and permission relations for PHPStan and simplified the primary-role display fallback, preserving Spatie relations and legacy grants.

- 2026-10-01 — Right-aligned the Internal Users table action header and buttons to match the Performance table, retaining wrapping, action handlers and staff access rules.

- 2026-10-01 — Restored white text on the vendor summary Rate Performance link with a scoped override, preserving its rating destination and permission check.

- 2026-10-01 — Made Available Reports card icons white on their existing gradient backgrounds without changing report labels, actions or permissions.

- 2026-10-01 — Restored white icons on active sidebar menu links to match their labels, preserving inactive icons, branding, navigation and theme backgrounds.

- 2026-10-01 — Restored white text on the vendor dashboard Request Payment link with a scoped override, preserving its destination and active-vendor visibility rule.

- 2026-10-01 — Matched the vendor notification guide to the shared VMS card with themed icon badges and clearer description colors, preserving its empty-state visibility and bilingual content.

- 2026-10-01 — Fixed Safari PDF previews by embedding authorized document endpoints after a HEAD/MIME check instead of blob frames; kept preview loading until the media loads, added a timeout fallback and removed empty preview sources without changing document permissions or CSP.

- 2026-10-01 — Restored white text on the performance detail Add Rating link with a scoped color override, preserving its size, theme background and rating destination.

- 2026-10-01 — Replaced plain header Back links on vendor details and the performance rating form with the shared small outline action links, preserving navigation destinations and rating submission behavior.

- 2026-10-01 — Restricted every onboarding endpoint to users with the vendor role, including super-admin requests; limited landing navbar and footer vendor tools to vendor users while retaining public registration.

- 2026-10-01 — Matched the shared and vendor Notifications Mark All as Read buttons to the small theme-primary variant, preserving read actions and existing visibility conditions.

- 2026-10-01 — Restored white text on active sidebar navigation labels only, preserving inactive labels, icons, backgrounds, layout and navigation.

- 2026-10-01 — Enabled the existing Audit Logs table scrolling and sticky-header presentation for the Staff Permission Catalogue only, preserving permission data and RBAC behavior.

- 2026-10-01 — Reduced only the Vendors and Messages Search buttons to the existing small size and prevented flex stretching to the search-input height; preserved search behavior and layout.

- 2026-10-01 — Restored white text on the Reports dashboard CSV export link with scoped styling that overrides the anchor reset while preserving export URLs, permissions and theme backgrounds.

- 2026-10-01 — Fixed the unlayered anchor color reset overriding active status-filter text on Vendors, Documents, Payments and Messages; scoped link colors and keyboard focus now follow Staff tabs while preserving queries and filter behavior.

- 2026-10-01 — Rolled back the global white button/filter-label styling and restored the presentation after the report-button fixes, preserving report sizes, variants and behavior.

- 2026-10-01 — Completed report button consistency on the report dashboard and five detail reports: small outline Back links, small theme-primary Apply Filter/Export controls and responsive action groups, retaining filter queries, downloads and export permissions.

- 2026-10-01 — Corrected Master Data row-action variants: category/document-type and staff/role Edit now use the small primary presentation, Delete uses danger, and staff View retains outline; preserved handlers and permission checks.

- 2026-10-01 — Standardized 64 list, toolbar, card and detail action controls across 24 admin/vendor pages to the Kinerja small-button presentation, preserving semantic variants and behavior; added accessible single-element navigation controls and an action-button audit without changing Kinerja or form/filter defaults.

- 2026-09-30 — Completed staff permission catalogue, module groups, empty-state, deletion and RBAC validation translations while preserving custom labels; matched the staff View link to the existing Edit button styling.

- 2026-09-30 — Added a guarded, data-preserving repair migration for MySQL RBAC morph types whose backslashes were lost during legacy conversion, restoring role recognition without changing grants.

- 2026-09-29 — Made vendor lifecycle transitions use fresh locked state, excluded inactive compliance rules from current decisions, and protected current document versions against failed uploads and stale review actions.
- 2026-09-29 — Restored authorized internal notes, kept account sessions and history intact when deletion is not allowed, neutralized spreadsheet formulas in CSV exports, and preserved report, vendor, payment, and notification pagination and totals.
- 2026-09-29 — Connected registration and contact form labels and errors to their inputs, set an explicit English test locale, and resolved scoped PHPStan issues without changing application locale.

- 2026-09-29 — Localized the Sonner toast close button and split Sonner into a cacheable Vite chunk to keep the main app bundle below its configured warning limit.

- 2026-09-29 — Announced vendor flash messages and toast feedback accessibly, replaced browser alerts in language and onboarding flows with VMS UI components, and made vendor notification read actions keyboard accessible.

- 2026-09-28 — Localized verification, password-reset and vendor-application emails using each recipient's saved language, including queued delivery and Laravel's email template text.

- 2026-09-27 — Applied per-type safe extension/MIME, size and expiry requirements to both upload flows and draft submission; excluded inactive requirements from current compliance, activation, expiry reports and reminders while preserving document history.

- 2026-09-25 — Aligned vendor category management with the shared admin page, form, table, status, and confirmation components.
- 2026-09-24 — Localized current vendor status labels consistently on the vendor profile.
- 2026-09-23 — Reordered bank onboarding fields and standardized bilingual examples while preserving automatic bank-name resolution.
- 2026-09-23 — Localized all system-generated Audit Logs descriptions while preserving staff-entered reasons.
- 2026-09-23 — Localized the admin sidebar panel label for English and Indonesian language preferences.
- 2026-09-20 — Revoked vendor sessions and blocked every authenticated request after suspension, termination, or rejection until access is restored.
- 2026-09-19 — Completed bilingual Messages copy and added reliable success, validation, server, and network feedback to the public contact form.
- 2026-09-19 — Synchronized vendor activation readiness between the backend and Documents tab, and made disabled-action tooltips unclipped, adaptive, and keyboard accessible.
- 2026-09-18 — Disabled the top-right progress spinner that overlapped the language switcher while keeping the progress bar visible.
- 2026-09-18 — Existing vendors with unverified email addresses now automatically receive a verification link when signing in, with a cooldown to prevent repeated sign-ins from sending excessive email.
- 2026-09-18 — An email verification link opened in another browser now resumes automatically after the vendor signs in, without bypassing account and signed-link checks.

### Added

- 2026-10-08 — Added Super Admin Business Types CRUD above Vendor Categories, with immutable string codes, active choices, protected vendor/application/audit references, and shared catalogue locking. Integrated onboarding, review, vendor profile and admin details with bilingual master labels while preserving legacy values; prepared an idempotent bootstrap migration with a non-destructive rollback.

- 2026-10-07 — Added super-admin performance metric management under Master Data with immutable metric codes, protected rated/built-in metrics, atomic rating batches, current-score recalculation and preserved historical scores.

- 2026-10-05 — Added optional password and confirmation fields when editing internal staff, retaining the existing hash for blank input, enforcing server confirmation and password rules, and keeping credentials out of staff responses and audit payloads.

- 2026-09-30 — Added seven optional vendor document master types, a data-preserving additive migration, bilingual labels/descriptions, catalogue audit guidance and regression coverage; retained legacy document codes and requirements.

- 2026-09-30 — Added Spatie-backed staff and role CRUD, multi-role assignments, an operational permission catalogue, safe legacy schema conversion, and RBAC regression/audit documentation.

- 2026-09-30 — Documented RBAC access mapping, authorization conflicts, legacy migration safeguards, and verification limitations.

- 2026-09-28 — Added bilingual vendor decision emails after successful approval or rejection, using the recipient's saved language and preserving the exact rejection reason.

- 2026-09-27 — Documented document-type dependency checks, bootstrap behavior, verification limits and the manual schema migration.

- 2026-09-27 — Added super-admin document type CRUD under Master Data with bilingual forms, stable unique codes, commit-safe cache refresh, guarded deletion of referenced types, and a one-time bootstrap marker preserving administrator-managed data.

- 2026-09-27 — Added document-type filtering to the admin document list, combined with status and search, with persistent pagination, reset, and historical inactive types.

- 2026-09-25 — Added super-admin vendor category management and a guarded category relation for onboarding, with preservation of existing vendor and draft categories during manual migration.
- 2026-09-24 — Added a concise horizontal vendor-registration flowchart and role responsibility table for end users.
- 2026-09-23 — Added immutable sequential Vendor IDs for new registrations and exposed them in vendor and staff views.
- 2026-09-23 — Documented bilingual placeholder conventions and mandatory use of relevant repository skills in the agent guidelines.
- 2026-09-23 — Added vendor category and project experience fields with bilingual onboarding guidance and local WhatsApp-number validation.
- 2026-09-23 — Added concise bilingual examples to typed company-onboarding fields while retaining instructional dropdown placeholders.
- 2026-09-22 — Added source-traceable Mermaid flowcharts for VMS authentication, role-specific vendor and administration workflows, onboarding, vendor lifecycle, document and compliance, and performance processes, excluding payment workflows maintained in a separate application.
- 2026-09-18 — Added vendor email verification during registration, a bilingual confirmation page, signed links, and a rate-limited resend option.
- 2026-09-18 — Added agent guidelines and a project changelog for recording future changes.

### Changed

- 2026-10-05 — Ignored docs/ and removed its contents from Git tracking while retaining all local documentation files.

- 2026-10-05 — Kept root AGENTS.md and .agents guidance local by ignoring them and removing AGENTS.md from Git tracking without deleting its local contents.

- 2026-10-05 — Required backend-only form validation in agent guidelines, disabling native browser validation and HTML required attributes while retaining visual required indicators and semantic input types.

- 2026-10-05 — Added repository rules for per-field server/UI validation, non-duplicated field errors, action-specific bilingual Sonner feedback for create/update/delete, and CRUD failure-state verification.

- 2026-10-05 — Enabled permanent internal-staff deletion while preserving history through nullable actor references, retaining last-admin/vendor-ownership safeguards, revoking account credentials, and adding explicit bilingual confirmation plus a manual history-preserving migration with guarded rollback.

- 2026-10-05 — Removed the Internal Users View button, right-aligned Staff Roles actions, and gave the Permission Catalogue proportional column widths with contained scrolling and long-content wrapping; preserved staff routes, handlers and access rules.

- 2026-10-03 — Commented out the four currency settings in `.env.example`, retaining the existing currency defaults.

- 2026-10-02 — Defaulted first-visit language to Indonesian while preserving saved English/Indonesian preferences, English translation fallback and language switching when browser storage is unavailable.

- 2026-10-02 — Disabled VMS payments by default behind a reversible feature flag, closing UI and server access for every role, suppressing payment automation and retaining all code, permissions, relations and historical data.

- 2026-10-01 — Moved the existing theme switcher from page headers beside the sidebar logo in admin and vendor layouts, replacing the portal/panel branding labels; retained theme preferences and added localized labels and keyboard focus styling.

- 2026-10-01 — Added responsive UI and cross-browser requirements for desktop and mobile, including bilingual layout checks and reporting of actual browser and viewport verification.

- 2026-10-01 — Added production dependency guidance to prefer supported LTS or maintained stable releases, verify compatibility and support, and require explicit authorization for unsupported or prerelease exceptions.

- 2026-10-01 — Clarified agent instruction precedence, dependency and missing-skill boundaries, isolated database testing, and scoped verification commands based on the current project configuration.

- 2026-09-30 — Renamed canonical document master codes to npwp, nib_oss and bank_account_proof, added legacy read compatibility and a collision-guarded ID-preserving rename migration without changing document metadata or requirements.

- 2026-09-30 — Applied staff permissions to active routes, policies, navigation and dashboard data while retaining the effective built-in access baseline and dormant legacy grants; made role bootstrap preserve administrator changes.

- 2026-09-30 — Matched admin document and payment status filter styling to vendor filters while preserving filter behavior and existing document keyboard focus indicators.

- 2026-09-29 — Replaced temporary React feedback with one top-right Sonner toaster across guest, vendor and admin pages, preserving existing message types and wording.

- 2026-09-27 — Placed the document-type dropdown below status filters with responsive spacing, a single all-documents option, and visible keyboard focus for status and reset controls.

- 2026-09-26 — Kept vendor categories admin-managed, displayed stored category names unchanged, and added a guarded migration to replace the legacy vendor category column with `category_id`.
- 2026-09-25 — Placed a bilingual Master Data sidebar group below Dashboard with Vendor Categories and Staff Users for super admins.
- 2026-09-24 — Renamed the vendor bank-code field to plain-text `code_bank` while preserving historical onboarding drafts.
- 2026-09-24 — Renamed the vendor registration-number field to Business Identification Number while preserving existing vendor data and historical onboarding drafts.
- 2026-09-19 — Removed legacy change-marker comments and updated the agent guidelines to allow only technically meaningful code comments.
- 2026-09-19 — Standardized the documented and display-oriented product identity as `VMS` and `Vendor Management System` while preserving legacy technical identifiers.
- 2026-09-19 — Replaced the remaining user-facing legacy application metadata with `VMS` and standardized localized browser titles as `Page - VMS`.
- 2026-09-19 — Translated the agent guidelines and the complete changelog into English.
- 2026-09-19 — Updated the agent guidelines based on the current VMS structure, configuration, and tests, and clarified database operation boundaries and verification standards.
- 2026-09-18 — Automatic verification email delivery no longer displays an alert; a success alert appears only after the vendor explicitly requests another email.
- 2026-09-18 — Existing accounts with unverified email addresses are now redirected to the verification page immediately after sign-in; shared routes also require verification without changing staff access.
- 2026-09-18 — Vendor-area access now requires email verification; changing a vendor profile email address requires reverification without locking staff accounts.
- 2026-09-18 — Change-marker comments were restricted to explicit user requests.

### Security

- 2026-10-05 — Applied vendor account restrictions to email verification endpoints and both password-reset stages, including previously issued reset tokens, while retaining access for enabled vendors under review.

- 2026-09-30 — Protected the last super admin across staff assignment/deletion and profile deletion with a shared transaction lock, preserved account history, and refreshed authorization plus affected caches after RBAC changes.

- 2026-09-29 — Updated affected Composer and npm dependencies within existing major versions and added regression coverage for CRLF email input and CSV formula injection.
