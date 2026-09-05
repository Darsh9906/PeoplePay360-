# PeoplePay360 — HR & Payroll

An integrated HR and payroll platform: employee master data, contracts, working
schedules, attendance, time off, salary structures, pay runs, payslips (PDF +
email), and a live payroll dashboard.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Drizzle ORM ·
Postgres (Neon) · TanStack Query · Tailwind v4 · @react-pdf/renderer · Resend

## Getting started

```bash
npm install
cp .env.example .env      # then fill in DATABASE_URL
npm run db:migrate        # apply schema migrations
npm run dev               # http://localhost:3000
```

The app ships with **no fixture data**. Either bootstrap an admin and enter data
through the UI, or run the end-to-end flow below, which builds a complete
dataset through the real API.

```bash
# creates the first admin when the users table is empty
curl -X POST http://localhost:3000/api/auth/bootstrap \
  -H 'Content-Type: application/json' \
  -d '{"name":"Admin","email":"you@example.com","password":"choose-a-password"}'
```

### Environment

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Neon/Postgres connection string |
| `RESEND_API_KEY` | no | Enables real email delivery; without it sends are logged and reported as skipped |
| `RESEND_FROM_EMAIL` | no | From address for outgoing mail |
| `APP_URL` | no | Base URL used in invite / reset links |

## End-to-end flow test

`npm run test:e2e` empties the database and then rebuilds it by calling the HTTP
API exactly as the browser does, asserting the business rules at every step —
64 checks across ten stages:

| Stage | Covers |
|---|---|
| 1. Bootstrap & auth | first-admin bootstrap, re-bootstrap refused, anonymous reads rejected, bad password rejected |
| 2. HR master data | departments, schedules (weekly hours **derived** from the day pattern), employees, duplicate-code conflict |
| 3. Salary config | structure plus 7 rules spanning basic / allowance / gross / deduction / net |
| 4. Contracts | schedule and contract type resolved from real data, not assumed |
| 5. Time off | draft allocation is unspendable, approval creates balance, over-booking rejected, approval consumes days, refusal releases them |
| 6. Attendance | full period recorded, duplicate day conflicts |
| 7. Pay run | eligibility screening, selective creation, compute, **arithmetic verified against the rule definitions**, proration for absence and paid leave, validate, mark paid, paid runs undeletable |
| 8. Payslip PDF | renders a real PDF |
| 9. Dashboard | totals reconcile with the payslips, department filter narrows correctly |
| 10. RBAC | each role sees exactly what the spec allows |

```bash
npm run dev                  # in one terminal
npm run test:e2e             # in another — leaves the data in place
npm run test:e2e -- --clean  # or tear it back down afterwards
```

Without `--clean` the accounts it creates stay usable for demoing
(password `Password123!`): `admin@`, `hr@`, `payroll.user@` and
`dev.patel@peoplepay360.test`.

`npm run db:reset` empties every table on its own.

## Scripts

| Script | Does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run db:generate` | Generate a migration from `db/schema.ts` |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:reset` | Empty every application table |
| `npm run test:e2e` | Full end-to-end flow test against a running server |
| `npm run lint` | ESLint |

> `db:migrate` runs `scripts/apply-migrations.mts` rather than `drizzle-kit
> migrate`: the Neon HTTP driver cannot open the transaction drizzle-kit wraps
> each migration in, so the runner sends statements individually and records
> what it applied.

## Project layout

```
db/               Drizzle schema and migrations
lib/payroll/      Salary computation engine, payslip PDF, payslip data loaders
lib/schedule/     Weekly-hours derivation from schedule lines
scripts/          Migration runner, database reset, end-to-end flow test
src/app/          App Router pages + API route handlers
src/app/api/_lib/ auth, access control, audit, email, responses
src/views/        Page-level React components (imported by src/app/*/page.tsx)
src/components/   Shared UI and chart components
src/context/      Auth, app and payroll providers
```

`src/views/` deliberately sits outside `src/pages/` — anything under `src/pages`
is picked up by the Next.js Pages Router and would be exposed as a public route.

## How the payroll engine works

`lib/payroll/compute.ts` is the core. For each selected employee it:

1. Picks the **contract that overlaps the pay period** (flagging concurrent
   active contracts rather than guessing).
2. Derives **expected working days** from the employee's assigned schedule,
   falling back to Mon–Fri.
3. Computes a **work ratio** from attendance plus paid leave, so pay prorates
   for partial months and unpaid leave.
4. Runs the structure's **salary rules in sequence**. Each rule is a fixed
   amount or a percentage of an earlier result. `GROSS` and `NET` are computed
   subtotals, so later rules can build on them.
5. Writes payslip lines and raises **warnings** before finalisation: missing
   contract, concurrent contracts, missing bank details, missing check-outs, no
   attendance, duplicate payslip for an overlapping period, non-positive net.

Codes any rule may reference as a percentage base: `WAGE` (prorated),
`FULL_WAGE`, `WORK_RATIO`, `WORKED_DAYS`, `EXPECTED_DAYS`, `LEAVE_DAYS`,
`UNPAID_LEAVE_DAYS`, plus the code of any earlier rule.

## Roles

Permissions are enforced **server-side** in `src/app/api/_lib/access.ts`, not
just in the UI.

| Role | Access |
|---|---|
| Employee | Own profile, attendance, time off and payslips only |
| HR Manager | Full CRUD on HR master data; approves time off; no payroll |
| HR Payroll User | HR access + pay runs and payslips; salary config read-only |
| HR Payroll Manager | Full payroll including salary structures and rules |
| Admin | Everything, plus user management |

## End-to-end flows

**Employee → payslip.** Employee and contract → schedule and attendance →
Payroll → Pay Runs → New (two-step wizard: scope, then employee selection) →
Compute → review warnings → Validate → Mark Paid → Print PDF / Send Payslips.

**Allocation → request.** Time Off → Types (define policy) → Allocations
(allocate and approve a balance) → Requests (submit) → Approve, which draws the
days down from the allocation. Refusing releases them again.
