# VMS Changelog

The VMS (Vendor Management System) changelog starts on 2026-09-18. Changes before this date are not reconstructed without verification. Add new entries to `[Unreleased]` under `Added`, `Changed`, `Fixed`, `Removed`, or `Security`; move them to a release version only when that release is actually created.

## [Unreleased]

### Fixed

- 2026-09-20 — Revoked vendor sessions and blocked every authenticated request after suspension, termination, or rejection until access is restored.
- 2026-09-19 — Completed bilingual Messages copy and added reliable success, validation, server, and network feedback to the public contact form.
- 2026-09-19 — Synchronized vendor activation readiness between the backend and Documents tab, and made disabled-action tooltips unclipped, adaptive, and keyboard accessible.
- 2026-09-18 — Disabled the top-right progress spinner that overlapped the language switcher while keeping the progress bar visible.
- 2026-09-18 — Existing vendors with unverified email addresses now automatically receive a verification link when signing in, with a cooldown to prevent repeated sign-ins from sending excessive email.
- 2026-09-18 — An email verification link opened in another browser now resumes automatically after the vendor signs in, without bypassing account and signed-link checks.

### Added

- 2026-09-18 — Added vendor email verification during registration, a bilingual confirmation page, signed links, and a rate-limited resend option.
- 2026-09-18 — Added agent guidelines and a project changelog for recording future changes.

### Changed

- 2026-09-19 — Removed legacy change-marker comments and updated the agent guidelines to allow only technically meaningful code comments.
- 2026-09-19 — Standardized the documented and display-oriented product identity as `VMS` and `Vendor Management System` while preserving legacy technical identifiers.
- 2026-09-19 — Replaced the remaining user-facing legacy application metadata with `VMS` and standardized localized browser titles as `Page - VMS`.
- 2026-09-19 — Translated the agent guidelines and the complete changelog into English.
- 2026-09-19 — Updated the agent guidelines based on the current VMS structure, configuration, and tests, and clarified database operation boundaries and verification standards.
- 2026-09-18 — Automatic verification email delivery no longer displays an alert; a success alert appears only after the vendor explicitly requests another email.
- 2026-09-18 — Existing accounts with unverified email addresses are now redirected to the verification page immediately after sign-in; shared routes also require verification without changing staff access.
- 2026-09-18 — Vendor-area access now requires email verification; changing a vendor profile email address requires reverification without locking staff accounts.
- 2026-09-18 — Change-marker comments were restricted to explicit user requests.
