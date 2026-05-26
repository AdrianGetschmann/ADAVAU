/* ═══════════════════════════════════════════════════════════════════════════
   ADAVAU Real Estate — Investment Calculator  (script.js)
   Data: JLL · BNP Paribas · Colliers · Investropa Q1 2026
═══════════════════════════════════════════════════════════════════════════ */

/* ── City presets ────────────────────────────────────────────────────────── */
const PRESETS = {
  leipzig:    { pricePerSqm: 2550, rentPerSqm: 10.8, transferTax: 3.5, appreciation: 6.0, rentIncrease: 4.0, size: 55 },
  dresden:    { pricePerSqm: 3000, rentPerSqm: 10.5, transferTax: 3.5, appreciation: 6.0, rentIncrease: 3.5, size: 55 },
  hannover:   { pricePerSqm: 3400, rentPerSqm: 12.0, transferTax: 5.0, appreciation: 3.5, rentIncrease: 3.0, size: 60 },
  nuremberg:  { pricePerSqm: 4000, rentPerSqm: 13.0, transferTax: 3.5, appreciation: 3.5, rentIncrease: 3.0, size: 60 },
  cologne:    { pricePerSqm: 5000, rentPerSqm: 15.8, transferTax: 6.5, appreciation: 4.0, rentIncrease: 3.5, size: 55 },
  dusseldorf: { pricePerSqm: 5000, rentPerSqm: 14.8, transferTax: 6.5, appreciation: 4.5, rentIncrease: 4.0, size: 55 },
  berlin:     { pricePerSqm: 5450, rentPerSqm: 14.0, transferTax: 6.0, appreciation: 4.0, rentIncrease: 3.0, size: 50 },
  hamburg:    { pricePerSqm: 6200, rentPerSqm: 16.0, transferTax: 5.5, appreciation: 5.0, rentIncrease: 4.0, size: 50 },
  frankfurt:  { pricePerSqm: 6000, rentPerSqm: 17.5, transferTax: 6.0, appreciation: 3.5, rentIncrease: 3.0, size: 50 },
  munich:     { pricePerSqm: 9000, rentPerSqm: 18.0, transferTax: 3.5, appreciation: 3.0, rentIncrease: 2.5, size: 45 },
};

/* ── Conservative defaults ───────────────────────────────────────────────── */
const CONSERVATIVE = {
  size: 55, pricePerSqm: 3000, downPayment: 30, mortgageRate: 4.2, loanTerm: 25,
  rentPerSqm: 9.5, rentIncrease: 2.0, vacancy: 5.0, mgmtFee: 10.0,
  maintenance: 1.5, transferTax: 5.0, appreciation: 3.0,
};

/* ── State ───────────────────────────────────────────────────────────────── */
let chart         = null;
let chartView     = 'projection';   // 'projection' | 'sensitivity' | 'pl'
let showFullTerm  = false;
let lastResult    = null;

/* ══════════════════════════════════════════════════════════════════════════
   TAB SWITCHING
══════════════════════════════════════════════════════════════════════════ */
function switchTab(name) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.getElementById('tab-' + name).classList.add('active');
}

function compNavClick(el) {
  document.querySelectorAll('.comp-nav-link').forEach(a => a.classList.remove('active'));
  el.classList.add('active');
}

/* ══════════════════════════════════════════════════════════════════════════
   TOOLTIP
══════════════════════════════════════════════════════════════════════════ */
const tooltipEl = document.getElementById('tooltip');
document.addEventListener('mouseover', e => {
  const icon = e.target.closest('.info-icon');
  if (!icon) return;
  const text = icon.getAttribute('data-tip');
  if (!text) return;
  tooltipEl.textContent = text;
  tooltipEl.classList.add('visible');
  positionTooltip(e);
});
document.addEventListener('mousemove', e => {
  if (tooltipEl.classList.contains('visible')) positionTooltip(e);
});
document.addEventListener('mouseout', e => {
  if (e.target.closest('.info-icon')) tooltipEl.classList.remove('visible');
});
function positionTooltip(e) {
  const pad = 12, tw = tooltipEl.offsetWidth, th = tooltipEl.offsetHeight;
  let x = e.clientX + pad, y = e.clientY - th / 2;
  if (x + tw > window.innerWidth - 8) x = e.clientX - tw - pad;
  if (y < 8) y = 8;
  if (y + th > window.innerHeight - 8) y = window.innerHeight - th - 8;
  tooltipEl.style.left = x + 'px';
  tooltipEl.style.top  = y + 'px';
}

/* ══════════════════════════════════════════════════════════════════════════
   INPUT SYNC
══════════════════════════════════════════════════════════════════════════ */
function syncNum(rangeId, numId) {
  document.getElementById(numId).value = document.getElementById(rangeId).value;
  updateGradient(rangeId);
}
function syncRange(numId, rangeId) {
  document.getElementById(rangeId).value = document.getElementById(numId).value;
  updateGradient(rangeId);
}
function updateGradient(id) {
  const el = document.getElementById(id);
  if (!el || el.type !== 'range') return;
  const pct = ((parseFloat(el.value) - parseFloat(el.min)) / (parseFloat(el.max) - parseFloat(el.min))) * 100;
  el.style.background = `linear-gradient(to right,#1a56db ${pct}%,#e2e8f0 ${pct}%)`;
}
function setField(rangeId, numId, val) {
  const r = document.getElementById(rangeId);
  const n = document.getElementById(numId);
  if (r) r.value = val;
  if (n) n.value = val;
  if (r) updateGradient(rangeId);
}

/* ── Apply preset ────────────────────────────────────────────────────────── */
function applyPreset(city) {
  const p = PRESETS[city];
  if (!p) return;
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-city="${city}"]`)?.classList.add('active');
  setField('size',         'sizeNum',         p.size);
  setField('pricePerSqm',  'pricePerSqmNum',  p.pricePerSqm);
  setField('rentPerSqm',   'rentPerSqmNum',   p.rentPerSqm);
  setField('transferTax',  'transferTaxNum',  p.transferTax);
  setField('appreciation', 'appreciationNum', p.appreciation);
  setField('rentIncrease', 'rentIncreaseNum', p.rentIncrease);
  recalc();
}

/* ── Reset to conservative ───────────────────────────────────────────────── */
function resetConservative() {
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  const c = CONSERVATIVE;
  setField('size',         'sizeNum',         c.size);
  setField('pricePerSqm',  'pricePerSqmNum',  c.pricePerSqm);
  setField('downPayment',  'downPaymentNum',  c.downPayment);
  setField('mortgageRate', 'mortgageRateNum', c.mortgageRate);
  setField('loanTerm',     'loanTermNum',     c.loanTerm);
  setField('rentPerSqm',   'rentPerSqmNum',   c.rentPerSqm);
  setField('rentIncrease', 'rentIncreaseNum', c.rentIncrease);
  setField('vacancy',      'vacancyNum',      c.vacancy);
  setField('mgmtFee',      'mgmtFeeNum',      c.mgmtFee);
  setField('maintenance',  'maintenanceNum',  c.maintenance);
  setField('transferTax',  'transferTaxNum',  c.transferTax);
  setField('appreciation', 'appreciationNum', c.appreciation);
  recalc();
}

/* ── Tax fields enable/disable ───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const cb = document.getElementById('taxEnabled');
  if (cb) cb.addEventListener('change', () => {
    const fields = document.getElementById('taxFields');
    fields.classList.toggle('disabled', !cb.checked);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   SHARE CODE
══════════════════════════════════════════════════════════════════════════ */
// Order of params in code (16 values):
// size, pricePerSqm, downPayment, mortgageRate, loanTerm,
// rentPerSqm, rentIncrease, vacancy, mgmtFee, maintenance,
// transferTax, appreciation, taxEnabled(0/1), taxBracket, buildingPct, afaRate
function generateCode() {
  const g  = id => parseFloat(document.getElementById(id)?.value) || 0;
  const gs = id => document.getElementById(id)?.value || '';
  const taxOn = document.getElementById('taxEnabled')?.checked ? 1 : 0;
  const vals = [
    g('sizeNum'), g('pricePerSqmNum'), g('downPaymentNum'),
    g('mortgageRateNum'), g('loanTermNum'), g('rentPerSqmNum'),
    g('rentIncreaseNum'), g('vacancyNum'), g('mgmtFeeNum'),
    g('maintenanceNum'), g('transferTaxNum'), g('appreciationNum'),
    taxOn, gs('taxBracket'), g('buildingPctNum'), gs('afaRate'),
  ];
  try {
    return btoa(vals.join('|'));
  } catch(e) {
    return '';
  }
}

function updateCode() {
  const bar = document.getElementById('shareBar');
  if (!bar || bar.style.display === 'none') return; // only update when bar is open
  const code = generateCode();
  const el = document.getElementById('shareCodeInput');
  if (el && document.activeElement !== el) el.value = code;
}

function copyCode() {
  const code = generateCode();
  navigator.clipboard.writeText(code).then(() => {
    showHint('✓ Copied!', 2000);
  }).catch(() => {
    const el = document.getElementById('shareCodeInput');
    if (el) { el.select(); document.execCommand('copy'); showHint('✓ Copied!', 2000); }
  });
}

function loadCode() {
  const el = document.getElementById('shareCodeInput');
  if (!el) return;
  const raw = el.value.trim();
  if (!raw) return showHint('Paste a code first', 2000);
  try {
    const parts = atob(raw).split('|');
    if (parts.length < 12) return showHint('Invalid code', 2000);
    setField('size',         'sizeNum',         parts[0]);
    setField('pricePerSqm',  'pricePerSqmNum',  parts[1]);
    setField('downPayment',  'downPaymentNum',  parts[2]);
    setField('mortgageRate', 'mortgageRateNum', parts[3]);
    setField('loanTerm',     'loanTermNum',     parts[4]);
    setField('rentPerSqm',   'rentPerSqmNum',   parts[5]);
    setField('rentIncrease', 'rentIncreaseNum', parts[6]);
    setField('vacancy',      'vacancyNum',      parts[7]);
    setField('mgmtFee',      'mgmtFeeNum',      parts[8]);
    setField('maintenance',  'maintenanceNum',  parts[9]);
    setField('transferTax',  'transferTaxNum',  parts[10]);
    setField('appreciation', 'appreciationNum', parts[11]);
    if (parts.length >= 16) {
      const taxCb = document.getElementById('taxEnabled');
      if (taxCb) {
        taxCb.checked = parts[12] === '1';
        document.getElementById('taxFields').classList.toggle('disabled', !taxCb.checked);
      }
      const tb = document.getElementById('taxBracket');
      if (tb) tb.value = parts[13];
      setField('buildingPct', 'buildingPctNum', parts[14]);
      const ar = document.getElementById('afaRate');
      if (ar) ar.value = parts[15];
    }
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    recalc();
    showHint('✓ Loaded!', 2000);
  } catch(e) {
    showHint('Invalid code', 2000);
  }
}

function showHint(msg, ms) {
  const el = document.getElementById('shareHint');
  if (!el) return;
  el.textContent = msg;
  setTimeout(() => { el.textContent = ''; }, ms);
}

/* ══════════════════════════════════════════════════════════════════════════
   CHART VIEW TOGGLE
══════════════════════════════════════════════════════════════════════════ */
function setChartView(view) {
  chartView = view;
  document.getElementById('btnProjection').classList.toggle('active', view === 'projection');
  document.getElementById('btnSensitivity').classList.toggle('active', view === 'sensitivity');
  document.getElementById('btnPL').classList.toggle('active', view === 'pl');
  document.getElementById('projectionView').style.display  = view === 'projection'  ? 'block' : 'none';
  document.getElementById('sensitivityView').style.display = view === 'sensitivity' ? 'block' : 'none';
  document.getElementById('plView').style.display          = view === 'pl'          ? 'block' : 'none';
  document.getElementById('projectionLegend').style.display = view === 'projection' ? 'flex'  : 'none';
  document.getElementById('chartViewTitle').textContent =
    view === 'projection' ? '10-Year Projection' : view === 'sensitivity' ? 'Sensitivity Matrix' : 'Monthly P&L — Year 1';
  if (view === 'sensitivity' && lastResult) renderSensitivity(lastResult, getInputs());
}

function toggleShareBar() {
  const bar = document.getElementById('shareBar');
  const btn = document.getElementById('shareToggleBtn');
  const isVisible = bar.style.display !== 'none';
  bar.style.display = isVisible ? 'none' : 'flex';
  btn.classList.toggle('active', !isVisible);
  if (!isVisible) {
    // Update the code when the bar opens
    const el = document.getElementById('shareCodeInput');
    if (el) el.value = generateCode();
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   TABLE TERM TOGGLE
══════════════════════════════════════════════════════════════════════════ */
function toggleTableTerm() {
  showFullTerm = !showFullTerm;
  document.getElementById('termToggleBtn').textContent = showFullTerm ? 'Show 10 years' : 'Show full term';
  if (lastResult) renderTable(lastResult);
}

/* ══════════════════════════════════════════════════════════════════════════
   CALCULATIONS
══════════════════════════════════════════════════════════════════════════ */
function getInputs() {
  const g  = id => parseFloat(document.getElementById(id)?.value) || 0;
  const gs = id => document.getElementById(id)?.value || '0';
  return {
    size:         g('sizeNum'),
    pricePerSqm:  g('pricePerSqmNum'),
    downPayment:  g('downPaymentNum') / 100,
    mortgageRate: g('mortgageRateNum') / 100,
    loanTerm:     g('loanTermNum'),
    rentPerSqm:   g('rentPerSqmNum'),
    rentIncrease: g('rentIncreaseNum') / 100,
    vacancy:      g('vacancyNum') / 100,
    mgmtFee:      g('mgmtFeeNum') / 100,
    maintenance:  g('maintenanceNum') / 100,
    transferTax:  g('transferTaxNum') / 100,
    appreciation: g('appreciationNum') / 100,
    taxEnabled:   document.getElementById('taxEnabled')?.checked || false,
    taxRate:      parseFloat(gs('taxBracket')) / 100,
    buildingPct:  g('buildingPctNum') / 100,
    afaRate:      parseFloat(gs('afaRate')) / 100,
  };
}

function calculate(inp) {
  const { size, pricePerSqm, downPayment, mortgageRate, loanTerm,
          rentPerSqm, rentIncrease, vacancy, mgmtFee, maintenance,
          transferTax, appreciation, taxEnabled, taxRate, buildingPct, afaRate } = inp;

  const purchasePrice = size * pricePerSqm;
  const acqCostsPct   = transferTax + 0.015 + 0.005 + 0.0357;
  const acqCosts      = purchasePrice * acqCostsPct;
  const totalOutlay   = purchasePrice + acqCosts;
  const loanAmount    = purchasePrice * (1 - downPayment);
  const equityIn      = purchasePrice * downPayment + acqCosts;

  const r = mortgageRate / 12, n = loanTerm * 12;
  const monthlyMortgage = loanAmount > 0 && r > 0
    ? loanAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
    : (loanAmount > 0 ? loanAmount / n : 0);
  const annualMortgage = monthlyMortgage * 12;

  // Year 1 gross
  const grossRentAnnualY1 = size * rentPerSqm * 12 * (1 - vacancy);
  const grossRentMonthlyY1 = grossRentAnnualY1 / 12;
  const mgmtCostY1        = grossRentAnnualY1 * mgmtFee;
  const maintCostY1       = purchasePrice * maintenance;
  const netIncomeY1       = grossRentAnnualY1 - mgmtCostY1 - maintCostY1;

  // AfA
  const afaAnnual = purchasePrice * buildingPct * afaRate;

  // Yields (pre-tax, Year 1)
  const grossYield = grossRentAnnualY1 / purchasePrice;
  const netYield   = netIncomeY1 / purchasePrice;
  const kpf        = grossRentAnnualY1 > 0 ? purchasePrice / grossRentAnnualY1 : 0;

  // Year 1 tax calc
  const loanBalY0 = loanAmount;
  const loanBalY1 = monthlyMortgage > 0 && r > 0
    ? monthlyMortgage * (1 - Math.pow(1 + r, -(n - 12))) / r
    : Math.max(0, loanAmount - loanAmount / loanTerm);
  const interestY1        = annualMortgage - (loanBalY0 - loanBalY1);
  const taxableIncomeY1   = grossRentAnnualY1 - mgmtCostY1 - maintCostY1 - (taxEnabled ? afaAnnual + interestY1 : 0);
  const taxImpactY1       = taxEnabled ? -(taxableIncomeY1 * taxRate) : 0;
  const cashFlowPreTaxY1  = netIncomeY1 - annualMortgage;
  const cashFlowAfterTaxY1 = cashFlowPreTaxY1 + taxImpactY1;
  const activeCF           = taxEnabled ? cashFlowAfterTaxY1 : cashFlowPreTaxY1;
  const monthlyCF          = activeCF / 12;
  const cocReturn          = equityIn > 0 ? activeCF / equityIn : 0;

  // 10yr+ projection
  const year0 = {
    year: 0, propertyValue: purchasePrice,
    grossRent: 0, netIncome: 0, mortgage: 0,
    cashFlow: 0, cfAfterTax: 0, taxImpact: 0,
    interestPaid: 0, principalPaid: 0, afaDeduction: afaAnnual,
    taxableIncome: 0, loanBalance: loanAmount,
    equity: purchasePrice * downPayment,
    cumOpsCF: 0, nav: -equityIn,
  };

  const years = [year0];
  let cumOpsCF = 0;
  let prevBal = loanAmount;

  for (let y = 1; y <= loanTerm; y++) {
    const propVal    = purchasePrice * Math.pow(1 + appreciation, y);
    const rentY      = grossRentAnnualY1 * Math.pow(1 + rentIncrease, y - 1);
    const mgmtY      = rentY * mgmtFee;
    const maintY     = maintCostY1;
    const netY       = rentY - mgmtY - maintY;

    // Loan balance at end of year y
    const pmtsLeft = n - y * 12;
    let loanBal = 0;
    if (pmtsLeft > 0 && r > 0) loanBal = monthlyMortgage * (1 - Math.pow(1 + r, -pmtsLeft)) / r;
    else if (pmtsLeft > 0) loanBal = Math.max(0, loanAmount - (loanAmount / loanTerm) * y);

    const principalPaid = prevBal - loanBal;
    const interestPaid  = annualMortgage - principalPaid;
    prevBal = loanBal;

    const taxableIncome = rentY - mgmtY - maintY - (taxEnabled ? afaAnnual + interestPaid : 0);
    const taxImpact     = taxEnabled ? -(taxableIncome * taxRate) : 0;
    const cfPre         = netY - annualMortgage;
    const cfAfter       = cfPre + taxImpact;
    const cf            = taxEnabled ? cfAfter : cfPre;
    cumOpsCF += cf;

    const equity = propVal - loanBal;
    const nav    = equity - equityIn + cumOpsCF;

    years.push({
      year: y, propertyValue: propVal,
      grossRent: rentY, netIncome: netY, mortgage: annualMortgage,
      cashFlow: cfPre, cfAfterTax: cfAfter, taxImpact,
      interestPaid, principalPaid, afaDeduction: afaAnnual,
      taxableIncome, loanBalance: loanBal,
      equity, cumOpsCF, nav,
    });
  }

  // IRR (after-tax cash flows)
  const irrCFs = [{ t: 0, cf: -equityIn }];
  for (let y = 1; y <= loanTerm; y++) {
    const row = years[y];
    let cf = taxEnabled ? row.cfAfterTax : row.cashFlow;
    if (y === loanTerm) cf += row.equity;
    irrCFs.push({ t: y, cf });
  }
  const irr = computeIRR(irrCFs);

  return {
    purchasePrice, acqCosts, totalOutlay, loanAmount, equityIn,
    monthlyMortgage, grossRentAnnualY1, grossRentMonthlyY1,
    mgmtCostY1, maintCostY1, netIncomeY1, afaAnnual,
    interestY1, taxableIncomeY1, taxImpactY1,
    cashFlowPreTaxY1, cashFlowAfterTaxY1, monthlyCF,
    grossYield, netYield, kpf, cocReturn, irr, years,
    // raw vacancy rate for P&L display
    vacancyRate: inp.vacancy,
    grossRentBeforeVac: size * rentPerSqm * 12 / 12,  // per month, 100% occupancy
  };
}

function computeIRR(cashflows, guess = 0.08) {
  const MAX_ITER = 100, TOL = 1e-7;
  let r = guess;
  for (let i = 0; i < MAX_ITER; i++) {
    let npv = 0, dnpv = 0;
    for (const { t, cf } of cashflows) {
      const d = Math.pow(1 + r, t);
      npv  += cf / d;
      dnpv -= t * cf / (d * (1 + r));
    }
    if (Math.abs(dnpv) < 1e-12) break;
    const nr = r - npv / dnpv;
    if (Math.abs(nr - r) < TOL) return nr;
    r = nr;
  }
  return r;
}

/* ══════════════════════════════════════════════════════════════════════════
   FORMATTING
══════════════════════════════════════════════════════════════════════════ */
const euro = v => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
const pct  = v => (v * 100).toFixed(2) + '%';
const pct1 = v => (v * 100).toFixed(1) + '%';
const fx   = v => v.toFixed(1) + '×';
function set(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function setKPI(valId, val, cls) {
  set(valId, val);
  const card = document.getElementById(valId)?.closest('.kpi-card');
  if (card) { card.classList.remove('good','warn','bad'); if (cls) card.classList.add(cls); }
}

/* ══════════════════════════════════════════════════════════════════════════
   RENDER — KPIs
══════════════════════════════════════════════════════════════════════════ */
function renderKPIs(r, inp) {
  const gy = r.grossYield;
  setKPI('kpiGrossYield', pct(gy), gy >= 0.04 ? 'good' : gy >= 0.03 ? 'warn' : 'bad');

  const ny = r.netYield;
  setKPI('kpiNetYield', pct(ny), ny >= 0.03 ? 'good' : ny >= 0.02 ? 'warn' : 'bad');

  setKPI('kpiKpf', fx(r.kpf), r.kpf <= 25 ? 'good' : r.kpf <= 33 ? 'warn' : 'bad');

  const cf = r.monthlyCF;
  setKPI('kpiCashflow', euro(cf), cf >= 100 ? 'good' : cf >= 0 ? 'warn' : 'bad');
  const cfLabel = inp.taxEnabled ? 'After-tax cash left monthly after all costs and mortgage.' : 'Cash left monthly after all costs and mortgage.';
  set('kpiCashflowSub', cfLabel + (cf < 0 ? ' Negative = you top up from salary.' : cf < 100 ? ' Near zero — small buffer only.' : ' Property more than covers itself.'));

  const coc = r.cocReturn;
  setKPI('kpiCoc', pct1(coc), coc >= 0.04 ? 'good' : coc >= 0 ? 'warn' : 'bad');

  const irr = r.irr;
  const irrValid = isFinite(irr) && irr > -1 && irr < 2;
  setKPI('kpiIrr', irrValid ? pct1(irr) : 'N/A', irrValid ? (irr >= 0.06 ? 'good' : irr >= 0.03 ? 'warn' : 'bad') : 'bad');
}

/* ══════════════════════════════════════════════════════════════════════════
   RENDER — Acquisition bar
══════════════════════════════════════════════════════════════════════════ */
function renderAcqBar(r) {
  set('acqPurchase', euro(r.purchasePrice));
  set('acqCosts',    euro(r.acqCosts) + ' (' + pct1(r.acqCosts / r.purchasePrice) + ')');
  set('acqTotal',    euro(r.totalOutlay));
  set('acqEquity',   euro(r.equityIn));
  set('acqMortgage', euro(r.monthlyMortgage) + '/mo');
  set('purchasePriceDisplay', euro(r.purchasePrice));
  set('loanAmountDisplay',    euro(r.loanAmount));
}

/* ══════════════════════════════════════════════════════════════════════════
   RENDER — Chart (10-year projection)
══════════════════════════════════════════════════════════════════════════ */
function renderChart(r) {
  const display = r.years.slice(0, 11);
  const labels  = display.map(y => y.year === 0 ? 'Now' : 'Y' + y.year);
  const ctx = document.getElementById('projectionChart').getContext('2d');
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Property Value',      data: display.map(y => Math.round(y.propertyValue)), borderColor: '#1a56db', backgroundColor: 'rgba(26,86,219,.05)', borderWidth: 2.5, pointRadius: 3, fill: false, tension: 0.3 },
        { label: 'Equity',              data: display.map(y => Math.round(y.equity)),         borderColor: '#059669', backgroundColor: 'rgba(5,150,105,.05)',  borderWidth: 2.5, pointRadius: 3, fill: false, tension: 0.3 },
        { label: 'Cumulative Cash Flow',data: display.map(y => Math.round(y.cumOpsCF)),       borderColor: '#e74694', backgroundColor: 'rgba(231,70,148,.05)', borderWidth: 2,   pointRadius: 3, fill: false, tension: 0.3, borderDash: [5, 3] },
        { label: 'Net Asset Value',     data: display.map(y => Math.round(y.nav)),            borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,.05)', borderWidth: 2.5, pointRadius: 3, fill: false, tension: 0.3, borderDash: [8, 4] },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => '  ' + ctx.dataset.label + ': ' + euro(ctx.parsed.y) },
          backgroundColor: '#1e293b', titleColor: '#94a3b8', bodyColor: '#e2e8f0', padding: 10, cornerRadius: 8,
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } }, border: { color: '#e2e8f0' } },
        y: {
          grid: { color: '#f1f5f9' },
          ticks: { color: '#94a3b8', font: { size: 11 }, callback: v => '€' + new Intl.NumberFormat('de-DE', { notation: 'compact', maximumFractionDigits: 0 }).format(v) },
          border: { dash: [4, 4], color: '#e2e8f0' },
        },
      },
    },
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   RENDER — Sensitivity matrix
══════════════════════════════════════════════════════════════════════════ */
function renderSensitivity(r, inp) {
  const container = document.getElementById('sensitivityGrid');
  if (!container) return;

  const priceVars = [-0.20, -0.10, 0, 0.10, 0.20];
  const rentVars  = [0.20,  0.10,  0, -0.10, -0.20]; // top = best rent

  function yieldCell(pVar, rVar) {
    const p = inp.pricePerSqm * (1 + pVar);
    const rn = inp.rentPerSqm  * (1 + rVar);
    const grossRent = inp.size * rn * 12 * (1 - inp.vacancy);
    const purchaseP = inp.size * p;
    return purchaseP > 0 ? grossRent / purchaseP : 0;
  }

  function cellClass(y) {
    if (y >= 0.05) return 'sens-c5';
    if (y >= 0.04) return 'sens-c4';
    if (y >= 0.03) return 'sens-c3';
    if (y >= 0.02) return 'sens-c2';
    return 'sens-c1';
  }

  let html = '<table class="sens-table"><thead><tr>';
  html += '<th>Rent ↓ / Price →</th>';
  priceVars.forEach(pv => {
    const lbl = pv === 0 ? 'Current price' : (pv > 0 ? `+${pv*100|0}%` : `${pv*100|0}%`);
    html += `<th>${lbl}</th>`;
  });
  html += '</tr></thead><tbody>';

  rentVars.forEach((rv, ri) => {
    const rentLbl = rv === 0 ? 'Current rent' : (rv > 0 ? `+${rv*100|0}%` : `${rv*100|0}%`);
    html += `<tr><td class="sens-label">${rentLbl}</td>`;
    priceVars.forEach((pv, pi) => {
      const y = yieldCell(pv, rv);
      const isCurrent = (pv === 0 && rv === 0);
      html += `<td class="${cellClass(y)}${isCurrent ? ' sens-current' : ''}">${pct1(y)}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  html += `<div class="sens-legend">
    <div class="sens-legend-item"><div class="sens-legend-dot" style="background:#d1fae5"></div> ≥5% — Excellent</div>
    <div class="sens-legend-item"><div class="sens-legend-dot" style="background:#a7f3d0"></div> 4–5% — Good</div>
    <div class="sens-legend-item"><div class="sens-legend-dot" style="background:#fef3c7"></div> 3–4% — Marginal</div>
    <div class="sens-legend-item"><div class="sens-legend-dot" style="background:#fed7aa"></div> 2–3% — Weak</div>
    <div class="sens-legend-item"><div class="sens-legend-dot" style="background:#fecaca"></div> &lt;2% — Avoid</div>
  </div>`;

  container.innerHTML = html;
}

/* ══════════════════════════════════════════════════════════════════════════
   RENDER — Year-by-year table
══════════════════════════════════════════════════════════════════════════ */
function renderTable(r) {
  const tbody = document.getElementById('breakdownBody');
  if (!tbody) return;
  const rows = r.years.slice(1);
  const show = showFullTerm ? rows : rows.slice(0, 10);
  tbody.innerHTML = show.map(y => `
    <tr>
      <td>Year ${y.year}</td>
      <td>${euro(y.propertyValue)}</td>
      <td>${euro(y.grossRent)}</td>
      <td>${euro(y.netIncome)}</td>
      <td>${euro(y.mortgage)}</td>
      <td class="${y.cfAfterTax >= 0 ? 'positive' : 'negative'}">${euro(y.cfAfterTax !== undefined ? y.cfAfterTax : y.cashFlow)}</td>
      <td>${euro(y.loanBalance)}</td>
      <td class="highlight">${euro(y.equity)}</td>
      <td class="${y.nav >= 0 ? 'positive' : 'negative'}">${euro(y.nav)}</td>
    </tr>
  `).join('');
}

/* ══════════════════════════════════════════════════════════════════════════
   RENDER — P&L Statement
══════════════════════════════════════════════════════════════════════════ */
function renderPL(r, inp) {
  const el = document.getElementById('plStatement');
  if (!el) return;

  const vacRate  = inp.vacancy;
  const grossFull = r.grossRentBeforeVac;         // per month, full occupancy
  const vacLoss   = grossFull * vacRate;            // monthly vacancy loss
  const effGross  = r.grossRentMonthlyY1;           // effective gross (after vacancy)
  const mgmt      = r.mgmtCostY1 / 12;
  const maint     = r.maintCostY1 / 12;
  const noi       = r.netIncomeY1 / 12;             // Net Operating Income
  const mortgage  = r.monthlyMortgage;
  const preTaxCF  = r.cashFlowPreTaxY1 / 12;
  const taxImpact = r.taxImpactY1 / 12;
  const afterTaxCF = r.cashFlowAfterTaxY1 / 12;
  const interest  = r.interestY1 / 12;
  const principal = mortgage - interest;
  const afa       = r.afaAnnual / 12;
  const taxIncome = r.taxableIncomeY1 / 12;

  const taxBadge  = inp.taxEnabled ? '<span class="pl-tax-badge">TAX ON</span>' : '';
  const totalCFCls = (inp.taxEnabled ? afterTaxCF : preTaxCF) >= 0 ? 'pl-total-positive' : 'pl-total-negative';
  const totalCF    = inp.taxEnabled ? afterTaxCF : preTaxCF;

  let html = '';

  // ── INCOME ──
  html += `<div class="pl-section-head">Income</div>`;
  html += plRow('Gross Potential Rent', '100% occupancy', euro(grossFull), 'neutral');
  html += plRowIndent(`Less: Vacancy (${pct1(vacRate)})`, 'Months expected empty or re-letting', euro(-vacLoss), 'negative');
  html += plSubtotal('Effective Gross Income', 'Rent you actually collect', euro(effGross), effGross >= 0 ? 'positive' : 'negative');

  // ── OPERATING COSTS ──
  html += `<div class="pl-section-head" style="margin-top:8px">Operating Costs</div>`;
  html += plRowIndent(`Management Fee (${pct1(inp.mgmtFee)})`, 'Hausverwaltung — administration', euro(-mgmt), 'negative');
  html += plRowIndent(`Maintenance Reserve (${pct1(inp.maintenance)})`, 'Repairs, wear & tear', euro(-maint), 'negative');
  html += plSubtotal('Net Operating Income (NOI)', 'Cash from renting, before financing', euro(noi), noi >= 0 ? 'positive' : 'negative');

  // ── TAX SECTION (only when enabled) ──
  if (inp.taxEnabled) {
    html += `<div class="pl-section-head" style="margin-top:8px">Tax Effects ${taxBadge}</div>`;
    html += plRowIndent('Mortgage Interest (deductible)', 'Interest portion of your mortgage payment', euro(-interest), 'negative');
    html += plRowIndent(`AfA Depreciation (deductible)`, `${(inp.afaRate*100).toFixed(0)}% × ${(inp.buildingPct*100).toFixed(0)}% building value`, euro(-afa), 'negative');
    const taxIncomeCls = taxIncome < 0 ? 'positive' : 'negative';
    const taxIncomeLabel = taxIncome < 0 ? 'Tax Loss (offsets other income)' : 'Taxable Rental Income';
    html += plSubtotal(taxIncomeLabel, taxIncome < 0 ? 'Negative taxable income = tax refund' : 'Amount added to your taxable income', euro(taxIncome), taxIncomeCls);
    const taxLabel = taxImpact >= 0 ? `Tax Saving (${(inp.taxRate*100).toFixed(0)}% bracket)` : `Tax Cost (${(inp.taxRate*100).toFixed(0)}% bracket)`;
    html += plRow(taxLabel, taxImpact >= 0 ? 'Government effectively subsidises you' : 'Additional tax owed on rental profit', euro(taxImpact), taxImpact >= 0 ? 'positive' : 'negative');
  }

  // ── FINANCING ──
  html += `<div class="pl-section-head" style="margin-top:8px">Financing</div>`;
  html += plRowIndent(`Mortgage Payment`, 'Fixed monthly payment to the bank', euro(-mortgage), 'negative');
  html += plRowIndent(`  of which interest`, 'Cost of borrowing (tax-deductible)', euro(-interest), 'neutral');
  html += plRowIndent(`  of which principal`, 'Loan repayment — builds your equity', euro(-principal), 'accent');

  // ── BOTTOM LINE ──
  html += `<div style="margin-top:8px"></div>`;
  const totalLabel = inp.taxEnabled ? 'Monthly Cash Flow (after tax)' : 'Monthly Cash Flow';
  const totalNote  = totalCF >= 0
    ? 'Property is cash-flow positive — pays for itself'
    : 'You need to top up from other income each month';
  html += `<div class="pl-total ${totalCFCls}">
    <span class="pl-label">${totalLabel}</span>
    <span class="pl-note" style="font-style:italic;font-size:.7rem;color:#475569">${totalNote}</span>
    <span class="pl-value ${totalCF >= 0 ? 'positive' : 'negative'}">${euro(totalCF)}</span>
  </div>`;

  el.innerHTML = html;
}

function plRow(label, note, val, cls) {
  return `<div class="pl-row"><span class="pl-label">${label}</span><span class="pl-note">${note}</span><span class="pl-value ${cls}">${val}</span></div>`;
}
function plRowIndent(label, note, val, cls) {
  return `<div class="pl-row indent"><span class="pl-label">${label}</span><span class="pl-note">${note}</span><span class="pl-value ${cls}">${val}</span></div>`;
}
function plSubtotal(label, note, val, cls) {
  return `<div class="pl-subtotal"><span class="pl-label">${label}</span><span class="pl-note" style="font-size:.7rem;color:#94a3b8;font-style:italic">${note}</span><span class="pl-value ${cls}">${val}</span></div>`;
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN RECALC
══════════════════════════════════════════════════════════════════════════ */
function recalc() {
  const inp = getInputs();
  const r   = calculate(inp);
  lastResult = r;

  renderKPIs(r, inp);
  renderAcqBar(r);
  renderChart(r);
  renderTable(r);
  renderPL(r, inp);
  if (chartView === 'sensitivity') renderSensitivity(r, inp);
  updateCode();
}

/* ══════════════════════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('input[type="range"]').forEach(el => updateGradient(el.id));
  resetConservative();
});
