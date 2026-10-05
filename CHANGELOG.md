# VMS Changelog

The VMS (Vendor Management System) changelog starts on 2026-09-18. Changes before this date are not reconstructed without verification. Add new entries to `[Unreleased]` under `Added`, `Changed`, `Fixed`, `Removed`, or `Security`; move them to a release version only when that release is actually created.

## [Unreleased]

### Fixed

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

- 2026-09-30 — Protected the last super admin across staff assignment/deletion and profile deletion with a shared transaction lock, preserved account history, and refreshed authorization plus affected caches after RBAC changes.

- 2026-09-29 — Updated affected Composer and npm dependencies within existing major versions and added regression coverage for CRLF email input and CSV formula injection.
