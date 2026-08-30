# Prepaid Meter Recharge Advisor

- Team ID: `T012`
- Problem ID: `P10`
- Live URL: https://recharge-advisor.vercel.app

## Setup

Requirements: Bun or Node.js.

```bash
bun install
bun run dev
```

Open `http://localhost:3000`. For a production build:

```bash
bun run build
bun run preview
```

The public fixture is stored in `P10_prepaid_meter_public.json` and is loaded automatically. To restore the initial data, restore that file from the repository and reload the page.

## Requirements Proof

1. **Household and readings:** The fixture contains 25 households with six or more months of consecutive daily readings and recharge history. The dashboard identifies a light month, a heavy summer month, and a month with a large recharge during its final seven days. See `P10_prepaid_meter_public.json` and `src/routes/index.tsx:96-131`.
2. **Daily balance rebuild:** `src/lib/engine.ts:39-85` resets the monthly slab counter, prices daily units incrementally, applies the first-recharge demand charge and meter rent, adds VAT, and produces the daily ledger. The dashboard renders the balance line, recharge markers, and ledger at `src/routes/index.tsx:133-156`.
3. **Family questions:** `src/lib/engine.ts:89-220` predicts the run-out date and calculates the selected target-date recharge, including base energy, higher-slab premium, fixed charges, and VAT. The controls and results are at `src/routes/index.tsx:158-195`.
4. **Recharge habit comparison:** `src/lib/engine.ts:223-322` simulates low-balance and first-of-month recharging over the configured three months using identical readings and calendar-month slab counters. It reports consumed cost as energy, VAT, and fixed charges separately from deposited money. The result is shown at `src/routes/index.tsx:198-234`.

## Approach

The application keeps tariff rules in a small reusable module and uses a deterministic calculation engine for the daily ledger, projections, and habit simulations. The React dashboard presents the fixture, calculations, explanations, and recharge events in one page. The comparison deliberately prices consumption independently of recharge timing so timing cannot create an artificial slab saving.

## Major Decisions

- Use calendar-month incremental slabs and reset the slab counter on the first day of each month.
- Apply demand charge and meter rent only on the first recharge in a month.
- Treat cost as consumed money, separate from deposited recharge amounts.
- Keep the supplied public JSON fixture as the source of truth so judges can reproduce results.

## Known Limitations

- The app uses the supplied static fixture; it does not provide household data entry or persistence.
- Date calculations use JavaScript `Date` and assume the fixture's ISO dates are interpreted consistently in the browser timezone.
- The target-date estimate reserves fixed charges for future months in the selected range, which is conservative when no recharge occurs in those months.
- `bun run build` succeeds, but the repository currently has existing Biome formatting/lint diagnostics in `bun run check`.

## Contributions

- Junaid Hossain: **To be completed by the team.**
- Punam Chakraborty: **To be completed by the team.**

## Safety and Data

The repository contains no passwords, API keys, access tokens, private keys, or personal user data. The names in `evaluation-manifest.json` are registered team-member identification required by the event template.

See `EVENT.md`, `evaluation-manifest.json`, and `LICENSES.md` for the event declaration, evaluation details, and dependency/license inventory.
