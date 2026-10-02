# VMS action button audit

Date: 2026-10-01. Scope: presentation and related accessibility of actions in active authenticated admin, Master Data and vendor menus, traced from `routes/web.php` and `resources/js/Components/Sidebar.jsx`.

## Reference and implementation

`resources/js/Pages/Admin/Performance/Index.jsx:64` uses `Button size="sm"`, outline for View and primary for Rate. The shared implementation in `resources/js/Components/index.jsx` supplies `px-3 py-1.5 text-sm`, `rounded-xl`, medium weight, inline flex alignment and `gap-2`. Border and background follow the existing variant tokens. Width follows content. Rendered height has not been measured in a browser; outline borders may make its height differ from the borderless primary variant.

`resources/js/Components/ActionControls.jsx` supplies opt-in ActionButton, ActionLink and ActionAnchor with those size and variant tokens, native button/link semantics, visible keyboard focus and reduced-motion transitions. Shared Button/LinkButton defaults and every admin Performance page remain unchanged. Existing full-width detail actions retain their width and alignment. Existing groups wrap where needed; page layout and unrelated controls remain intact.

View/detail actions use outline; main actions retain primary where appropriate. Success, warning, danger, secondary and ghost variants are retained according to existing meaning. Master Data Edit uses primary and Delete uses danger; staff View retains outline. Static button labels use the existing language context. Navigation labels are supplied by their callers, so stored notification action text remains verbatim. Existing icons, accessible names, handlers, disabled/loading expressions, permissions and URLs are preserved.

## Active menu coverage

Paths below are relative to `resources/js/Pages/`. There are 74 action control call sites across 24 changed pages; repeated rows and conditional actions reuse those call sites.

| Menu                    | Changed pages                                                                                                                                          | Actions covered                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Admin Dashboard         | `Admin/Dashboard.jsx`                                                                                                                                  | Review vendor/payment list rows                                                                                                         |
| Vendors                 | `Admin/Vendors/Index.jsx`, `Show.jsx`                                                                                                                  | View, lifecycle toolbar, rating link, document view/download/review, compliance evaluation                                              |
| Documents               | `Admin/Documents/Index.jsx`                                                                                                                            | View, Verify, Reject; file-name download link remains a content link                                                                    |
| Payments                | `Admin/Payments/Index.jsx`, `Show.jsx`                                                                                                                 | Review, Validate, Approve, Reject, Mark Paid, including disabled and processing states                                                  |
| Master Data             | `Admin/VendorCategories/Index.jsx`, `Admin/DocumentTypes/Index.jsx`, `Admin/Staff/Index.jsx`                                                           | Category/type edit/delete and staff/role View/Edit/Delete                                                                               |
| Messages                | `Admin/ContactMessages/Index.jsx`, `Show.jsx`                                                                                                          | View, delete trigger, Compose Reply mailto link                                                                                         |
| Compliance              | `Admin/Compliance/Dashboard.jsx`                                                                                                                       | Run Evaluation trigger                                                                                                                  |
| Reports                 | `Admin/Reports/Index.jsx`, `VendorSummaryReport.jsx`, `PaymentReport.jsx`, `PerformanceReport.jsx`, `ComplianceReport.jsx`, `DocumentExpiryReport.jsx` | View/report download and CSV export; Back and Apply Filter controls now share the small presentation; filter behavior remains unchanged |
| Vendor Documents        | `Vendor/Documents.jsx`                                                                                                                                 | Upload trigger, View, Download, Re-upload                                                                                               |
| Vendor Payments/Profile | `Vendor/Payments.jsx`, `Vendor/Profile.jsx`                                                                                                            | Payment request triggers and Edit Profile trigger                                                                                       |
| Notifications           | `Vendor/Notifications.jsx`, `Notifications/Index.jsx`                                                                                                  | Mark all/read and stored notification action links                                                                                      |

## Already matching, protected reference and exclusions

- `Admin/Performance/Index.jsx` already provides the requested small standard. `Admin/Performance/Show.jsx` and `Rate.jsx` remain unchanged because the Kinerja menu is protected as the reference.
- Existing small success/danger payment/document actions already matched the size. They now opt into the same semantic wrapper and focus styling without changing their meaning or handlers. A follow-up correction replaces the remaining category/document-type ghost variants and staff/role outline Edit with primary Edit and danger Delete.
- `Admin/Audit/Index.jsx`, `Admin/SystemHealth/Index.jsx`, `Vendor/Compliance.jsx` and `Vendor/Performance.jsx` have no target row actions to resize; their filters/pagination/read-only content remain unchanged.
- Admin Notifications Send, profile editing forms, Master Data and staff forms, deletion confirmations, upload/rejection/payment modals, internal note submit, onboarding steps, DocumentViewer modal controls, authentication and public-page forms are excluded form/modal controls.
- Back links (`Admin/Staff/Show.jsx`, compliance detail), dashboard View All links, shortcut cards, clickable vendor/compliance cards, names/file-name links, sidebar navigation, tabs, status filters, pagination and the compliance rule switch retain their existing navigation/control presentation.
- No existing icon-only control in the target row/list action inventory needed conversion; modal close icons and switches remain excluded.

## Accessibility finding retained in the reference

- `resources/js/Pages/Admin/Performance/Index.jsx:64`, `:69`, `:188` — Link contains Button, creating nested interactive elements. Per the explicit reference protection, this audit does not edit Kinerja. Target vendor/message/report links, including report Back links after the report follow-up, instead render one anchor with equivalent small styling. The same markup issue in excluded Back/Cancel controls is outside this redesign and remains unchanged.

Guidelines reviewed: [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). Review is bounded to action controls; it is not a full-page accessibility certification.

## Verification and limitations

- Prettier applied to changed JSX and the component contract test. ESLint, all 107 Node frontend tests, the Vite production build (output in `/private/tmp/vms-action-final-build-20261001`) and `git diff --check` passed.
- The report follow-up also standardizes the five Back/Apply Filter pairs and six Export controls. Back uses outline; filter/export use theme primary, with wrapping action groups. Their handlers, URLs and export permissions remain intact.
- Four rendering contract tests exercise native button disabled/type/accessible attributes, one-anchor Inertia navigation, download/target preservation, English/Indonesian labels and verbatim custom labels. They use installed build tooling, without a new dependency or server/database.
- A separate AST inspection compares href, onClick/onSubmit, disabled, type, method, target, rel, download, title, aria-label and Inertia preservation attributes with HEAD in all 24 changed pages. These attributes match. Permission branches and action expressions are unchanged in the diff.
- Git comparison confirms all admin Performance pages, shared Button defaults and Sidebar are unchanged.
- The Master Data follow-up also ran the normal `npm run build`, regenerating `public/build`. Its manifest and compiled category/document-type/staff entries contain ActionControls and primary/danger variants.
- A follow-up HTTP read of the local Vite Staff module confirmed the action component is served; this is not a browser visual check.
- No connected browser was available from the computer-use inventory. Desktop/mobile appearance, rendered height, hover, actual keyboard focus, long-label wrapping and real detail navigation have not been browser-verified. SSR contracts and source inspection do not establish visual parity.
- No PHP, backend, schema, dependency or real data changes are made by this task. No database tests, migrations, seeders or state-changing UI actions are run. Existing unrelated worktree changes are preserved. No manual database step is required for this UI change.
