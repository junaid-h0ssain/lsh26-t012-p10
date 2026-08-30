# Prepaid Meter Recharge Advisor

Solution for **LofiStack Hackathon 2026 — P10**

## Project information

- **Team:** `LSH26`
- **Team ID:** `LSH26-T012`
- **Problem:** `P10 — Prepaid Meter Recharge Advisor`
- **Live application:** <https://recharge-advisor.vercel.app>
- **Demo video:** None (optional, maximum three minutes)

> Judges will evaluate only the exact commit SHA entered in the Final Submission Form.

## Solution summary

This dashboard helps a household understand prepaid electricity usage, balance depletion, and recharge planning. It rebuilds the meter balance day by day using slab-aware pricing, answers when the balance runs out and how much to recharge to last until a chosen date, and compares two recharge habits without inventing slab savings from recharge timing.

## Requirements

| Requirement | Status | Where to verify |
| --- | --- | --- |
| R1 — Household with 6+ months daily readings and recharge history (light month, heavy summer month, last-week large recharge) | Complete | `P10_prepaid_meter_public.json`, `src/routes/index.tsx:122-157` |
| R2 — Rebuild meter balance day by day (slab by monthly cum, demand+rent on first recharge/month, VAT, balance line with recharge markers) | Complete | `src/lib/engine.ts:39-85`, `src/routes/index.tsx:160-193`, `src/lib/tariff.ts` |
| R3 — Answer run-out date and required recharge to target date with breakdown (base energy, slab premium, fixed, VAT) | Complete | `src/lib/engine.ts:89-221`, `src/routes/index.tsx:195-233` |
| R4 — Compare low-balance vs monthly recharge habits over same 3 months, same consumption and slab counter, cost as consumed (energy+VAT+fixed) | Complete | `src/lib/engine.ts:223-323`, `src/routes/index.tsx:235-271` |

## How to test the application

1. Open the live application at <https://recharge-advisor.vercel.app>.
2. Choose a household from the case selector in the navbar (25 cases available).
3. Review the Household & Daily Readings card for light/heavy/last-week highlights and the monthly table.
4. Inspect the Meter Balance chart and the last-60-day ledger (recharge markers highlighted).
5. In section 3a confirm the predicted run-out date; in 3b pick a target date and verify the required-recharge breakdown.
6. In section 4 compare the two habits over the configured three months and check that any cost difference comes only from fixed-charge count.

### Test or sample data

The published fixture `P10_prepaid_meter_public.json` is loaded automatically on page load. To test another fixture in the same P10 schema, click **Load P10 JSON fixture** and select a JSON file. To reset, click **Reset to published fixture** or restore `P10_prepaid_meter_public.json` and reload the page. See `LofiStack-Hackathon-2026-Submission-Kit-v2.2/fixtures/` for the original fixture shape and `fixture-index.json` for the problem-to-file map.

## Run locally

### Requirements

- Bun `1.x` or Node.js `20+`
- No database required

### Setup

```bash
git clone https://github.com/junaid-h0ssain/lsh26-t012-p10.git
cd lsh26-t012-p10
bun install
# no env file required — no secrets used
bun run dev
```

Open `http://localhost:3000`. For a production build:

```bash
bun run build
bun run preview
```

Do not include real passwords, tokens or API keys. List only variable names in `.env.example` (none required for this project).

## Problem-solving approach

- The team understood the problem as a deterministic billing rebuild plus two projections and a habit comparison, all governed by calendar-month slab counters and first-recharge fixed charges.
- The chosen solution keeps tariff rules in `src/lib/tariff.ts` and a pure TypeScript engine in `src/lib/engine.ts` for ledger, run-out, target-recharge, and habit simulations; a single-page React dashboard presents the fixture and every calculation with explanations.
- The most important decision was to price consumption independently of recharge timing (slab reset on 1st, fixed only on first recharge of month) so timing cannot create a fabricated slab saving, per R-16/R-33, and to report cost as consumed money separately from deposited amounts.
- The solution was tested by running the engine across all 25 public cases, manually inspecting light/heavy/last-week month detection, and verifying `bun run build` succeeds.

## Technology used

- **Frontend:** React 19, TanStack Start, TanStack Router, Tailwind CSS 4, DaisyUI 5
- **Backend:** Nitro SSR adapter (via TanStack Start)
- **Database:** None (fixture-driven)
- **Deployment:** Vercel
- **Other material tools:** TypeScript 6, Vite 8, Biome 2, Bun

See [`LICENSES.md`](LICENSES.md) for third-party materials.

## Team contributions

| Registered member | GitHub username | Major contribution | Evidence |
| --- | --- | --- | --- |
| Junaid Hossain | `junaid-h0ssain` | Calculation engine, tariff, and recharge logic | `src/lib/engine.ts`, `src/lib/tariff.ts` |
| Punam Chakraborty | `punammomi` | Dashboard UI, balance chart, and fixture handling | `src/routes/index.tsx`, `P10_prepaid_meter_public.json` |

Commit count alone does not represent contribution.

## AI usage

List each AI tool used, what it assisted with and how the team verified its output.

- **Antigravity CLI / Opencode (Muse Spark):** Helped implement prepaid meter calculation, daily balance tracking, recharge logic and debugging; verified by reviewing against `AGENTS.md`, running the engine across all public cases, and confirming `bun run build` succeeds. Recorded in `evaluation-manifest.json`.

## Major design decisions

- **Decision:** Use calendar-month incremental slabs and reset the slab counter on the 1st of each month — so recharge timing cannot create an energy-rate saving (R-16).
- **Decision:** Apply demand charge and meter rent only on the first recharge in a month via a `chargedMonth` set — matches the tariff rule.
- **Decision:** Treat cost as consumed money (energy + VAT + fixed) separate from deposited recharge amounts — matches R-33 definition.
- **Decision:** Keep the supplied public JSON fixture as the reproducible source of truth so judges can reload or upload any P10-shaped fixture.

## Known limitations

- Uploaded fixtures are not persisted after a page reload.
- Date calculations use JavaScript `Date` and assume the fixture's ISO dates are interpreted consistently in the browser timezone.
- The target-date estimate conservatively reserves fixed charges for every future month in the selected range.
- `bun run build` succeeds, but `bun run check` currently reports existing Biome formatting/lint diagnostics.

## Repository records

- [`EVENT.md`](EVENT.md) — event start code and pre-event-material declaration
- [`evaluation-manifest.json`](evaluation-manifest.json) — structured judging evidence
- [`LICENSES.md`](LICENSES.md) — frameworks, libraries, templates and assets
