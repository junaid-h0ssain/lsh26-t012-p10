import { slabs, DEMAND_CHARGE, METER_RENT, VAT_RATE, energyCostForUnits, baseRate } from "./tariff";

export type Day = { date: string; units: number };
export type Recharge = { date: string; amount_bdt: string };

export type Case = {
  case_id: string;
  opening_balance_bdt: string;
  days: Day[];
  recharges: Recharge[];
  today: string;
  usual_daily_units: number;
  target_date: string;
  comparison: {
    months: string[];
    source: string;
    daily_units: number | null;
    opening_balance_bdt: string;
    low_threshold_bdt: string;
    low_amount_bdt: string;
    monthly_amount_bdt: string;
  };
};

export type DailyLedger = {
  date: string;
  units: number;
  cumMonth: number;
  energyCost: number;
  vatOnEnergy: number;
  fixedCharge: number;
  vatOnFixed: number;
  totalCost: number;
  recharge: number;
  balanceAfter: number;
};

// rebuild meter balance day by day
export function rebuild(caseData: Case) {
  const rechargeMap = new Map<string, number>();
  for (const r of caseData.recharges) {
    rechargeMap.set(r.date, (rechargeMap.get(r.date) || 0) + parseFloat(r.amount_bdt));
  }
  let balance = parseFloat(caseData.opening_balance_bdt);
  const ledgers: DailyLedger[] = [];
  let monthKey = "";
  let cum = 0;
  const chargedMonth = new Set<string>();

  for (const d of caseData.days) {
    const mk = d.date.slice(0, 7);
    if (mk !== monthKey) {
      monthKey = mk;
      cum = 0;
    }
    const cumBefore = cum;
    cum += d.units;
    const energy = energyCostForUnits(d.units, cumBefore);
    const rechargeAmt = rechargeMap.get(d.date) || 0;
    let fixed = 0;
    if (rechargeAmt > 0 && !chargedMonth.has(mk)) {
      fixed = DEMAND_CHARGE + METER_RENT;
      chargedMonth.add(mk);
    }
    const vatEnergy = energy * VAT_RATE;
    const vatFixed = fixed * VAT_RATE;
    const total = energy + vatEnergy + fixed + vatFixed;

    if (rechargeAmt > 0) balance += rechargeAmt;
    balance -= total;

    ledgers.push({
      date: d.date,
      units: d.units,
      cumMonth: cum,
      energyCost: energy,
      vatOnEnergy: vatEnergy,
      fixedCharge: fixed,
      vatOnFixed: vatFixed,
      totalCost: total,
      recharge: rechargeAmt,
      balanceAfter: balance,
    });
  }
  return { ledgers, rechargeMap };
}

// predict run out date given today's balance and usual usage
export function predictRunOut(caseData: Case, ledgers: DailyLedger[]) {
  const last = ledgers.at(-1);
  if (!last) return null;
  let bal = last.balanceAfter;
  // cum for next month: if today is end of month, next day resets
  let curDate = new Date(caseData.today);
  let curMonth = curDate.toISOString().slice(0,7);
  // need cum for current month after today
  const curCum = last.cumMonth;
  let cum = curCum;
  let days = 0;
  const isEndOfMonth = (d: Date) => {
    const n = new Date(d); n.setDate(n.getDate()+1);
    return n.getMonth() !== d.getMonth();
  };
  // if today is last day of month, next day cum 0 else continue
  let nextDate = new Date(curDate);
  nextDate.setDate(nextDate.getDate()+1);
  if (nextDate.toISOString().slice(0,7) !== curMonth) cum = 0;

  for (let i=0;i<365;i++) {
    const dStr = nextDate.toISOString().slice(0,10);
    const mk = dStr.slice(0,7);
    if (mk !== curMonth) { curMonth = mk; cum = 0; }
    const energy = energyCostForUnits(caseData.usual_daily_units, cum);
    cum += caseData.usual_daily_units;
    const tot = energy * (1+VAT_RATE); // no fixed charges in future unless recharge? spec says run out without recharge, so no fixed
    bal -= tot;
    days++;
    if (bal < 0) {
      return { date: dStr, daysLeft: days, remainingBalance: bal };
    }
    nextDate.setDate(nextDate.getDate()+1);
  }
  return null;
}

// how much to recharge today to last until target_date inclusive
export function calcRequiredRecharge(caseData: Case, ledgers: DailyLedger[], targetDate: string) {
  const last = ledgers.at(-1)!;
  const curBal = last.balanceAfter;
  let need = 0;
  let curDate = new Date(caseData.today);
  let nextDate = new Date(curDate); nextDate.setDate(nextDate.getDate()+1);
  const end = new Date(targetDate);
  if (end <= curDate) return { required: 0, breakdown: null };

  let cum = last.cumMonth;
  let curMonth = curDate.toISOString().slice(0,7);
  // if next month different, reset before loop
  if (nextDate.toISOString().slice(0,7) !== curMonth) { curMonth = nextDate.toISOString().slice(0,7); cum = 0; }

  let totalEnergy = 0;
  let totalFixed = 0;
  let fixedMonths = new Set<string>();
  // we need to consider fixed charges for months where we cross and have not yet charged?
  // Spec: fixed taken on first recharge of each month. If we recharge today, that recharge is first for current month? Actually ledger already charged current month if had recharge.
  // For future months up to target, if we do a single recharge today, does it cover future months' fixed? No, fixed deducted on day we need it? In reality fixed taken from balance on first recharge after month start. But if we have enough balance, the code would deduct on whatever day we have recharge. Since we only recharge today, future months' fixed must be accounted as cost that will be deducted when balance exists? We'll model: fixed for each future month where target spans, except current month if already charged.
  // Determine months spanned (exclusive of today, inclusive of target)
  const monthsInRange = new Set<string>();
  let d = new Date(nextDate);
  while (d <= end) { monthsInRange.add(d.toISOString().slice(0,7)); d.setDate(d.getDate()+1); }
  // current month already has cum, but if current month not yet charged in ledger (no recharge that month), then we will need to charge it when we recharge today
  // Check if current month was charged
  const ledgerChargedMonths = new Set<string>();
  // reconstruct charged months
  {
    const rmap = new Map<string, number>();
    for (const r of caseData.recharges) rmap.set(r.date, (rmap.get(r.date)||0)+parseFloat(r.amount_bdt));
    const seen = new Set<string>();
    for (const l of ledgers) if (l.recharge>0 && !seen.has(l.date.slice(0,7))) { seen.add(l.date.slice(0,7)); ledgerChargedMonths.add(l.date.slice(0,7)); }
  }
  // If we will recharge today, and today's month not yet charged, we need fixed for that month
  const todayMonth = caseData.today.slice(0,7);
  let needsTodayFixed = !ledgerChargedMonths.has(todayMonth);
  // For future months, need fixed for each month in range
  // But if we only do one recharge today, the fixed for future months will be taken from balance? In meter, fixed is taken on first recharge of that month, not automatically daily. However spec for question 3 says breakdown includes fixed charges. So include them.
  // We'll include fixed for each distinct month in range, plus maybe todayMonth if needed.
  let futureFixedMonths = [...monthsInRange];
  // remove todayMonth from futureFixedMonths if it equals todayMonth? TodayMonth is already considered. We already added nextDate onwards, so if target is same month, monthsInRange includes todayMonth.
  // To avoid double count todayFixed, handle:
  let fixedCount = 0;
  if (needsTodayFixed) fixedCount +=1;
  // count future months excluding todayMonth if already counted
  for (const m of futureFixedMonths) {
    if (m === todayMonth && needsTodayFixed) continue;
    // if m == todayMonth and already charged, then don't count? But we are in same month, daily consumption until target doesn't cross fixed again, so shouldn't add fixed for same month if already charged
    if (m === todayMonth && ledgerChargedMonths.has(todayMonth)) continue;
    if (m !== todayMonth) fixedCount +=1;
  }

  totalFixed = fixedCount * (DEMAND_CHARGE + METER_RENT);

  // energy across days
  let curCum = cum;
  let curMk = nextDate.toISOString().slice(0,7);
  // if curMk !== last month, cum already 0, else use cum
  if (curMk !== caseData.today.slice(0,7)) curCum = 0;
  else curCum = last.cumMonth;

  let baseEnergy = 0;
  let dIter = new Date(nextDate);
  while (dIter <= end) {
    const mk = dIter.toISOString().slice(0,7);
    if (mk !== curMk) { curMk = mk; curCum = 0; }
    const e = energyCostForUnits(caseData.usual_daily_units, curCum);
    totalEnergy += e;
    baseEnergy += caseData.usual_daily_units * baseRate();
    curCum += caseData.usual_daily_units;
    dIter.setDate(dIter.getDate()+1);
  }
  const vatEnergy = totalEnergy * VAT_RATE;
  const vatFixed = totalFixed * VAT_RATE;
  const totalNeeded = totalEnergy + vatEnergy + totalFixed + vatFixed;
  const required = Math.max(0, totalNeeded - curBal);
  // slab premium = totalEnergy - baseEnergy
  const slabPremium = totalEnergy - baseEnergy;

  // if balance negative, need also to cover deficit
  return {
    required,
    breakdown: {
      energyBase: baseEnergy,
      slabPremium,
      energyTotal: totalEnergy,
      fixedCharges: totalFixed,
      vat: vatEnergy + vatFixed,
      totalNeeded,
      curBal,
      fixedCount,
    }
  };
}

// comparison of two habits over three months
export function compareHabits(caseData: Case) {
  const months = caseData.comparison.months;
  // collect days for those months
  const daysByMonth = new Map<string, Day[]>();
  for (const d of caseData.days) {
    const mk = d.date.slice(0,7);
    if (months.includes(mk)) {
      if (!daysByMonth.has(mk)) daysByMonth.set(mk, []);
      daysByMonth.get(mk)!.push(d);
    }
  }
  // also support synthetic daily_units? if source != readings use daily_units constant
  let syntheticDays: Day[] = [];
  if (caseData.comparison.source !== "readings" && caseData.comparison.daily_units) {
    for (const m of months) {
      const [y, mo] = m.split("-").map(Number);
      const daysInMonth = new Date(y, mo, 0).getDate();
      for (let d=1; d<=daysInMonth; d++) {
        const ds = `${m}-${String(d).padStart(2,"0")}`;
        syntheticDays.push({ date: ds, units: caseData.comparison.daily_units! });
      }
    }
    syntheticDays.sort((a,b)=>a.date.localeCompare(b.date));
  }
  const relevantDays = syntheticDays.length ? syntheticDays : [...daysByMonth.values()].flat().sort((a,b)=>a.date.localeCompare(b.date));

  const lowThresh = parseFloat(caseData.comparison.low_threshold_bdt);
  const lowAmt = parseFloat(caseData.comparison.low_amount_bdt);
  const monAmt = parseFloat(caseData.comparison.monthly_amount_bdt);
  const opening = parseFloat(caseData.comparison.opening_balance_bdt);

  function simulate(recharges: Map<string,number>) {
    let bal = opening;
    let cum = 0;
    let curMonth = "";
    const charged = new Set<string>();
    let totalCost = 0;
    let totalFixed = 0;
    let totalEnergy = 0;
    let totalVat = 0;
    let rechargeCount=0;
    let totalRecharged=0;
    for (const d of relevantDays) {
      const mk = d.date.slice(0,7);
      if (mk !== curMonth) { curMonth = mk; cum = 0; }
      // recharge at start of day if scheduled
      const r = recharges.get(d.date) || 0;
      if (r>0) { bal += r; totalRecharged+=r; rechargeCount++; }
      const cumBefore = cum;
      cum += d.units;
      const energy = energyCostForUnits(d.units, cumBefore);
      let fixed = 0;
      if (r>0 && !charged.has(mk)) { fixed = DEMAND_CHARGE + METER_RENT; charged.add(mk); }
      const vatE = energy*VAT_RATE; const vatF = fixed*VAT_RATE;
      const tot = energy+vatE+fixed+vatF;
      bal -= tot;
      totalCost += tot;
      totalEnergy += energy;
      totalFixed += fixed;
      totalVat += vatE+vatF;
    }
    return { totalCost, totalEnergy, totalFixed, totalVat, bal, rechargeCount, totalRecharged, chargedCount: charged.size };
  }

  // monthly habit: recharge on 1st of each month
  const monthlyMap = new Map<string,number>();
  for (const m of months) {
    const first = `${m}-01`;
    // only if that date exists in relevantDays
    if (relevantDays.some(d=>d.date===first)) monthlyMap.set(first, monAmt);
  }
  // low balance habit: recharge at start of any day whose balance is below threshold
  // need to simulate stepwise to generate recharges
  const lowMap = new Map<string,number>();
  // iterative generate
  let bal = opening;
  let cum = 0;
  let curMonth="";
  const chargedLow = new Set<string>();
  for (const d of relevantDays) {
    const mk = d.date.slice(0,7);
    if (mk !== curMonth) { curMonth = mk; cum=0; }
    if (bal < lowThresh) {
      lowMap.set(d.date, (lowMap.get(d.date)||0)+lowAmt);
      bal += lowAmt;
      // if first recharge of month, reserve fixed deduction later? fixed applied in simulation loop as per recharge
    }
    const cumBefore=cum; cum+=d.units;
    const energy=energyCostForUnits(d.units,cumBefore);
    let fixed=0;
    const r = lowMap.get(d.date)||0;
    if (r>0 && !chargedLow.has(mk)) { fixed=DEMAND_CHARGE+METER_RENT; chargedLow.add(mk); }
    const tot=energy*(1+VAT_RATE)+fixed*(1+VAT_RATE);
    bal -= tot;
  }

  const monthlyRes = simulate(monthlyMap);
  const lowRes = simulate(lowMap);
  return { lowRes, monthlyRes, lowMap, monthlyMap, relevantDays };
}
