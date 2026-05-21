/* ═══════════════════════════════════════════════════════════════════════════
   ADAVAU Real Estate — Investment Calculator
   Data sources: JLL, BNP Paribas Real Estate, Colliers, Investropa Q1 2026
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

/* ── Conservative defaults (pessimistic baseline) ────────────────────────── */
const CONSERVATIVE = {
  size:         55,
  pricePerSqm:  3000,   // mid-range entry
  downPayment:  30,     // solid equity buffer
  mortgageRate: 4.2,    // slightly above current market
  loanTerm:     25,
  rentPerSqm:   9.5,    // below market median
  rentIncrease: 2.0,    // low growth assumption
  vacancy:      5.0,    // higher than city average
  mgmtFee:      10.0,   // higher-end management fee
  maintenance:  1.5,    // above-average maintenance
  transferTax:  5.0,    // mid-range state
  appreciation: 3.0,    // conservative appreciation
};

/* ── Chart instance ──────────────────────────────────────────────────────── */
let chart = null;

/* ══════════════════════════════════════════════════════════════════════════
   TAB SWITCHING
══════════════════════════════════════════════════════════════════════════ */
function switchTab(name) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.getElementById('tab-' + name).classList.add('active');
}

/* ══════════════════════════════════════════════════════════════════════════
   COMPARABLES NAV — scroll to section + highlight active link
══════════════════════════════════════════════════════════════════════════ */
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
  const pad = 12;
  const tw = tooltipEl.offsetWidth;
  const th = tooltipEl.offsetHeight;
  let x = e.clientX + pad;
  let y = e.clientY - th / 2;
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

/* ── Set a single field value ────────────────────────────────────────────── */
function setField(rangeId, numId, val) {
  const r = document.getElementById(rangeId);
  const n = document.getElementById(numId);
  if (r) r.value = val;
  if (n) n.value = val;
  if (r) updateGradient(rangeId);
}

/* ── Apply city preset ───────────────────────────────────────────────────── */
function applyPreset(city) {
  const p = PRESETS[city];
  if (!p) return;
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-city="${city}"]`)?.classList.add('active');
  setField('size',        'sizeNum',        p.size);
  setField('pricePerSqm', 'pricePerSqmNum', p.pricePerSqm);
  setField('rentPerSqm',  'rentPerSqmNum',  p.rentPerSqm);
  setField('transferTax', 'transferTaxNum', p.transferTax);
  setField('appreciation','appreciationNum',p.appreciation);
  setField('rentIncrease','rentIncreaseNum',p.rentIncrease);
  recalc();
}

/* ── Reset to conservative defaults ─────────────────────────────────────── */
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

/* ══════════════════════════════════════════════════════════════════════════
   CALCULATIONS
══════════════════════════════════════════════════════════════════════════ */
function getInputs() {
  const g = id => parseFloat(document.getElementById(id).value) || 0;
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
  };
}

function calculate(inp) {
  const { size, pricePerSqm, downPayment, mortgageRate, loanTerm,
          rentPerSqm, rentIncrease, vacancy, mgmtFee, maintenance,
          transferTax, appreciation } = inp;

  // ── Purchase & financing ──
  const purchasePrice  = size * pricePerSqm;
  const acqCostsPct    = transferTax + 0.015 + 0.005 + 0.0357;
  const acqCosts       = purchasePrice * acqCostsPct;
  const totalOutlay    = purchasePrice + acqCosts;
  const loanAmount     = purchasePrice * (1 - downPayment);
  const equityIn       = purchasePrice * downPayment + acqCosts;

  // ── Monthly mortgage (annuity formula) ──
  const r = mortgageRate / 12;
  const n = loanTerm * 12;
  const monthlyMortgage = loanAmount > 0 && r > 0
    ? loanAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
    : (loanAmount > 0 ? loanAmount / n : 0);

  // ── Year 1 income ──
  const grossRentAnnual  = size * rentPerSqm * 12 * (1 - vacancy);
  const grossRentMonthly = grossRentAnnual / 12;
  const mgmtCost         = grossRentAnnual * mgmtFee;
  const maintCost        = purchasePrice * maintenance;
  const netIncomeAnnual  = grossRentAnnual - mgmtCost - maintCost;
  const netIncomeMonthly = netIncomeAnnual / 12;

  // ── Yields ──
  const grossYield = grossRentAnnual / purchasePrice;
  const netYield   = netIncomeAnnual / purchasePrice;
  const kpf        = grossRentAnnual > 0 ? purchasePrice / grossRentAnnual : 0;

  // ── Cash flow ──
  const annualMortgage  = monthlyMortgage * 12;
  const annualCashFlow  = netIncomeAnnual - annualMortgage;
  const monthlyCashFlow = annualCashFlow / 12;
  const cocReturn       = equityIn > 0 ? annualCashFlow / equityIn : 0;

  // ── 10-year projection ──
  // Year 0 row (starting point for NAV line)
  const year0 = {
    year: 0,
    propertyValue: purchasePrice,
    grossRent: 0,
    netIncome: 0,
    mortgage: 0,
    cashFlow: 0,
    loanBalance: loanAmount,
    equity: purchasePrice * downPayment,
    cumOpsCF: 0,
    nav: -equityIn,
    totalReturn: 0,
  };

  const years = [year0];
  let cumOpsCF = 0;   // cumulative operational cash flows (excl. acquisition cost)

  for (let y = 1; y <= loanTerm; y++) {
    const propertyValue = purchasePrice * Math.pow(1 + appreciation, y);
    const rentThisYear  = grossRentAnnual * Math.pow(1 + rentIncrease, y - 1);
    const netThisYear   = rentThisYear * (1 - mgmtFee) - maintCost;
    const cfThisYear    = netThisYear - annualMortgage;
    cumOpsCF += cfThisYear;

    // Remaining loan balance
    const paymentsLeft = n - y * 12;
    let loanBal = 0;
    if (paymentsLeft > 0 && r > 0) {
      loanBal = monthlyMortgage * (1 - Math.pow(1 + r, -paymentsLeft)) / r;
    } else if (paymentsLeft > 0) {
      loanBal = loanAmount - (loanAmount / n) * (y * 12);
    }

    const equity = propertyValue - loanBal;
    // NAV: equity gained above initial + ops cash flows - (only counts ops, acqCosts already deducted via equityIn)
    const nav = equity - equityIn + cumOpsCF;
    const totalReturn = nav; // same thing

    years.push({
      year: y, propertyValue, grossRent: rentThisYear,
      netIncome: netThisYear, mortgage: annualMortgage,
      cashFlow: cfThisYear, loanBalance: loanBal,
      equity, cumOpsCF, nav, totalReturn,
    });
  }

  // ── IRR / Annualised ROI ──
  // Cash flows for IRR: -equityIn at t=0, then annual CF, final year add equity from sale
  const irrCFs = [{ t: 0, cf: -equityIn }];
  for (let y = 1; y <= loanTerm; y++) {
    const row = years[y];
    let cf = row.cashFlow;
    if (y === loanTerm) cf += row.equity; // sale proceeds (net of loan)
    irrCFs.push({ t: y, cf });
  }
  const irr = computeIRR(irrCFs);

  return {
    purchasePrice, acqCosts, totalOutlay, loanAmount, equityIn,
    monthlyMortgage, grossRentAnnual, grossRentMonthly,
    mgmtCost, maintCost, netIncomeAnnual, netIncomeMonthly,
    grossYield, netYield, kpf,
    annualCashFlow, monthlyCashFlow, cocReturn,
    years, irr,
  };
}

/* ── IRR (Newton-Raphson) ────────────────────────────────────────────────── */
function computeIRR(cashflows, guess = 0.08) {
  const MAX_ITER = 100, TOLERANCE = 1e-7;
  let r = guess;
  for (let i = 0; i < MAX_ITER; i++) {
    let npv = 0, dnpv = 0;
    for (const { t, cf } of cashflows) {
      const disc = Math.pow(1 + r, t);
      npv  += cf / disc;
      dnpv -= t * cf / (disc * (1 + r));
    }
    if (Math.abs(dnpv) < 1e-12) break;
    const nr = r - npv / dnpv;
    if (Math.abs(nr - r) < TOLERANCE) return nr;
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

function set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function setKPI(valueId, val, cls) {
  set(valueId, val);
  const card = document.getElementById(valueId)?.closest('.kpi-card');
  if (card) { card.classList.remove('good','warn','bad'); if (cls) card.classList.add(cls); }
}

/* ══════════════════════════════════════════════════════════════════════════
   RENDER
══════════════════════════════════════════════════════════════════════════ */
function renderKPIs(r) {
  const gy = r.grossYield;
  setKPI('kpiGrossYield', pct(gy),            gy >= 0.04 ? 'good' : gy >= 0.03 ? 'warn' : 'bad');
  const ny = r.netYield;
  setKPI('kpiNetYield',   pct(ny),            ny >= 0.03 ? 'good' : ny >= 0.02 ? 'warn' : 'bad');
  const k = r.kpf;
  setKPI('kpiKpf',        fx(k),              k <= 25 ? 'good' : k <= 33 ? 'warn' : 'bad');
  const cf = r.monthlyCashFlow;
  setKPI('kpiCashflow',   euro(cf),           cf >= 100 ? 'good' : cf >= 0 ? 'warn' : 'bad');
  const coc = r.cocReturn;
  setKPI('kpiCoc',        pct1(coc),          coc >= 0.04 ? 'good' : coc >= 0 ? 'warn' : 'bad');
  const irr = r.irr;
  const irrValid = isFinite(irr) && irr > -1 && irr < 2;
  setKPI('kpiIrr', irrValid ? pct1(irr) : 'N/A', irrValid ? (irr >= 0.06 ? 'good' : irr >= 0.03 ? 'warn' : 'bad') : 'bad');
}

function renderAcqBar(r) {
  set('acqPurchase', euro(r.purchasePrice));
  set('acqCosts',    euro(r.acqCosts) + ' (' + pct1(r.acqCosts / r.purchasePrice) + ')');
  set('acqTotal',    euro(r.totalOutlay));
  set('acqEquity',   euro(r.equityIn));
  set('acqMortgage', euro(r.monthlyMortgage) + '/mo');
  set('purchasePriceDisplay', euro(r.purchasePrice));
  set('loanAmountDisplay',    euro(r.loanAmount));
}

function renderChart(r) {
  const inp    = getInputs();
  const rows   = r.years;             // index 0 = year 0, index 1 = year 1 …
  const labels = rows.map(y => y.year === 0 ? 'Now' : 'Y' + y.year);

  // Only show up to 10 years on chart for readability (plus year 0)
  const MAX_CHART = 11;
  const display = rows.slice(0, MAX_CHART);
  const dispLabels = display.map(y => y.year === 0 ? 'Now' : 'Y' + y.year);

  const ctx = document.getElementById('projectionChart').getContext('2d');
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dispLabels,
      datasets: [
        {
          label: 'Property Value',
          data: display.map(y => Math.round(y.propertyValue)),
          borderColor: '#1a56db', backgroundColor: 'rgba(26,86,219,.05)',
          borderWidth: 2.5, pointRadius: 3, pointHoverRadius: 5,
          fill: false, tension: 0.3,
        },
        {
          label: 'Equity',
          data: display.map(y => Math.round(y.equity)),
          borderColor: '#059669', backgroundColor: 'rgba(5,150,105,.05)',
          borderWidth: 2.5, pointRadius: 3, pointHoverRadius: 5,
          fill: false, tension: 0.3,
        },
        {
          label: 'Cumulative Cash Flow',
          data: display.map(y => Math.round(y.cumOpsCF)),
          borderColor: '#e74694', backgroundColor: 'rgba(231,70,148,.05)',
          borderWidth: 2, pointRadius: 3, pointHoverRadius: 5,
          fill: false, tension: 0.3,
          borderDash: [5, 3],
        },
        {
          label: 'Net Asset Value',
          data: display.map(y => Math.round(y.nav)),
          borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,.05)',
          borderWidth: 2.5, pointRadius: 3, pointHoverRadius: 5,
          fill: false, tension: 0.3,
          borderDash: [8, 4],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => '  ' + ctx.dataset.label + ': ' +
              new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(ctx.parsed.y),
          },
          backgroundColor: '#1e293b',
          titleColor: '#94a3b8',
          bodyColor: '#e2e8f0',
          padding: 10,
          cornerRadius: 8,
        },
        annotation: undefined,
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8', font: { size: 11 } },
          border: { color: '#e2e8f0' },
        },
        y: {
          grid: { color: '#f1f5f9' },
          ticks: {
            color: '#94a3b8',
            font: { size: 11 },
            callback: v => '€' + new Intl.NumberFormat('de-DE', { notation: 'compact', maximumFractionDigits: 0 }).format(v),
          },
          border: { dash: [4, 4], color: '#e2e8f0' },
        },
      },
    },
  });
}

function renderTable(r) {
  const tbody = document.getElementById('breakdownBody');
  if (!tbody) return;
  // Skip year 0 in the table (start from year 1)
  tbody.innerHTML = r.years.slice(1).map(y => `
    <tr>
      <td>Year ${y.year}</td>
      <td>${euro(y.propertyValue)}</td>
      <td>${euro(y.grossRent)}</td>
      <td>${euro(y.netIncome)}</td>
      <td>${euro(y.mortgage)}</td>
      <td class="${y.cashFlow >= 0 ? 'positive' : 'negative'}">${euro(y.cashFlow)}</td>
      <td>${euro(y.loanBalance)}</td>
      <td class="highlight">${euro(y.equity)}</td>
      <td class="${y.nav >= 0 ? 'positive' : 'negative'}">${euro(y.nav)}</td>
    </tr>
  `).join('');
}

function renderMonthly(r) {
  const grid = document.getElementById('monthlyGrid');
  if (!grid) return;
  const vac = parseFloat(document.getElementById('vacancyNum').value) / 100;
  const grossBeforeVac = r.grossRentAnnual / (1 - vac) / 12;
  const items = [
    { label: 'Gross Rent (full)',    value: euro(grossBeforeVac),        cls: 'neutral'  },
    { label: 'Vacancy Loss',         value: euro(-(grossBeforeVac - r.grossRentMonthly)), cls: 'negative' },
    { label: 'Eff. Gross Rent',      value: euro(r.grossRentMonthly),    cls: 'neutral'  },
    { label: 'Management Fee',       value: euro(-r.mgmtCost / 12),      cls: 'negative' },
    { label: 'Maintenance',          value: euro(-r.maintCost / 12),     cls: 'negative' },
    { label: 'Net Rental Income',    value: euro(r.netIncomeMonthly),    cls: r.netIncomeMonthly >= 0 ? 'positive' : 'negative' },
    { label: 'Mortgage Payment',     value: euro(-r.monthlyMortgage),    cls: 'negative' },
    { label: 'Monthly Cash Flow',    value: euro(r.monthlyCashFlow),     cls: r.monthlyCashFlow >= 0 ? 'positive' : 'negative' },
  ];
  grid.innerHTML = items.map(i => `
    <div class="monthly-item">
      <div class="monthly-item-label">${i.label}</div>
      <div class="monthly-item-value ${i.cls}">${i.value}</div>
    </div>
  `).join('');
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN RECALC
══════════════════════════════════════════════════════════════════════════ */
function recalc() {
  const inp = getInputs();
  const r   = calculate(inp);
  renderKPIs(r);
  renderAcqBar(r);
  renderChart(r);
  renderTable(r);
  renderMonthly(r);
}

/* ══════════════════════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('input[type="range"]').forEach(el => updateGradient(el.id));
  resetConservative();   // start with conservative defaults (no city highlighted)
});
