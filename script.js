/* ── City Presets ─────────────────────────────────────────────────────────
   Data sourced from JLL, BNP Paribas Real Estate, Colliers, Investropa Q1 2026
   pricePerSqm  : €/m² existing apartments (midpoint of range)
   rentPerSqm   : €/m²/month (midpoint of range)
   transferTax  : Grunderwerbsteuer by Bundesland
   appreciation : Annual nominal forecast (%)
   rentIncrease : Annual rent growth assumption (%)
   ────────────────────────────────────────────────────────────────────────── */
const PRESETS = {
  leipzig:    { pricePerSqm: 2550, rentPerSqm: 10.8, transferTax: 3.5, appreciation: 6.0, rentIncrease: 4.0, size: 55, label: "Leipzig"    },
  dresden:    { pricePerSqm: 3000, rentPerSqm: 10.5, transferTax: 3.5, appreciation: 6.0, rentIncrease: 3.5, size: 55, label: "Dresden"    },
  hannover:   { pricePerSqm: 3400, rentPerSqm: 12.0, transferTax: 5.0, appreciation: 3.5, rentIncrease: 3.0, size: 60, label: "Hannover"   },
  nuremberg:  { pricePerSqm: 4000, rentPerSqm: 13.0, transferTax: 3.5, appreciation: 3.5, rentIncrease: 3.0, size: 60, label: "Nuremberg"  },
  cologne:    { pricePerSqm: 5000, rentPerSqm: 15.8, transferTax: 6.5, appreciation: 4.0, rentIncrease: 3.5, size: 55, label: "Cologne"    },
  dusseldorf: { pricePerSqm: 5000, rentPerSqm: 14.8, transferTax: 6.5, appreciation: 4.5, rentIncrease: 4.0, size: 55, label: "Düsseldorf" },
  berlin:     { pricePerSqm: 5450, rentPerSqm: 14.0, transferTax: 6.0, appreciation: 4.0, rentIncrease: 3.0, size: 50, label: "Berlin"     },
  hamburg:    { pricePerSqm: 6200, rentPerSqm: 16.0, transferTax: 5.5, appreciation: 5.0, rentIncrease: 4.0, size: 50, label: "Hamburg"    },
  frankfurt:  { pricePerSqm: 6000, rentPerSqm: 17.5, transferTax: 6.0, appreciation: 3.5, rentIncrease: 3.0, size: 50, label: "Frankfurt"  },
  munich:     { pricePerSqm: 9000, rentPerSqm: 18.0, transferTax: 3.5, appreciation: 3.0, rentIncrease: 2.5, size: 45, label: "Munich"     },
};

/* ── Chart instance ──────────────────────────────────────────────────────── */
let chart = null;

/* ── Sync range ↔ number inputs ──────────────────────────────────────────── */
function syncNum(rangeId, numId) {
  const v = document.getElementById(rangeId).value;
  document.getElementById(numId).value = v;
  updateRangeGradient(rangeId);
}
function syncRange(numId, rangeId) {
  const el = document.getElementById(rangeId);
  const v = document.getElementById(numId).value;
  el.value = v;
  updateRangeGradient(rangeId);
}
function updateRangeGradient(id) {
  const el = document.getElementById(id);
  if (!el || el.type !== 'range') return;
  const min = parseFloat(el.min), max = parseFloat(el.max), val = parseFloat(el.value);
  const pct = ((val - min) / (max - min)) * 100;
  el.style.background = `linear-gradient(to right, #1a56db ${pct}%, #e2e8f0 ${pct}%)`;
}

/* ── Apply city preset ───────────────────────────────────────────────────── */
function applyPreset(city) {
  const p = PRESETS[city];
  if (!p) return;

  // Mark active button
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-city="${city}"]`)?.classList.add('active');

  // Set values
  const fields = {
    size:         p.size,
    sizeNum:      p.size,
    pricePerSqm:  p.pricePerSqm,
    pricePerSqmNum: p.pricePerSqm,
    rentPerSqm:   p.rentPerSqm,
    rentPerSqmNum: p.rentPerSqm,
    transferTax:  p.transferTax,
    transferTaxNum: p.transferTax,
    appreciation: p.appreciation,
    appreciationNum: p.appreciation,
    rentIncrease: p.rentIncrease,
    rentIncreaseNum: p.rentIncrease,
  };
  for (const [id, val] of Object.entries(fields)) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }
  // Update gradients
  ['size','pricePerSqm','rentPerSqm','transferTax','appreciation','rentIncrease'].forEach(updateRangeGradient);
  recalc();
}

/* ── Get all input values ────────────────────────────────────────────────── */
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

/* ── Core calculations ───────────────────────────────────────────────────── */
function calculate(inp) {
  const {
    size, pricePerSqm, downPayment, mortgageRate, loanTerm,
    rentPerSqm, rentIncrease, vacancy, mgmtFee, maintenance,
    transferTax, appreciation
  } = inp;

  // Purchase
  const purchasePrice = size * pricePerSqm;
  const acqCostsPct   = transferTax + 0.015 + 0.005 + 0.0357; // tax + notary + register + agent
  const acqCosts      = purchasePrice * acqCostsPct;
  const totalOutlay   = purchasePrice + acqCosts;

  // Financing
  const loanAmount    = purchasePrice * (1 - downPayment);
  const equityIn      = purchasePrice * downPayment + acqCosts;
  const r             = mortgageRate / 12;
  const n             = loanTerm * 12;
  const monthlyMortgage = loanAmount > 0 && r > 0
    ? loanAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
    : loanAmount / n;

  // Year 1 income
  const grossRentAnnual  = size * rentPerSqm * 12 * (1 - vacancy);
  const grossRentMonthly = grossRentAnnual / 12;
  const mgmtCost         = grossRentAnnual * mgmtFee;
  const maintCost        = purchasePrice * maintenance;
  const netIncomeAnnual  = grossRentAnnual - mgmtCost - maintCost;
  const netIncomeMonthly = netIncomeAnnual / 12;

  // Yields
  const grossYield = grossRentAnnual / purchasePrice;
  const netYield   = netIncomeAnnual / purchasePrice;
  const kpf        = purchasePrice / grossRentAnnual;

  // Cash flow
  const annualMortgage   = monthlyMortgage * 12;
  const annualCashFlow   = netIncomeAnnual - annualMortgage;
  const monthlyCashFlow  = annualCashFlow / 12;
  const cocReturn        = equityIn > 0 ? annualCashFlow / equityIn : 0;

  // 10-year projection
  const years = [];
  let remainingLoan = loanAmount;
  let cumCashFlow   = -acqCosts; // start with acquisition cost as negative
  let cumMortgagePrincipal = 0;

  for (let y = 1; y <= 10; y++) {
    const propertyValue = purchasePrice * Math.pow(1 + appreciation, y);
    const rentThisYear  = grossRentAnnual * Math.pow(1 + rentIncrease, y - 1);
    const netThisYear   = rentThisYear * (1 - mgmtFee) - maintCost;
    const cfThisYear    = netThisYear - annualMortgage;
    cumCashFlow += cfThisYear;

    // Remaining loan balance after y years
    const paymentsLeft = n - y * 12;
    let loanBal = 0;
    if (paymentsLeft > 0 && r > 0) {
      loanBal = monthlyMortgage * (1 - Math.pow(1 + r, -paymentsLeft)) / r;
    }
    const equity = propertyValue - loanBal;
    const totalReturn = equity - equityIn + cumCashFlow + acqCosts; // appreciation gain + cf

    years.push({
      year: y,
      propertyValue,
      grossRent: rentThisYear,
      netIncome: netThisYear,
      mortgage: annualMortgage,
      cashFlow: cfThisYear,
      loanBalance: loanBal,
      equity,
      cumCashFlow,
      totalReturn,
    });
  }

  const tenYearReturn = years[9].totalReturn;
  const tenYearEquity = years[9].equity;

  return {
    purchasePrice, acqCosts, totalOutlay, loanAmount, equityIn,
    monthlyMortgage, grossRentAnnual, grossRentMonthly,
    mgmtCost, maintCost, netIncomeAnnual, netIncomeMonthly,
    grossYield, netYield, kpf,
    annualCashFlow, monthlyCashFlow, cocReturn,
    years, tenYearReturn, tenYearEquity,
  };
}

/* ── Formatting helpers ──────────────────────────────────────────────────── */
const fmt = {
  euro:  v => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v),
  pct:   v => (v * 100).toFixed(2) + '%',
  pct1:  v => (v * 100).toFixed(1) + '%',
  x:     v => v.toFixed(1) + '×',
  num:   v => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(v),
};

function yieldClass(y) {
  if (y >= 0.04) return 'good';
  if (y >= 0.03) return 'warn';
  return 'bad';
}
function cfClass(cf) {
  if (cf >= 100) return 'good';
  if (cf >= 0)   return 'warn';
  return 'bad';
}

/* ── Render KPI cards ────────────────────────────────────────────────────── */
function renderKPIs(r) {
  setKPI('kpiGrossYield',    fmt.pct(r.grossYield),    r.grossYield >= 0.04 ? 'good' : r.grossYield >= 0.03 ? 'warn' : 'bad');
  setKPI('kpiNetYield',      fmt.pct(r.netYield),      r.netYield >= 0.03 ? 'good' : r.netYield >= 0.02 ? 'warn' : 'bad');
  setKPI('kpiKpf',           fmt.x(r.kpf),             r.kpf <= 25 ? 'good' : r.kpf <= 33 ? 'warn' : 'bad');
  setKPI('kpiCashflow',      fmt.euro(r.monthlyCashFlow), cfClass(r.monthlyCashFlow));
  setKPI('kpiCoc',           fmt.pct1(r.cocReturn),    r.cocReturn >= 0.04 ? 'good' : r.cocReturn >= 0 ? 'warn' : 'bad');
  setKPI('kpiTotalReturn',   fmt.euro(r.tenYearReturn), r.tenYearReturn >= 0 ? 'good' : 'bad');
}
function setKPI(id, val, cls) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = val;
  const card = el.closest('.kpi-card');
  if (card) {
    card.classList.remove('good','warn','bad');
    if (cls) card.classList.add(cls);
  }
}

/* ── Render acquisition bar ──────────────────────────────────────────────── */
function renderAcqBar(r, inp) {
  set('acqPurchase', fmt.euro(r.purchasePrice));
  set('acqCosts',    fmt.euro(r.acqCosts) + ` (${fmt.pct1((r.acqCosts / r.purchasePrice))})`);
  set('acqTotal',    fmt.euro(r.totalOutlay));
  set('acqEquity',   fmt.euro(r.equityIn));
  set('acqMortgage', fmt.euro(r.monthlyMortgage) + '/mo');
  set('purchasePriceDisplay', fmt.euro(r.purchasePrice));
  set('loanAmountDisplay',    fmt.euro(r.loanAmount));
}
function set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ── Render chart ────────────────────────────────────────────────────────── */
function renderChart(r) {
  const labels = r.years.map(y => `Y${y.year}`);
  const propVals   = r.years.map(y => Math.round(y.propertyValue));
  const equityVals = r.years.map(y => Math.round(y.equity));
  const ccfVals    = r.years.map(y => Math.round(y.cumCashFlow));

  const ctx = document.getElementById('projectionChart').getContext('2d');

  if (chart) { chart.destroy(); }

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Property Value',
          data: propVals,
          borderColor: '#1a56db',
          backgroundColor: 'rgba(26,86,219,.06)',
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: false,
          tension: 0.3,
        },
        {
          label: 'Equity',
          data: equityVals,
          borderColor: '#0e9f6e',
          backgroundColor: 'rgba(14,159,110,.06)',
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: false,
          tension: 0.3,
        },
        {
          label: 'Cumulative Cash Flow',
          data: ccfVals,
          borderColor: '#e74694',
          backgroundColor: 'rgba(231,70,148,.06)',
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: false,
          tension: 0.3,
          borderDash: [5, 3],
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
            label: ctx => `  ${ctx.dataset.label}: ${new Intl.NumberFormat('de-DE', {
              style: 'currency', currency: 'EUR', maximumFractionDigits: 0
            }).format(ctx.parsed.y)}`,
          },
          backgroundColor: '#1e293b',
          titleColor: '#94a3b8',
          bodyColor: '#e2e8f0',
          padding: 10,
          cornerRadius: 8,
        },
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

/* ── Render breakdown table ──────────────────────────────────────────────── */
function renderTable(r) {
  const tbody = document.getElementById('breakdownBody');
  if (!tbody) return;
  tbody.innerHTML = r.years.map(y => `
    <tr>
      <td>Year ${y.year}</td>
      <td>${fmt.euro(y.propertyValue)}</td>
      <td>${fmt.euro(y.grossRent)}</td>
      <td>${fmt.euro(y.netIncome)}</td>
      <td>${fmt.euro(y.mortgage)}</td>
      <td class="${y.cashFlow >= 0 ? 'positive' : 'negative'}">${fmt.euro(y.cashFlow)}</td>
      <td>${fmt.euro(y.loanBalance)}</td>
      <td class="highlight">${fmt.euro(y.equity)}</td>
      <td class="${y.totalReturn >= 0 ? 'positive' : 'negative'}">${fmt.euro(y.totalReturn)}</td>
    </tr>
  `).join('');
}

/* ── Render monthly breakdown ────────────────────────────────────────────── */
function renderMonthly(r) {
  const grid = document.getElementById('monthlyGrid');
  if (!grid) return;

  const items = [
    { label: 'Gross Rent',        value: fmt.euro(r.grossRentMonthly),   cls: 'neutral' },
    { label: 'Vacancy Cost',      value: fmt.euro(-r.grossRentMonthly * (parseFloat(document.getElementById('vacancyNum').value)/100 / (1 - parseFloat(document.getElementById('vacancyNum').value)/100))), cls: 'negative' },
    { label: 'Management Fee',    value: fmt.euro(-r.mgmtCost / 12),     cls: 'negative' },
    { label: 'Maintenance',       value: fmt.euro(-r.maintCost / 12),    cls: 'negative' },
    { label: 'Net Rental Income', value: fmt.euro(r.netIncomeMonthly),   cls: r.netIncomeMonthly >= 0 ? 'positive' : 'negative' },
    { label: 'Mortgage Payment',  value: fmt.euro(-r.monthlyMortgage),   cls: 'negative' },
    { label: 'Monthly Cash Flow', value: fmt.euro(r.monthlyCashFlow),    cls: r.monthlyCashFlow >= 0 ? 'positive' : 'negative' },
    { label: 'Annual Cash Flow',  value: fmt.euro(r.annualCashFlow),     cls: r.annualCashFlow >= 0 ? 'positive' : 'negative' },
  ];

  grid.innerHTML = items.map(i => `
    <div class="monthly-item">
      <div class="monthly-item-label">${i.label}</div>
      <div class="monthly-item-value ${i.cls}">${i.value}</div>
    </div>
  `).join('');
}

/* ── Main recalc ─────────────────────────────────────────────────────────── */
function recalc() {
  const inp = getInputs();
  const r   = calculate(inp);
  renderKPIs(r);
  renderAcqBar(r, inp);
  renderChart(r);
  renderTable(r);
  renderMonthly(r);
}

/* ── Init on load ────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Initialise all range gradients
  document.querySelectorAll('input[type="range"]').forEach(el => updateRangeGradient(el.id));
  // Load Leipzig as default
  applyPreset('leipzig');
});
