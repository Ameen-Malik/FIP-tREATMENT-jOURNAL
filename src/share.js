import './styles.css';
import { createClient } from '@supabase/supabase-js';
import { TOTAL, dkey, todayKey, fmtShort, fmtFull, capsuleBandInfo } from './utils.js';

// Anonymous, read-only page — deliberately independent of state.js/auth.js
// (both assume a signed-in Clerk user). The anon key + the get_shared_report
// RPC (SECURITY DEFINER, token-gated) are the only access path here.
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Postgres 'date' columns come back as "YYYY-MM-DD" — `new Date(str)` parses
// that as UTC midnight, which drifts a calendar day off local time in
// negative-UTC-offset zones. Every other date helper in this app builds
// local dates from y/m/d components instead (see dkey/treatDay in
// utils.js/state.js); this does the same.
function parseDateKey(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function treatDayOf(startDateStr, dateKey) {
  const a = parseDateKey(startDateStr), b = parseDateKey(dateKey);
  return Math.round((b - a) / 86400000) + 1;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function renderError(msg) {
  document.getElementById('shareRoot').innerHTML =
    `<div class="share-error"><div class="share-error-icon">🔒</div><div class="share-error-t">${esc(msg)}</div></div>`;
}

const CHART_W = 600, CHART_H = 200, CHART_PAD_L = 36, CHART_PAD_R = 12, CHART_PAD_T = 16, CHART_PAD_B = 24;

function chartScales(points) {
  const vals = points.map(p => p.v);
  let vMin = Math.min(...vals), vMax = Math.max(...vals);
  if (vMin === vMax) { vMin -= 1; vMax += 1; }
  const vPad = (vMax - vMin) * 0.1;
  vMin -= vPad; vMax += vPad;
  const xAt = i => CHART_PAD_L + (i / (points.length - 1)) * (CHART_W - CHART_PAD_L - CHART_PAD_R);
  const yAt = v => CHART_PAD_T + (1 - (v - vMin) / (vMax - vMin)) * (CHART_H - CHART_PAD_T - CHART_PAD_B);
  return { vMin, vMax, xAt, yAt };
}

function lineChart({ title, unit, points, colorVar }) {
  const w = CHART_W, h = CHART_H, padL = CHART_PAD_L, padR = CHART_PAD_R, padT = CHART_PAD_T, padB = CHART_PAD_B;
  if (points.length < 2) {
    return `<div class="share-chart"><div class="share-chart-title">${esc(title)}</div>
      <div class="share-chart-empty">Not enough data points yet</div></div>`;
  }
  const { vMin, vMax, xAt, yAt } = chartScales(points);

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(p.v).toFixed(1)}`).join(' ');

  const gridLines = [0, 0.5, 1].map(t => {
    const v = vMin + t * (vMax - vMin);
    const y = yAt(v);
    return `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${w-padR}" y2="${y.toFixed(1)}" class="share-chart-grid"/>
      <text x="${padL-6}" y="${y.toFixed(1)}" class="share-chart-axis" text-anchor="end" dominant-baseline="middle">${v.toFixed(1)}</text>`;
  }).join('');

  const firstLbl = fmtShort(points[0].d), lastLbl = fmtShort(points[points.length-1].d);

  return `<div class="share-chart">
    <div class="share-chart-title">${esc(title)} <span class="share-chart-unit">(${esc(unit)})</span></div>
    <svg viewBox="0 0 ${w} ${h}" class="share-chart-svg">
      ${gridLines}
      <path d="${pathD}" fill="none" stroke="var(${colorVar})" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <text x="${padL}" y="${h-6}" class="share-chart-axis">${esc(firstLbl)}</text>
      <text x="${w-padR}" y="${h-6}" class="share-chart-axis" text-anchor="end">${esc(lastLbl)}</text>
      <g class="share-chart-hover" style="display:none">
        <line x1="0" y1="${padT}" x2="0" y2="${h-padB}" class="share-chart-crosshair"/>
        <circle r="4" fill="var(${colorVar})"/>
      </g>
    </svg>
    <div class="share-chart-tooltip" style="display:none"></div>
  </div>`;
}

function wireChartHover(container, series) {
  container.querySelectorAll('.share-chart').forEach((chartEl, idx) => {
    const svg = chartEl.querySelector('svg');
    const hoverG = chartEl.querySelector('.share-chart-hover');
    const crosshair = chartEl.querySelector('.share-chart-crosshair');
    const dot = hoverG?.querySelector('circle');
    const tooltip = chartEl.querySelector('.share-chart-tooltip');
    const { points: pts, unit } = series[idx] || {};
    if (!svg || !pts || pts.length < 2) return;

    const { xAt, yAt } = chartScales(pts);

    function move(clientX) {
      const rect = svg.getBoundingClientRect();
      const svgX = ((clientX - rect.left) / rect.width) * CHART_W;
      let nearest = 0, best = Infinity;
      pts.forEach((p, i) => { const d = Math.abs(xAt(i) - svgX); if (d < best) { best = d; nearest = i; } });
      const x = xAt(nearest);
      crosshair.setAttribute('x1', x); crosshair.setAttribute('x2', x);
      hoverG.style.display = '';
      dot.setAttribute('cy', yAt(pts[nearest].v));
      dot.setAttribute('cx', x);
      tooltip.style.display = '';
      const sep = /^[a-zA-Z]/.test(unit) ? ' ' : '';
      tooltip.textContent = `${fmtShort(pts[nearest].d)} · ${pts[nearest].v}${sep}${unit}`;
      tooltip.style.left = `${(x / CHART_W) * 100}%`;
    }
    svg.addEventListener('mousemove', e => move(e.clientX));
    svg.addEventListener('mouseleave', () => { hoverG.style.display = 'none'; tooltip.style.display = 'none'; });
    svg.addEventListener('touchstart', e => move(e.touches[0].clientX), { passive: true });
    svg.addEventListener('touchmove', e => move(e.touches[0].clientX), { passive: true });
  });
}

async function main() {
  const token = new URLSearchParams(location.search).get('t');
  if (!token) return renderError('No report link provided.');

  const { data, error } = await supabase.rpc('get_shared_report', { p_token: token });
  if (error || !data) return renderError('This link is invalid or has been revoked.');

  const cat = data.cat;
  const logs = (data.logs || []).slice().sort((a, b) => a.date_key.localeCompare(b.date_key));
  const doneLogs = logs.filter(l => l.done);

  const elapsedDay = Math.max(1, Math.min(TOTAL, treatDayOf(cat.start_date, dkey(new Date()))));
  const adherence = elapsedDay > 0
    ? Math.round((doneLogs.filter(l => treatDayOf(cat.start_date, l.date_key) <= elapsedDay).length / elapsedDay) * 100)
    : 0;

  const typeLabel = { dry: 'Dry FIP', wet: 'Wet FIP', neuro: 'Neurological FIP' }[cat.type] || 'FIP';

  const tempPoints = doneLogs.filter(l => l.temp != null).map(l => ({ d: parseDateKey(l.date_key), v: Number(l.temp) }));
  const weightPoints = doneLogs.filter(l => l.weight != null).map(l => ({ d: parseDateKey(l.date_key), v: Number(l.weight) }));

  // Full day-by-day table, day 1 through today (or 84 if treatment has finished).
  const rowsEnd = Math.min(TOTAL, Math.max(elapsedDay, doneLogs.length ? treatDayOf(cat.start_date, doneLogs[doneLogs.length-1].date_key) : elapsedDay));
  const byDay = {};
  for (const l of logs) byDay[l.date_key] = l;
  const tableRows = [];
  for (let n = 1; n <= rowsEnd; n++) {
    const d = parseDateKey(cat.start_date);
    d.setDate(d.getDate() + (n - 1));
    const k = dkey(d);
    const l = byDay[k];
    const isToday = k === todayKey();
    const isFuture = !isToday && k > todayKey();
    let statusCell, doseCell;
    if (l?.done) {
      statusCell = `<span class="share-status share-status-done">✓ Given</span>`;
      if (l.method === 'capsule') {
        const band = capsuleBandInfo(l.capsule_band);
        doseCell = band ? `💊 ${band.color[0].toUpperCase()+band.color.slice(1)} (${band.label})` : '💊 Capsule';
      } else {
        doseCell = l.dose_kg ? `💉 ${l.dose_kg} mg/kg${l.actual ? ' · ' + l.actual + ' ml' : ''}` : '💉';
      }
    } else if (isFuture) {
      statusCell = `<span class="share-status share-status-future">Upcoming</span>`;
      doseCell = '—';
    } else if (isToday) {
      statusCell = `<span class="share-status share-status-future">Not yet logged</span>`;
      doseCell = '—';
    } else {
      statusCell = `<span class="share-status share-status-missed">✗ Missed</span>`;
      doseCell = '—';
    }
    tableRows.push(`<tr>
      <td>${n}</td>
      <td>${esc(fmtShort(d))}</td>
      <td>${statusCell}</td>
      <td>${doseCell}</td>
      <td>${l?.temp != null ? esc(l.temp) + '°C' : '—'}</td>
      <td>${l?.weight != null ? esc(l.weight) + ' kg' : '—'}</td>
      <td class="share-note-cell">${l?.note ? esc(l.note) : ''}</td>
    </tr>`);
  }

  document.getElementById('shareRoot').innerHTML = `
    <div class="share-header">
      <div class="share-header-title">${esc(cat.name)}</div>
      <div class="share-header-sub">${esc(typeLabel)} · Started ${esc(fmtFull(parseDateKey(cat.start_date)))}</div>
      <div class="share-badge">Read-only report · Day ${elapsedDay} of ${TOTAL}</div>
    </div>

    <div class="share-stats">
      <div class="share-stat"><div class="share-stat-v">${adherence}%</div><div class="share-stat-l">Adherence</div></div>
      <div class="share-stat"><div class="share-stat-v">${doneLogs.length}</div><div class="share-stat-l">Doses logged</div></div>
      <div class="share-stat"><div class="share-stat-v">${TOTAL - elapsedDay > 0 ? TOTAL - elapsedDay : 0}</div><div class="share-stat-l">Days remaining</div></div>
    </div>

    <div class="share-charts">
      ${lineChart({ title: 'Temperature', unit: '°C', points: tempPoints, colorVar: '--blue' })}
      ${lineChart({ title: 'Weight', unit: 'kg', points: weightPoints, colorVar: '--green' })}
    </div>

    <div class="share-table-wrap">
      <table class="share-table">
        <thead><tr><th>Day</th><th>Date</th><th>Status</th><th>Dose</th><th>Temp</th><th>Weight</th><th>Notes</th></tr></thead>
        <tbody>${tableRows.join('')}</tbody>
      </table>
    </div>

    <div class="share-footer">Shared from FIP Journal · Read-only, no login required</div>
  `;

  wireChartHover(document, [
    { points: tempPoints, unit: '°C' },
    { points: weightPoints, unit: 'kg' },
  ]);
}

main();
