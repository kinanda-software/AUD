This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Backend connection

Run the AUD Django backend from the `backend` directory with
`python manage.py runserver 127.0.0.1:8000`. The frontend defaults to
`http://127.0.0.1:8000`, explicitly using the IPv4 loopback address. This avoids
`localhost` resolving to an unrelated IPv6 Docker/WSL listener on the same port.
All active frontend API calls use
the shared origin in `src/lib/apiConfig.ts`. To use another address, set
`NEXT_PUBLIC_API_ORIGIN` in `.env.local` and restart Next.js. The legacy
archive-page `NEXT_PUBLIC_API_URL` override, if set, must point to the same AUD
backend with an `/api` suffix.

Django allows the frontend origins `http://localhost:3000`,
`http://127.0.0.1:3000`, `http://localhost:3001`, and `http://127.0.0.1:3001`
for CORS and session CSRF checks. If port 3000 is occupied, Next.js can use
port 3001; open the address printed by `npm run dev`. CORS origin and credential
headers are managed by Django's CORS middleware, not hardcoded in auth views.
For a different frontend port or host, add its exact origin to
`CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` in `backend/config/settings.py`
and restart Django. Do not enable unrestricted CORS to resolve a connection error.

Login verifies the returned DRF token through `/api/auth/me/` using
`Authorization: Token ...`; this endpoint supports both token and Django session
authentication. Browser session cookies are optional for token-authenticated API
access and may be blocked when the frontend uses `localhost` and the backend
uses `127.0.0.1`. No relaxed cookie security settings are required.

Audit Team user selection uses the shared authenticated API helper for
`/api/auth/audit-team-users/`, just like team reads and writes. It does not
depend on a cookie-only request or call the administrator-only user directory.
If user loading fails, the page shows an explicit error and Retry action while
keeping the existing team visible; an empty successful user list is distinguished
from a failed request.

Planning Procedures reuses the authenticated user already verified by the
workspace layout. It does not issue a second cookie-only identity request.
New procedures still default `performed_by` to that user's ID; editing existing
procedures preserves their recorded performer. Token rejection and sign-in
redirects remain handled by the workspace authentication flow.

Phase 2.2 Process Flow Walkthroughs uses the shared token/session API helper
for loading, creating and updating workpapers, including CSRF initialization
for writes. Backend field errors remain readable; invalid API responses are
reported rather than treated as an empty workpaper.

Phase 2.3 Risk Points also uses shared token/session authentication for reads,
creates, updates and deletes, with CSRF protection on writes. An empty saved
risk list starts a temporary new record, so the first save creates a risk rather
than attempting to update database record 1.

Execution 3.1 Control Tests uses shared token/session authentication for
loading and both create/update saves, including CSRF initialization on writes.
Backend validation messages remain visible, and a save requires a valid
returned record ID before showing success or allowing continuation.

Execution 3.2 Interim/Year-End Assessments follows the same authenticated
load/create/update flow. It preserves backend validation messages and requires
a valid saved assessment ID before reporting success.

Execution workpapers 3.3-3.5 use the shared authenticated helper for all
load/create/update requests. A workpaper request failure displays its error
instead of redirecting to login independently. This avoids a loop where
cookie-only workpaper requests reject access but login accepts the saved token
and redirects back to the same workpaper. The workspace still verifies access
on entry and redirects genuinely signed-out users to login.

Workpaper 4.3 contains blank audit-area/judgment checklist templates rather
than sample completed reviews, reviewer names, dates, findings or conclusions.
Review-area values come from authenticated Review Workflow assignments;
`Completed` maps to Reviewed and `Returned` to Follow-up Required. Review dates
come from completed dates or explicit review-date notes, not assignment dates.
Saving uses the actual assigned reviewer (the signed-in user for new areas),
the backend's status choices, `assigned_date`, and `review_notes`.
Only area assignments are persisted by this page; remaining sections are
explicitly unsaved working notes. Full-review completion is disabled rather
than presenting a local checkbox state as persisted approval.

Workpaper 4.4 Client Communications starts with empty deficiency, governance
matter and representation lists. Add actions create blank entries with unique
temporary IDs and no assumed communication recipient. There is currently no
communication-record persistence connected to this page: entries are explicitly
unsaved browser-view working notes, and Save/Complete actions are disabled
instead of claiming success from console logging. Refreshing or leaving discards
entries; displayed counts are not an assurance that no engagement matters exist.

Workpaper 4.5 (the legacy `opinion-report` route) also starts with empty
deficiency, governance and representation lists, with no fallback engagement ID.
It remains a client-communications working view, not an issued audit opinion.
Save and completion are disabled because no persistence API is connected;
continuation does not mark the workpaper completed. Entries are explicitly
unsaved and discarded on refresh/navigation.

The public `/login` page uses a responsive website-style layout with AUD
branding, in-page platform/workflow navigation and an audit-focused introduction.
The existing sign-in, token verification, password recovery and return-to-page
behavior are unchanged. "Remember username" saves only the username preference,
not the password. New account requests go through the platform administrator;
the page does not offer public registration.

The login website includes authorized IFS branding using a locally served
`public/ifs-logo.png`, downloaded from the official `https://ifs.co.tz/`
header logo. Company information is paraphrased from the official home, company
profile and audit/assurance pages, with source and service links. Published
contact details are 10 Kilimanjaro Street, Mikocheni, Dar es Salaam,
`info@ifs.co.tz`, and `+255 763 269 989`. Review these details with IFS when they
change. The firm service overview is explicitly separate from AUD functionality;
external links open in a new tab, and login does not load remote company assets.

Successful logout ends the Django session, clears the browser's current and
legacy access-token keys, and performs a full navigation to `/login` so the
authenticated workspace is unloaded. The remembered username preference is
preserved. Failed logout requests show an error and do not claim success.
Run `node --test tests/logout.test.mjs` to check token cleanup and navigation.

### Dashboard and workspace navigation

The dashboard loads authenticated `/api/engagements/` and
`/api/review-assignments/` records, following pagination so metrics do not count
only the first page. All figures describe records returned by the existing APIs;
the dashboard does not add new organization or engagement access rules.
Completed and cancelled engagements are excluded from active metrics, risk
distribution, phase groups, deadlines and open-review counts. Open reviews are
assignments not marked `Completed` on active engagements; assignments to the
signed-in user are prioritized. Reporting phase is not report approval, so the
dashboard does not claim reports are ready.

Deadlines use planned engagement end dates and local calendar-day differences,
not fixed countdown text or elapsed 24-hour periods. Due soon includes today
through 14 days ahead; overdue and missing dates are shown separately. A
one-minute clock updates date labels and greetings; data is retrieved on entry
and on Refresh, with its retrieval time shown. Refresh failures explicitly mark
retained figures as potentially stale; initial failures do not show fake zeros.
Phase progress is average recorded engagement progress, not procedure completion
or assurance. Recent record updates show the latest saved engagement/review
records, not a complete historical audit log.

Header notifications come from the existing recipient-scoped API. Mark-read,
mark-all-read and delete changes persist through authenticated requests.
Notifications reload on entry and when the panel opens or is refreshed; there
is no live push delivery. Errors are shown rather than replaced with sample
notifications. Below 1024px, navigation uses a toggle and dismissible drawer;
desktop retains the sidebar. Dashboard helper text uses darker slate colours.
Run `node --test tests/dashboard.test.mjs tests/logout.test.mjs tests/financial-auth.test.mjs`
for dashboard metrics, calendar thresholds, pagination, notification requests
and existing authentication regressions.

### Live Audits and Reports directories

`/audits` now shows the engagement-centric audit portfolio from
`/api/engagements/`, consistent with dashboard records, including cancelled
engagements. The independent legacy `/api/audits/` entity is not joined to
engagements by ID or name; it has no engagement/client relationship.
Search and filters use recorded status and risk values. Links use numeric
engagement IDs, not human-readable engagement codes. The new-audit action goes
to `/engagements/new`. Metrics describe the full loaded portfolio, not filtered
rows.

`/reports` is a reporting-workspace directory, not an issued-report register.
It loads engagements and `/api/completion-reviews/`, joining by numeric
`engagement`. Missing completion records are explicitly "No review record",
not draft reports. Saved checklist values and outstanding matters are readable
in the directory; false checklist values are "Not marked complete", not an
automatic finding or an applicability decision. Completion review status,
engagement status, report authorization and issuance are distinct. No report
numbers, opinions, approval counts, issue dates or downloads are invented.
The Summary workpaper link opens a separate engagement review workpaper; it is
not an editor for the completion-review record shown here.

Both directories load on entry or Refresh, support pagination, show explicit
load errors and flag retained data as potentially stale after refresh failure.
They do not manufacture demo records on error. The backend currently has no
dedicated persisted audit-report/opinion model or issued-report export endpoint.
The existing `opinion-report` route contains a client-communications workpaper
with a console-only save; the new directory deliberately does not present that
route as a saved report. Implementing a true reporting/issuance workflow remains
a separate phase.

Run `node --test tests/audit-portfolio.test.mjs` to verify real-ID joins, status
and risk filters, paginated authentication, completion-review response
validation and removal of fictitious report links.

Protected pages check Django authentication even when no browser token is
stored, allowing an existing session to authenticate. If neither is valid,
the workspace clears rejected browser tokens and redirects to sign in, preserving
the requested path and query string. Expected unauthenticated responses are not
logged as application errors. Network failures, server errors and malformed
successful responses show a retry screen rather than pretending the user is
logged out. Authentication checks time out after ten seconds.
Browser tokens are specific to the browser profile and frontend origin;
`localhost:3000` and `127.0.0.1:3000` do not share local storage.

Chart of Accounts and Adjustments use the shared authenticated API helper for
financial lists and mutations, including engagement/account selection and
adjustment posting/rejection. These pages must not use cookie-only requests:
token-authenticated login can work without a cross-host session cookie.
Run `node --test tests/financial-auth.test.mjs` from the frontend directory
to check request routing, token headers, and unauthenticated error handling.
This command also checks execution assessment pages for TSX syntax errors.
Run `npx tsc --noEmit` after hook dependency changes to verify callbacks and
saved-response type guards before serving the updated pages.

User deletion uses shared token/session authentication and CSRF handling.
Users referenced by protected audit review assignments cannot be deleted:
the API returns a readable conflict message directing administrators to
deactivate the account instead, preserving audit history. Unlinked users can
still be deleted, and self-deletion remains blocked. Run
`node --test tests/user-deletion.test.mjs` to verify deletion UI outcomes.

New engagement creation also uses the shared authenticated API helper for
`POST /api/engagements/`, retaining token, session and CSRF support. Server field
validation errors remain visible, and navigation to planning requires a valid
numeric ID in the creation response. Acceptance data is not logged to the
browser console. The same authentication regression command covers this request.

The AI Assistant module has been removed, including its navigation entry,
frontend page, backend API routes and provider configuration. Old assistant
URLs now return 404. Audit workflows and rule-based financial analysis remain
available. Existing environment files are not modified; unused provider keys
can be revoked and removed separately by the administrator.

The workspace sidebar uses the existing IFS logo above its navigation on
desktop and mobile. The logo links to the dashboard; the mobile close button
remains separate and the menu scrolls independently of the branding header.

### Reporting workpaper database readiness

Before using saved conclusion workpapers, run `python manage.py migrate` from
the backend with the configured virtual environment. Review-workflow migration
`0003_engagementworkpaper_summaryreview_review_areas` adds the structured
workpaper table and summary-review areas without deleting existing records.
Reporting pages validate saved-response identities and completion timestamps,
and preserve newer edits made while a save is in flight.
Documentation archiving saves an unlocked draft first; the server validates
completion and atomically locks the archive and marks its workpaper archived.
Locked archive records cannot be edited, deleted or unlocked through these APIs.
Archiving documentation does not issue a report or change engagement status.
Run the reporting portfolio, summary-review and workpaper-persistence frontend
tests, plus `apps.review_workflow.test_workpapers` and
`apps.audit_planning.test_archive` backend tests for these workflows.

## Accounting platform expansion: phase 1

**Accounting Controls** and **Journal Entries** are available from the Financials
dashboard and sidebar. Phase 1 adds an opt-in accounting policy per engagement,
opening-balance journals, closing dates, independent journal approval, linked
reversals, and financial API change history.

- Managers and administrators configure approval, close books, and reopen them
  with a recorded reason. Approval defaults to off for existing engagements.
- When approval is enabled, journals follow `draft -> submitted -> approved ->
  posted`. A different manager/administrator must approve the preparer's journal.
  Submitted/approved journals are frozen; a manager can return them to draft
  with a reason. Direct posted-ledger entry is blocked for approval-enabled
  engagements. Guests have read-only financial API access.
- Journal status changes use workflow actions, not ordinary create/update
  payloads. Posting is atomic and links each new ledger line to its journal line.
  Posted ledger entries cannot be edited or deleted. A reversal creates a linked
  opposite **draft** journal, which must still be reviewed and posted; it does
  not delete or alter the original. Older posted journals without line-level
  provenance require a manual reconciliation/correcting journal.
- A closing date blocks journal/ledger creation, edits, and deletion on or before
  that date, including journal-line and dimension changes. Pending journals must
  be resolved and posted ledger debits/credits must balance before closing.
  This is an accounting-book lock, not a replacement for trial-balance locks
  or audit-workpaper sign-off.
- Opening balances are one balanced draft journal of asset/liability/equity
  accounts, established before any posted ledger activity. The fixed opening
  date is the conversion baseline. Post that journal before other ledger
  activity. Afterwards, generated trial balances include ledger activity from
  the opening date through their reporting end date. Without an opening journal,
  the existing period-only calculation is unchanged. This does not yet
  automate year-end P&L closing to retained earnings or generate period-specific
  income statements from cumulative activity.
- Financial API mutations of accounts, trial balances/lines, adjustments,
  journals/lines, ledger entries, and lead schedules/supporting details record
  the actor, operation, and before/after snapshots in Financial Workflow
  Activity. Dimension changes include prior/current assignments. History is
  transactional: failed requests do not leave successful change events.
  Earlier history is not backfilled; direct SQL, bulk updates, and changes
  outside these API workflows are not covered by this recorder.

Accounting-control routes use engagement IDs:
`GET /api/financials/accounting-controls/{engagement_id}/`, with POST actions
`configure/`, `close/`, `reopen/`, and `opening-balances/`. Journal actions include
`submit/`, `approve/`, `return-to-draft/`, `post/`, and `reverse/`.

The phase requires the financials `0012` migration. Run `python manage.py migrate`
when deploying. Regression tests are in `apps.financials.test_accounting_controls`.

## Accounting platform expansion: phase 2

**Invoices, Bills & Tax** is available from the Financials dashboard and sidebar.
It provides engagement-scoped customers/suppliers, sales invoices, supplier bills,
related sales/purchase credit notes, partial-payment allocations, receivables and
payables ageing, and configurable tax summaries.

### Initial setup and posting

1. In **Accounting Controls**, a manager/admin establishes the engagement's fixed
   base currency. It is not automatically inferred from existing currency labels.
   If ledger entries already exist, the manager must explicitly confirm that
   their amounts already use this base currency. Existing trial balances, budgets,
   and bank statements must agree. Their subsequent API writes enforce the base
   currency. This does not convert legacy ledger amounts.
2. In **Invoices, Bills & Tax -> Contacts & tax codes**, add customers/suppliers.
   Managers/admins can define tax rates from 0% to 100%, a sales/output-tax liability
   account, and a purchase/input-tax asset account. No legal tax treatment is
   inferred from a rate or account; recoverability/compliance must be determined
   outside this generic module. Used rates/account mappings cannot be changed:
   create a new code or deactivate the old one.
3. Create a document draft with a receivable asset or payable liability account.
   Sales lines use revenue accounts; purchase lines use expense/asset accounts.
   Line amounts are **tax-exclusive**, and tax is rounded per line using decimal
   half-up rounding. Saved document lines snapshot the tax rate, tax amount, and
   base-currency amounts. Documents support at most 200 lines.
4. **Prepare journal** freezes the source document and creates a balanced linked
   journal. Approval-enabled engagements receive a submitted journal; otherwise
   it is a draft. Use **Journal Entries** for independent approval and posting.
   Source journals cannot be edited, deleted, or directly reversed: corrections
   belong in the source workflow. Managers can cancel an unposted source or
   payment journal, preserving its history as void and releasing reservations.
   Posting twice does not duplicate ledger rows.

### Manual currency rates, settlements, and reports

- Supported two-decimal currencies are TZS, USD, EUR, GBP, KES, ZAR, AUD, and CAD.
  Every rate means **base-currency units per one document-currency unit**.
  Base-currency documents/payments require a rate of exactly 1. Rates are manually
  entered; no live FX feed is used.
- Receipt/payment amounts are entered in the original document's currency.
  The selected bank/cash account is a base-currency ledger account. A payment rate
  differing from the original rate produces a realised exchange difference.
  Select a revenue account for a gain or an expense account for a loss; the server
  checks the required sign and account type.
- Partial payments and credit notes reserve the original balance while their
  journals are pending. They affect the posted outstanding balance only after
  posting. The final settlement clears the stored base carrying balance,
  including rounding residuals. Overpayments and credits exceeding the available
  balance are rejected atomically.
- Credit notes link to an original posted invoice/bill and use its engagement,
  contact, control account, currency and rate. Amounts are positive, reversing
  sales/output tax or purchases/input tax when posted. Credit notes apply only
  to the unsettled original balance. Full receipt reversals are now supported
  below; partial credit-note refunds, supplier refunds and unallocated credits
  remain unsupported.
- Ageing is an **as-of transaction-date** view of posted documents, payments and
  credits. It reports current, 1-30, 31-60, 61-90 and over-90-day balances by
  document currency, with carrying-value totals in base currency. It does not
  perform period-end FX revaluation or recreate historical posting-time snapshots.
- Tax summaries use posted invoice/bill/credit dates and stored base-currency
  amounts, grouped by tax code. They are accrual summaries, **not statutory
  returns**, cash-basis tax reports, or tax-filing integrations. Payments are not
  counted again as taxable documents.
- All source writes use the phase-1 accounting-period lock, approval policy and
  attributable financial history. Draft source documents also block period close.

Endpoints:

- `/api/financials/contacts/` and `/api/financials/tax-codes/`
- `/api/financials/documents/`, with POST actions `prepare/`, `pay/`, and `cancel/`
- `/api/financials/payments/`, with POST action `cancel/` for unposted payments
- `/api/financials/subledger-reports/ageing/?engagement=ID&kind=invoice&as_of=YYYY-MM-DD`
  (`kind=bill` for payables)
- `/api/financials/subledger-reports/tax-summary/?engagement=ID&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`

Deploy with `python manage.py migrate`; phase 2 adds financials migration `0013`.
Database-backed regression tests are in `apps.financials.test_subledgers`.

### Invoice completion: PDFs, reviewed sending, statements and full receipt refunds

- Open a sales invoice's **Details** to download its PDF. The issuer name uses
  the engagement client's legal name. Unposted invoices are marked DRAFT and
  cancelled invoices are marked CANCELLED; only posted invoices can be emailed.
  These are generic commercial documents, not certified jurisdiction-specific
  fiscal invoices. Unicode-font branding, logos and legal invoice templates
  are not yet configurable.
- **Review invoice email** or **Review overdue reminder** displays the customer's
  stored email, subject and body. **Send reviewed email** requires confirmation.
  Sending rejects changed recipient/message details and reminders for invoices
  that are not overdue or have no balance. Set the contact email in Setup.
  Messages attach the invoice PDF; they are not sent automatically.
- Configure the project-root environment's `EMAIL_BACKEND` as
  `django.core.mail.backends.smtp.EmailBackend`, plus `EMAIL_HOST`, `EMAIL_PORT`,
  `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS` and `DEFAULT_FROM_EMAIL`.
  Restart Django after configuration. Console, dummy and test backends cannot
  claim invoice delivery. SMTP errors are explicit. Successful submissions are
  recorded in financial history and **Load sending history** shows the latest 50.
  SMTP acceptance is not confirmation of customer delivery. Repeated sends send
  another copy; after an uncertain network/server failure, check delivery logs
  before retrying. There is no durable mail queue or bounce tracking yet.
- Under **Ageing & tax reports**, generate a customer statement as of a selected
  date, download PDF or JSON, and review invoice totals/outstanding amounts.
  Only posted invoices and settlements through that transaction date count;
  future receipts/refunds and drafts are excluded. Totals stay separate by
  document currency, without conversion or FX revaluation.
- Managers/admins can **Prepare full receipt refund** for a posted sales-invoice
  receipt, using an open accounting date on/after the receipt and a reason.
  This creates an exact reversing journal, including original FX differences,
  at historical carrying values. It does not initiate a bank transfer.
  The original receipt and posted ledger remain intact. The invoice balance
  reopens only when the refund journal posts; pending refunds do not free capacity.
  Independent approval is required when enabled. Source refund journals cannot
  be edited, deleted or reversed directly. A pending refund can be cancelled;
  that receipt retains its one refund link, so it cannot be refunded again.
  Partial refunds, credit-note cash refunds and customer credit balances are
  separate future workflows.

Additional endpoints:

- GET `/api/financials/documents/{id}/pdf/`
- GET `/api/financials/documents/{id}/delivery-preview/?kind=invoice` (or `reminder`)
- POST `/api/financials/documents/{id}/send/`: reviewed `kind`, `recipient`, `subject`, `body`
- GET `/api/financials/documents/{id}/delivery-history/`
- GET `/api/financials/contacts/{id}/statement/?as_of=YYYY-MM-DD` (add `download=pdf`)
- POST `/api/financials/payments/{id}/refund/`: `transaction_date`, `reason`
- POST `/api/financials/payments/{id}/cancel-refund/`

No new schema migration is required. Regression tests are in
`apps.financials.test_invoice_completion`.

## Accounting platform expansion: phase 3a - fixed assets

**Fixed Assets** is available from the Financials dashboard and sidebar. It
provides an engagement-scoped asset register, straight-line monthly depreciation,
new-acquisition journals and disposal/write-off journals in the fixed base
currency configured in Accounting Controls.

1. Managers/admins register the asset number, capitalised cost, residual value,
   acquisition date, first depreciation month, useful life in months, asset cost
   account, separate accumulated-depreciation contra-asset account, and expense
   account. The cost is already capitalised and tax-exclusive; recoverable tax
   and acquisition payments are not inferred or posted by this workflow.
2. For **new acquisitions**, select a funding/offset asset, liability or equity
   account. Save an editable draft, then **Prepare acquisition journal** to debit
   asset cost and credit funding. Review/approve/post it before depreciation or
   disposal. Do not do this when a supplier bill already posted the asset cost.
3. For **already-recorded assets**, confirm that cost and opening accumulated
   depreciation already exist in the base-currency ledger before the opening
   register month. Enter the remaining depreciation months from that month.
   Registration generates **no acquisition or opening journal** and does not
   reconcile the declared balances automatically. These records, including
   fully depreciated assets, are immediately registered and immutable.
4. Depreciation uses a **full-month convention**, starting in the selected month
   and posting at each calendar month-end, including leap years. There is no
   daily proration. Cumulative rounded targets allocate cost less residual value
   and opening depreciation over the selected months; the final posting absorbs
   rounding residuals without depreciating below residual value. A nonzero
   remaining depreciable value must allow at least 0.01 per scheduled month.
   Zero remaining depreciable value requires no depreciation postings.
5. Prepare one month at a time, then review/approve/post. A pending journal
   reserves that month's activity; missing, duplicate and out-of-order months
   are rejected. Only posted depreciation affects accumulated depreciation and
   net book value. The register is a **current posted-state view**, not an
   as-of-date roll-forward report.
6. Managers/admins can prepare a disposal after all depreciation through the
   previous month is posted. **No depreciation is charged in the disposal
   month.** Enter base-currency proceeds, a separate bank/cash account if proceeds
   are nonzero, and a revenue gain or expense loss account when needed. Disposal
   removes gross cost and accumulated depreciation and recognises the difference
   between proceeds and carrying value. Zero proceeds supports a write-off.
   Proceeds exclude tax; disposal-tax accounting is not automated.

Generated journals follow the existing independent-approval setting, period
locks, provenance and financial API history. Prepared acquisitions and registered
assets cannot be edited/deleted; source journals cannot be edited, deleted or
directly reversed. Managers can cancel an unposted asset event to release its
reservation. Cancelling an unposted acquisition leaves its registration cancelled;
create a corrected asset under a new number. Posted asset transactions cannot be
cancelled or reversed in this phase. Period close blocks draft acquisitions,
pending journals and due, unposted scheduled depreciation.

Endpoints:

- `/api/financials/fixed-assets/?engagement=ID`, with POST actions `acquire/`,
  `depreciate/` (`period_end`), `dispose/` (`transaction_date`, `proceeds`, optional
  `bank_account` and `gain_loss_account`), and `cancel-acquisition/` on asset IDs.
- `/api/financials/fixed-asset-events/{id}/cancel/` for unposted events.

Deploy with `python manage.py migrate`; this phase adds financials migration `0014`.
Database-backed regression tests are in `apps.financials.test_fixed_assets`.
Reducing-balance depreciation, revaluation, impairment, useful-life amendments,
partial disposals, asset transfers and posted asset corrections remain out of scope.

## Accounting platform expansion: phase 3b - inventory

**Inventory** is available from the Financials dashboard and sidebar. It supports
standalone perpetual stock movements valued at **moving weighted-average cost**
in the engagement's fixed base currency. This phase does not automatically link
stock to invoice, bill or credit-note lines.

### Setup and opening stock

Managers/admins create stock items with a unique engagement SKU, name, unit,
inventory asset account and cost-of-goods-sold/expense account. Quantities support
four decimals; carrying values use two. Used SKUs, units and account mappings are
immutable. Names can be changed and used items can be deactivated, not deleted.

Opening stock is permitted only before the item's first recognised movement:

- **Journal-backed opening:** debit inventory and credit a selected equity
  account. Review/approve/post the journal to recognise quantity and value.
- **Confirmed register-only opening:** a manager confirms the opening quantity
  and value are already represented in the base-currency ledger, for example in
  the engagement's opening balances. No ledger journal is generated. The stock
  is immediately recognised, logged and immutable; it cannot be cancelled.
  This confirmation is not an automated reconciliation to the ledger.

If the engagement has an opening-balance journal, post it first. All stock
movement dates, including register-only openings, must be on or after its date
and outside closed periods.

### Movements and costing

- **Receipts:** enter positive quantity and **total** capitalised base-currency
  value, not unit cost. The journal debits inventory and credits a separate
  bank/cash asset or payable/clearing liability account.
- **Issues:** enter positive quantity. The server computes carrying value from
  current posted stock, debits the configured expense/COGS account and credits
  inventory. Selling price, revenue and tax are not part of this movement.
- **Positive adjustments:** managers enter quantity and total value, crediting
  a selected expense, revenue or equity account.
- **Negative adjustments:** managers enter quantity; value is computed at
  moving average, debiting a selected expense account.
- All movements require a recorded reason; references are optional. Incoming
  values must be greater than zero. Outgoing costs use the unrounded ratio of
  current carrying value to quantity, rounded half-up to two decimals. Full
  depletion clears all remaining value, absorbing rounding residuals.
  If a partial issue rounds to zero, combine quantities. If it would leave
  positive quantity with zero rounded value, issue the full remaining quantity.
  Zero-value/free stock is not supported in this phase.
- Negative stock is rejected. Dates cannot precede the item's last recognised
  movement. Same-date movements are valued sequentially in posting order.
  Earlier backdated changes do not trigger retrospective recosting.

Only one pending journal-backed movement is allowed per item. Pending quantities
and values do not affect current stock; post or cancel the pending movement
before recording another. Posting rechecks the prepared balance snapshot, uses
the existing journal approval policy and prevents duplicate ledger rows.
Managers can cancel unposted movements; void records retain history and release
the reservation. Source journals cannot be edited, deleted or directly reversed.
Posted movements are immutable; use a later supported adjustment for a correction.
Cancellation is not a purchase/sales return or refund workflow.

The screen shows current quantities, carrying values, average cost (six display
decimals), and movement history. Pending/void rows retain their **proposed**
before/after snapshots; these are not current balances. Period close blocks
pending stock journals. Receipts/issues can be prepared by non-guest staff;
item setup, opening stock, adjustments and cancellation require a manager/admin.
API mutations participate in transactional Financial Workflow Activity.

**Avoid duplicate accounting:** do not also post the same inventory cost through
a supplier bill. This standalone phase does not allocate a bill to stock or
reconcile inventory control accounts automatically. Tax and payments are handled
separately. Warehouses, transfers, lots/serials, unit conversions, manufacturing,
returns, automatic document integration, as-of roll-forwards, stocktakes and
low-stock alerts remain out of scope.

Endpoints:

- `/api/financials/inventory-items/?engagement=ID`
- POST `/api/financials/inventory-items/{id}/move/`: `kind`, `transaction_date`,
  `quantity`, `reason`, optional `reference`; incoming kinds require `total_value`.
  Journal-backed opening/receipt/adjustments require `offset_account`; issues
  always use the item's expense account. Register-only openings use
  `register_only=true`, `confirm_existing_balance=true`, and no offset account.
- `/api/financials/inventory-movements/?engagement=ID`
- POST `/api/financials/inventory-movements/{id}/cancel/` for an unposted journal.

Deploy with `python manage.py migrate`; this phase adds financials migration `0015`.
Database-backed regression tests are in `apps.financials.test_inventory`.

Remaining expansion phases, **not implemented by phases 1-3b**:

1. Partial/supplier refunds, unallocated credit/payment handling, automatic
   reminder scheduling, purchase orders, foreign-currency bank balances
   and period-end FX revaluation.
2. Recurring journals, year-end closing/rollover, advanced inventory operations,
   and the additional fixed-asset operations listed above.
3. Split/combined bank matching, outstanding items and bank rules, comparative
   reports, cash-flow/equity statements, PDF/CSV exports, saved reviewer sign-off,
   fiscal-year budget scenarios, and forecasting.
4. QuickBooks/Xero connectors and bank feeds. These require supported provider
   connections and credentials. Tax filing/local compliance requires an agreed
   jurisdiction and rules; it must not be inferred from the TZS display currency.

## Audit Intelligence: saved journal-testing and sampling runs

**Audit Intelligence** is available from the Financials dashboard/sidebar. It
creates persisted, immutable snapshots of a scoped **posted-journal population**,
screening results and selected sample. It does not post or change journals,
and it can analyse historical closed periods.

### Scope and sampling

Select an engagement, inclusive transaction-date range, journal source (all,
manual, import, adjustment or other), run name, sample size, seed, monetary
thresholds and enabled rules. Journals must already be posted. Standalone GL
imports without journal headers are **not** included. Generated invoice/payment,
asset and stock journals use the `other` source.

- **Seeded random:** sort journals by SHA-256 of canonical JSON containing the
  seed, journal ID and algorithm version, then take the requested number without
  replacement. Ranking is deterministic across Python versions, independent of
  global random state. The same IDs/seed/version give the same ranking; a changed
  population may change membership.
- **High-value targeted:** take the largest numeric total-debit journals,
  breaking ties by ascending journal ID. The recorded seed is not used by this
  method. This is non-statistical targeted selection.
- Sample size must be 1-1,000 and cannot exceed the matching population.
  Empty populations are rejected rather than saved as successful empty runs.
  Maximum scope is 10,000 journals and 50,000 lines. Larger scopes fail explicitly;
  narrow the date range/source rather than relying on silent truncation.
- The module does not calculate statistical confidence, monetary-unit sampling,
  materiality-driven sample sizes, extrapolated errors or audit assurance.
  Monetary screening and sample-size inputs remain auditor decisions.

### Screening rules

All enabled rules run against the **full population**, not just sampled journals:

- Total debit at or above the selected large-journal threshold.
- Saturday/Sunday transaction dates, not posting timestamps or jurisdictional
  holiday calendars.
- Total debit at/above the threshold and exactly divisible by the chosen
  round-amount increment.
- Missing recorded preparer; incomplete recorded approval; recorded preparer
  equal to approver. Missing approval is a review candidate, not proof that
  approval was required historically. Current approval policy is captured only
  as run-time context, not retrospectively applied to historical journals.
- Potential duplicates sharing date, nonempty normalized reference,
  normalized description, source, account-line amounts and dimension IDs.
  Journal numbers are deliberately excluded. Legitimate repeated postings remain
  possible and must be investigated.
- Unbalanced totals, fewer than two lines or invalid line debit/credit signs.
- Missing/inconsistent posted ledger provenance for a line, checking status,
  engagement, account, transaction date and amounts. Legacy journals may lack
  these links without representing a current posting error.

Every finding records its rule, journal IDs and explanation. It is a **review
candidate, not a confirmed error, fraud finding or auditor conclusion**.
Review dispositions and independent sign-off are maintained separately through
the finding review workflow below. Private evidence can be linked separately
using the evidence panel.
An empty findings list is not an assurance conclusion.

### Saved snapshots and exports

Each run retains its algorithm version, parameters, actor/time, full captured
journal/line/account/dimension labels, approval metadata, line-ledger consistency,
selected IDs, findings, population/sample total debits and a SHA-256 population
fingerprint. The fingerprint hashes the canonical captured population, not
parameters/results; different seeds can therefore share a population fingerprint.
It is a comparison aid, not a digital signature or external tamper-proof seal.
Run totals are sums of journal debits, not net ledger balances.

Snapshots are independent of subsequent live record/label changes. The screen
paginates sample/population/findings locally in groups of 25, preserving all saved
records in **Export full saved run (JSON)**. Live journal navigation is clearly
labelled because live values may differ from the saved snapshot.
Base-currency context is recorded; if unset, the result warns that value-based
analysis needs currency confirmation. No FX conversion is performed.

Non-guest authenticated users can create runs; guests can read them. The API
has no update/delete actions and normal model saves/deletes reject changes to
saved runs. Direct SQL/bulk updates and database-administrator tampering are not
prevented by this application-level immutability. Engagements referenced by runs
cannot be deleted. Creation records a transactional Financial Workflow Activity
event containing run metadata, not another copy of the full population.

Endpoints:

- POST `/api/financials/intelligence-runs/` with `engagement`, `name`, `date_from`,
  `date_to`, `source`, `sampling_method`, `sample_size`, `seed`, `amount_threshold`,
  `round_increment` and `rules`.
- GET `/api/financials/intelligence-runs/?engagement=ID&page=N` for paginated
  summaries (25 per page), without heavyweight population snapshots.
- GET `/api/financials/intelligence-runs/{id}/` for a full saved run.

Deploy with `python manage.py migrate`; this phase adds financials migration `0016`.
Database-backed regression tests are in `apps.financials.test_intelligence`.

## Finding review and independent sign-off

Open a saved **Audit Intelligence** run, select **Screening findings**, then use
**Finding review and independent sign-off**. The selector follows the current
25-finding page; status totals cover the entire saved run, including unreviewed
findings. Displayed finding numbers start at 1, while API indices start at 0.

Staff, auditors, managers and admins can record a mandatory investigation
conclusion and action rationale with one outcome:

- **Explained / no exception identified**
- **Exception confirmed**
- **Further work required**

A different manager/admin from the current outcome preparer must sign off.
Further-work outcomes cannot be signed off; resolve the work and record another
outcome first. Sign-off of a confirmed exception means the exception was reviewed,
not that it was corrected, posted, resolved or incorporated into an audit opinion.
No automatic ledger adjustment or audit conclusion is generated.

Managers/admins can return a reviewed outcome for further work. Signed-off
findings cannot be revised until a manager/admin reopens them with a reason.
Return, sign-off and reopen refer to the exact saved predecessor and copy its
outcome/conclusion. Unsaved form changes do not change the conclusion being
signed off. Revisions append new records; they never overwrite the old outcome.

Each action preserves actor ID/name/role at action time, timestamp, rationale,
conclusion, predecessor and the finding-specific evidence link IDs captured when
the outcome was prepared. Run-level and journal-level attachments are not
automatically included. Sign-off freezes the same evidence link scope; later
uploads do not alter it. Review history displays those IDs, and the private
evidence panel provides downloads. Sign-off may have no linked files if the
recorded investigation is adequate; the system does not assert that adequacy.
There is no enforced procedure/assertion checklist or PBC completion control.

The review history is separate from immutable run results and the population
fingerprint. Its model has no ordinary update/delete path, and the API offers
only create/list/retrieve/status. Direct SQL/bulk updates and database
administrator changes remain outside these application controls.
Actor identity snapshots remain when a user account is deleted.
Creation writes metadata to Financial Workflow Activity in the same transaction.
Audit reviews remain allowed after a ledger period closes.

Concurrent actions serialize by engagement policy lock. Every submission must
include the last seen action ID (or null for an unreviewed finding); stale
submissions return **409 Conflict**, rather than silently replacing another
reviewer's work. Refresh the review status before retrying. Guests can read
status/history but cannot record actions. Existing AUD financial access scope
applies; no new engagement membership restrictions are introduced.

Endpoints:

- POST `/api/financials/finding-reviews/` with `run`, `finding_index`, `action`
  (`review`, `sign_off`, `return`, `reopen`), required `expected_previous`
  (null or latest action ID) and required `note` (maximum 5,000 characters).
  `review` additionally requires `outcome` (`explained`, `exception`, `follow_up`)
  and `conclusion` (maximum 5,000 characters); other actions reject those fields.
- GET `/api/financials/finding-reviews/?run=ID&finding_index=INDEX&page=N`
  for newest-first history (25 per page); omit finding_index for the whole run.
- GET `/api/financials/finding-reviews/{id}/` for one immutable action.
- GET `/api/financials/finding-reviews/status/?run=ID&offset=N` for whole-run
  state counts and current actions for 25 finding indices starting at offset.

Saved-run JSON exports still contain only the original run, not subsequent
review history or evidence links. This workflow is finding-level sign-off,
not engagement/statement sign-off, legal e-signature, audit opinion approval
or a tamper-proof certification.

Deploy with `python manage.py migrate`; additive migration `0018` creates review
history. Database-backed regressions: `apps.financials.test_finding_reviews`.

## Financial Audit Trace

**Financial Audit Trace** is available from the dashboard/sidebar and each account
row in **Adjusted Trial Balance**. Select an engagement, trial balance and account
to inspect a read-only current trace:

- Original debit/credit and signed balance, plus only **posted** audit adjustment
  contributions, equals the current adjusted balance. Proposed/rejected
  adjustments are displayed but excluded from the calculation. Adjustment-only
  accounts can be traced even without an original TB line.
- Lead schedules explicitly linked to the same TB/account, their stored balances,
  differences from the current adjusted TB, supporting-detail totals, statuses,
  auditor notes and conclusions. Stored lead balances are not silently refreshed.
- Posted ledger **account/date candidates**, their full scoped totals, and the
  difference to the original TB. This is not explicit TB import lineage.
  With an applicable posted opening journal, scope begins at the opening date;
  otherwise it is period activity only. The fixed base currency must agree with
  the TB for the currency assumption to be marked confirmed.
- Explicit ledger-to-journal-line provenance, including account, debit/credit,
  date, engagement and posted-status consistency checks. Missing legacy/import
  provenance and inconsistent links are flagged, not inferred from references.
  Linked journals show their recorded preparer, approver and approval time.
- Explicit journal links to invoice/bill/credit documents, payments, asset
  acquisitions/depreciation/disposals and inventory movements, with source IDs
  and navigation to the relevant module. Manual journal source documents are not
  invented when no linked record exists.

The trace does **not** assert that matching balances establish completeness,
that an audit adjustment was posted to the GL, or that supporting-detail reference
text is attached evidence. Private attachments are now available through explicit
evidence links; textual references remain distinct. Procedure/assertion links, review
sign-off, full statement-line aggregation/mappings and formal lineage for imported
TBs remain future work. No AI or fraud conclusion is generated by this screen.

GET `/api/financials/trial-balances/{id}/trace/?account=ACCOUNT_ID` accepts
`page_size` (1-100, default 25), `ledger_offset` and `adjustment_offset`. Pagination
is deterministic; totals cover all scoped records, not just the displayed page.
Lead support is limited to 100 displayed records with the full count/totals
reported; open the lead schedule for full details. Cross-engagement accounts and
accounts absent from both the TB and its adjustments return 404. Invalid
parameters return 400.

**Export displayed trace (JSON)** downloads the current response pages and full
totals, plus export time and an explicit page-scope label. This is a transient
snapshot, not persisted sign-off or a complete paginated evidence archive.
The feature requires no database migration. Regression tests are in
`apps.financials.test_trace`.

## Private financial evidence

**Audit Intelligence** and **Financial Audit Trace** include a private evidence
panel. Choose a target, upload and link a document in one atomic request, or reuse
an attachment from the same engagement. Both the engagement attachment selector
and linked evidence list paginate in groups of 25. Failed target validation rolls
back the upload and metadata activity; it does not leave an unlinked attachment.

Supported targets are the saved run, an individual saved finding, a TB/account
trace, a ledger entry, journal, adjustment, lead schedule, supporting detail,
invoice/bill/credit document, payment, fixed asset/event, inventory item/movement
or PBC document request.
Run findings use the immutable run ID and **zero-based finding array index**.
The intelligence panel offers findings/journals from the current result page.
The trace panel offers the account plus records and explicit sources from its
current pages. API callers can link other supported records by ID.

Files are stored as private PostgreSQL binary data, not public media URLs.
Allowed formats are PDF, PNG, JPEG and UTF-8 CSV/TXT, nonempty and at most
**10 MiB (10,485,760 bytes)** per file. Extension/magic checks are applied to
PDF/images; text must decode as UTF-8 without null bytes. These are basic
format checks, **not full document validation or malware scanning**. Download
untrusted files only with appropriate local protection; CSV files may contain
spreadsheet formulas. Upload processing may use Django temporary files before
database persistence. There is no total engagement quota or content deduplication.

Downloads require normal AUD authentication, verify stored length and SHA-256,
and force an attachment with `application/octet-stream`, `nosniff`, and private
no-store caching. The UI independently verifies the downloaded size and SHA-256.
Metadata lists and history exclude binary content. Existing AUD financial role
access applies: guests may read/download but cannot upload or link.

Evidence bytes/metadata and link target/note snapshots are immutable through
ordinary model saves/deletes and the API has no update/delete actions. Upload
a new file for a correction; existing versions and links remain retained.
Application immutability is not protection against direct SQL/bulk updates or
database administrators. No legal retention policy or redaction workflow is
provided. Database backups must include this binary content.

Links validate same-engagement live targets when created and retain identifying
metadata thereafter. Generic target IDs do not prevent later deletion/change of
the live target. Links do not assert historical document authenticity, audit
adequacy, lineage, completeness or reviewer sign-off. Checksums are integrity
checks, not signatures. Adding support never edits saved run snapshots or their
population fingerprints, and is allowed after a ledger period is closed.
Existing JSON exports do not embed file bytes or these separately maintained links.

Endpoints:

- POST `/api/financials/evidence/` multipart with `engagement`, `title`, optional
  `description`, and `file`. Optional atomic linking requires `target_kind`,
  `target_id`, `selector` and mandatory `note` together.
- GET `/api/financials/evidence/?engagement=ID&page=N`, and GET
  `/api/financials/evidence/{id}/` for metadata.
- GET `/api/financials/evidence/{id}/download/` for a verified private download.
- POST `/api/financials/evidence-links/` with `evidence`, `target_kind`,
  `target_id`, `selector` (default `-1`) and mandatory `note`.
- GET `/api/financials/evidence-links/?engagement=ID&page=N`; optionally provide
  both `target_kind` and `target_id`, plus `selector`, to filter. GET
  `/api/financials/evidence-links/{id}/` retrieves one link snapshot.

For `account_trace`, `target_id` is the TB ID and `selector` is the account ID.
For `run_finding`, they are run ID and zero-based finding index. All other
target kinds require selector `-1`.

Deploy with `python manage.py migrate`; additive migration `0017` creates the
evidence tables. Database-backed regressions: `apps.financials.test_evidence`.

## PBC document requests and evidence tracking

**PBC Document Requests** is available from the Financials dashboard and sidebar.
This phase is an **internal** prepared-by-client register: audit staff upload
documents supplied by clients. It does not create a client portal, send emails
or notifications, assign application users, or integrate statutory filing.

Create an engagement request with title, required documents/period, client
contact, internal responsible person, due date and low/normal/high priority.
Client contact and responsible person are recorded text, not verified identities.
Past due dates are allowed for recording existing outstanding requests.
Requests are ordered by due date then ID and paginated in groups of 25.
State/overdue filters apply to the register; summary counts cover the entire
engagement. Overdue means due date before the server's current local date,
excluding accepted/cancelled requests; due today is not overdue.

Workflow:

1. **Open**: upload and explicitly link new private evidence or reuse an
   engagement attachment through the request's evidence panel.
2. Select request-linked documents and record a mandatory submission rationale.
   A package contains **1-100 distinct evidence link IDs**, not all attachments
   implicitly. Selections persist across the 25-document selector pages.
   Uploading/linking alone does not change request status.
3. **Submitted for review**: a manager/admin accepts the exact package or returns
   it with a reason. Staff/auditors cannot make these decisions.
4. **Returned for documents**: staff can link additional documents and resubmit
   an explicitly selected replacement package. Older packages remain in history.
5. **Accepted**: a manager/admin must reopen the request before more documents
   can be linked/submitted. Acceptance is package review, not proof of audit
   completeness, finding sign-off, correction of transactions or an audit opinion.
6. Managers/admins may **cancel** any non-cancelled request with a reason.
   Cancellation is terminal; records and attachments remain retained.

Managers/admins may also submit packages and accept their own PBC submissions.
This workflow uses role-based acceptance, **not** the independent-preparer
sign-off required by the separate finding-review workflow.
Guests can read requests, history and evidence but cannot create or submit.
Existing AUD financial access scope applies; no new engagement-membership
restrictions are introduced.

Request metadata is immutable in this first version. To correct scope, contact,
responsible person or deadline, a manager/admin cancels the old request and staff
create a replacement. The replacement is not automatically linked to the old
request. There is no reminder scheduler, bulk request template, formal procedure/
assertion mapping, partial acceptance, due-date extension or request export yet.

Each workflow action appends immutable actor ID/name/role, time, rationale,
previous action and package evidence link IDs. Acceptance/return/reopen retain
the same package scope. Private bytes, original filenames and hashes remain in
the existing evidence tables and are downloaded through authenticated,
integrity-checked endpoints. Link IDs appear in the evidence panel so packages
can be matched to their files. No untrusted documents are previewed inline.
Only open/returned requests accept new links; invalid linked uploads roll back
the new file and history atomically.

Engagement locks serialize submissions, decisions and evidence-link creation.
Every workflow action requires `expected_previous` (null or last action ID).
Stale actions return **409 Conflict**; refresh before retrying. Metadata-only
financial activity events are recorded in the same transaction. Closed ledger
periods do not block document workflows and PBC actions never post journals.
Ordinary saves/deletes and API updates/deletes are prohibited; direct SQL/bulk
updates and database-administrator changes are outside application immutability.

Endpoints:

- POST `/api/financials/pbc-requests/` with `engagement`, `title`, `description`,
  `requested_from`, `responsible_name`, `due_date` and `priority` (default normal).
- GET `/api/financials/pbc-requests/?engagement=ID&page=N`; optional `state`
  (`open`, `submitted`, `returned`, `accepted`, `cancelled`) and `overdue`
  (`true`/`false`). Omitting overdue includes both overdue and non-overdue.
- GET `/api/financials/pbc-requests/{id}/` for current status/metadata.
- GET `/api/financials/pbc-requests/summary/?engagement=ID` for status totals,
  overdue count and server date. Optional filters use the same rules as list.
- POST `/api/financials/pbc-events/` with `request`, `action` (`submit`,
  `accept`, `return`, `reopen`, `cancel`), required `expected_previous`, and
  mandatory `note` (maximum 5,000 characters). Only submit accepts and requires
  `evidence_link_ids` (1-100). All links must explicitly target this request and
  belong to its engagement.
- GET `/api/financials/pbc-events/?request=ID&page=N` for newest-first history,
  or GET `/api/financials/pbc-events/{id}/` for one action.
- Existing evidence upload/link APIs support `target_kind=pbc_request`,
  `target_id=REQUEST_ID`, `selector=-1`.

Deploy with `python manage.py migrate`; additive migration `0019` creates PBC
tables and extends evidence targets. Regression tests: `apps.financials.test_pbc`.

## Mapped and comparative financial statements

**Mapped & Comparative Statements** is available from the Financials dashboard
and sidebar alongside the existing basic Financial Statements screen.
Managers/admins define engagement-specific codes, labels, display orders and
note references within asset, liability, equity, revenue and expense groups.
Each account explicitly maps to one same-engagement/same-group line; multiple
accounts can share a line. These mappings do not replace or infer the legacy
account statement-section field. No default mappings are created automatically.
Note references are labels, not generated disclosure text or a disclosure
compliance checklist.

Select a current trial balance and optionally an earlier, non-overlapping
comparative TB from the same engagement and currency. Both columns use the
**current configuration**, including comparative-only and adjustment-only
accounts. Different period lengths are warned about, not normalized.
No FX conversion occurs.

The report reuses the existing adjusted-TB calculation: original debit less
credit plus **posted** adjustment debits less credits. Proposed/rejected
adjustments are excluded. Original, adjustment and adjusted signed balances
are visible on account drill-down, with live audit-trace links for both periods.
Saved values can differ from subsequent live trace records.

Statement display is debit-positive for assets/expenses and credit-positive
for liabilities/equity/revenue. Contra accounts retain negative display values.
Profit is revenue less expense. The position reconciliation is assets less
liabilities, equity and current-period profit; profit is shown separately,
not automatically posted to retained earnings. If the TB already includes a
profit transfer, confirm it does not double-count closing revenue/expense.

Unmapped and inconsistent mappings remain visible and block approval, even if
their net amount is zero. Full-TB group totals include unmapped balances;
statement-line totals omit unmapped accounts. These different scopes are
labelled explicitly. Checks include adjusted TB difference, position
difference, mapped/unmapped signed nets, account count and posted-adjustment
count for each selected period. Duplicate TB account rows, invalid period
dates and foreign-engagement posted adjustment/account metadata are rejected.

Staff/auditors/managers/admins can save an **immutable statement version**,
including incomplete drafts for review. The version captures period metadata,
mapping/line labels, note references, account balances, reconciliation checks,
warnings and SHA-256 fingerprint. It is independent of subsequent live account,
TB, mapping or adjustment changes. Source TB IDs are identifiers in the
snapshot, not deletion-protecting foreign keys.

A manager/admin other than the version preparer may approve only versions with
complete mappings, nonempty selected periods and exact zero balance differences.
Approval records reviewer identity, time and rationale separately; it does not
change captured results/fingerprint. Subsequent mapping edits do not invalidate
or silently refresh an approved historical version. Save a new version for
new data or a correction. There is no approval revocation workflow.

Version approval is review of these financial reports, **not an audit opinion,
statutory certification, legal signature or finding sign-off**. Fingerprints
are integrity/comparison aids, not externally signed tamper-proof seals.
Ordinary version/approval saves/deletes and API update/delete actions are
prohibited; direct SQL/bulk updates and database administrators remain outside
application immutability. Configuration writes are engagement-locked and
metadata activity is recorded transactionally; they do not post ledger entries.
Guests can read but cannot configure, prepare or approve.

JSON export includes the full preview or saved version plus its approval.
CSV export includes labelled version/period/currency/approval context, mapped
line columns, full-TB totals/reconciliation and unmapped balances. Text cells
that could start spreadsheet formulas are neutralized; monetary values remain
numeric strings. No native XLSX/PDF, full disclosure notes, cash-flow or
changes-in-equity statement is generated in this phase. Exports do not include
private evidence bytes or finding reviews.

Endpoints:

- `/api/financials/statement-lines/`: manager/admin create/update/delete
  configuration; GET list requires `engagement=ID`. Assigned lines cannot be
  deleted or moved to an incompatible group until mappings are reassigned.
- `/api/financials/statement-mappings/`: manager/admin create/update/delete
  explicit `{account, line}` assignments; GET list requires `engagement=ID`.
- GET `/api/financials/statement-versions/preview/?current=TB_ID&comparison=TB_ID`
  for live calculations; comparison is optional.
- POST `/api/financials/statement-versions/` with `current`, optional
  `comparison`, and required `name` to save a captured version.
- GET `/api/financials/statement-versions/?engagement=ID&page=N` for 25
  metadata summaries per page without heavyweight results; GET
  `/api/financials/statement-versions/{id}/` for a full snapshot.
- POST `/api/financials/statement-versions/{id}/approve/` with mandatory
  `note` (maximum 5,000 characters).

Deploy with `python manage.py migrate`; additive financials migration `0020`.
Regression tests: `apps.financials.test_statements`.

## Existing comparisons and smart-audit checks

The Financials dashboard includes **Comparisons & Smart Audit**. Choose a current
trial balance and, optionally, an earlier, non-overlapping trial balance from the
same engagement and currency. The read-only endpoint is
`GET /api/financials/trial-balances/{id}/analysis/`; optional parameters are
`comparison_id`, `amount_threshold` (default `0.00`), `percent_threshold`
(default `25.00`), and `reconcile_ledger` (default `false`).

The report compares account-level net balances, includes new and removed
accounts, and screens for unbalanced trial balances, balances on an unexpected
normal side, significant account movements, potential duplicate posted ledger
lines, and large manual ledger lines and posted journals. Duplicate detection
requires a nonempty reference and an exact match of transaction attributes.
Thresholds are review-screening inputs, not audit materiality. Net balances are
debit-positive and credit-negative; the movement percentage uses the absolute
comparison balance and is undefined when that balance is zero. Period lengths
are not normalized.

The optional TB-to-ledger check compares closing TB balances to posted ledger
net activity and can report differences when opening balances are not present.
Enable it only when that comparison is appropriate. Existing general-ledger
records have no currency field, so confirm the currency assumption. Rules
produce review candidates, not confirmed errors, fraud findings, or audit
assurance. Contra balances and repeated postings can be legitimate. The export
is a downloadable JSON snapshot; it is not persisted reviewer sign-off or a
change-history log.

## Budgeting and bank reconciliation

The budgets page stores calendar-year, monthly P&L account budgets (revenue and
expense accounts only). Draft budgets can be edited; approval records the
approver and makes the budget and its lines read-only. Budget-vs-actual reports
use posted general-ledger entries for the same engagement and calendar year;
revenue and expense variance signs are presented so favorable is explicit.
General-ledger entries do not currently store currency, so confirm that actuals
use the budget currency before relying on the report. Engagement-scoped class,
location, and project values can be assigned in combinations to budget lines
and ledger entries; journal-line tags carry through when journals are posted.
Budget actuals are grouped only against the exact same dimension combination.
Older and untagged activity remains in the separate "Unsegmented" group. Values
already assigned to budgets or ledger entries cannot be renamed or deleted, but
can be deactivated to prevent new assignments.

The bank reconciliation page creates a statement for an engagement's asset
account, imports CSV with unique headers `date,description,reference,amount`,
and offers review-only match suggestions against posted ledger lines for the
same account and exact signed amount. Suggested posting dates may differ by up
to three calendar days; candidates are ranked by date, reference and description
similarity. A match is never applied automatically, and the selected ledger line
must still satisfy the same-account, exact-amount and date-window checks.
Amounts are positive for bank inflows and negative for outflows. Imports are
limited to 10 MB and 10,000 rows. Final reconciliation requires every statement
line and every posted ledger line in the selected period to be matched, a
supplied book opening balance, and zero statement and bank-to-book differences.
This version does not support live bank feeds, amount-tolerance or one-to-many
matching, or outstanding-cheque/deposit adjustments. The lead-schedule
supporting-detail reconciliation remains separate.

Financial Workflow Activity records budget and bank-workflow create/update,
approval, import, match/unmatch, deletion, and reconciliation events, as well as
financial-dimension setup changes. Phase 1 also records core financial API
mutations as described above. These workflow events complement, but do not
replace, formal audit evidence and review sign-off.

Product references: [Xero bank reconciliation](https://www.xero.com/us/accounting-software/reconcile-bank-transactions/),
[QuickBooks budgeting](https://quickbooks.intuit.com/learn-support/en-us/help-article/taxation/create-import-budgets-quickbooks-online/L7SvmSAsU_US_en_US),
[QuickBooks audit log](https://quickbooks.intuit.com/learn-support/en-us/help-article/audit-log/use-audit-log-quickbooks-online/L2WoVnW6I_US_en_US),
and [IAASB risk assessment guidance](https://www.iaasb.org/focus-areas/identifying-and-assessing-risks-material-misstatement).

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
