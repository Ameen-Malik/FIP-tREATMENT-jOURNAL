import { S, treatDay } from '../state.js';
import { TOTAL, MO, pad, dkey, todayKey, fmtFull, capsuleBandInfo } from '../utils.js';
import { getBatchMode, getSelectedBatchDays } from '../batch-log.js';

const _today = new Date();
export let calView = new Date(_today.getFullYear(), _today.getMonth(), 1);

export function shiftCalMonth(delta) {
  calView.setMonth(calView.getMonth() + delta);
  renderCalendar();
}

// Swipe-to-change-month on the grid. Attached once to the persistent #calDays
// container (its innerHTML is replaced on every render, but the element
// itself isn't) rather than per-cell, so it survives re-renders for free.
(function initCalendarSwipe() {
  const el = document.getElementById('calDays');
  if (!el) return;
  let startX = 0, startY = 0, swiping = false;
  const THRESHOLD = 50;

  el.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    swiping = false;
  }, { passive: true });

  el.addEventListener('touchmove', e => {
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) swiping = true;
  }, { passive: true });

  el.addEventListener('touchend', e => {
    if (!swiping) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > THRESHOLD) shiftCalMonth(dx < 0 ? 1 : -1);
  }, { passive: true });
})();

export function renderCalendar() {
  const y = calView.getFullYear(), m = calView.getMonth();
  document.getElementById('calMonth').textContent = `${MO[m]} ${y}`;

  const batchMode = getBatchMode();
  const selectedBatchDays = getSelectedBatchDays();

  const batchBtn = document.getElementById('calBatchBtn');
  if (batchBtn) {
    batchBtn.style.background = batchMode ? 'var(--blue)' : 'var(--s2)';
    batchBtn.style.color = batchMode ? '#ffffff' : 'var(--l2)';
    batchBtn.style.borderColor = batchMode ? 'rgba(0,122,255,0.2)' : 'var(--l4)';
    batchBtn.textContent = batchMode ? 'Selecting...' : 'Batch Log';
  }

  const firstDow = new Date(y, m, 1).getDay();   // 0=Sun
  const daysInMonth = new Date(y, m+1, 0).getDate();

  const todStr = todayKey();
  const nowMid = new Date(); nowMid.setHours(0,0,0,0);

  let html = '';
  // Leading empty cells
  for (let i=0; i<firstDow; i++) html += `<div class="cd empty"></div>`;

  for (let d=1; d<=daysInMonth; d++) {
    const date = new Date(y, m, d);
    const k = dkey(date);
    const td = treatDay(date);   // treatment day number
    const isToday = k === todStr;
    const isPast  = date < nowMid;
    const inRange = td >= 1 && td <= TOTAL;
    const log = S.logs[k];

    let cls = 'cd';

    if (batchMode) {
      const isValidBatchDay = td >= 1 && date <= nowMid;
      if (!isValidBatchDay) {
        cls += ' disabled-batch';
      } else if (selectedBatchDays.has(k)) {
        cls += ' sel-batch';
      } else {
        if (inRange && log?.done)             cls += ' done-c';
        else if (inRange && isPast && !isToday) cls += ' missed-c';
        else if (!inRange || (!isPast && !isToday)) cls += ' future';
        if (isToday) cls += ' today-c';
      }
    } else {
      if (inRange && log?.done)             cls += ' done-c';
      else if (inRange && isPast && !isToday) cls += ' missed-c';
      else if (!inRange || (!isPast && !isToday)) cls += ' future';
      if (isToday) cls += ' today-c';
    }

    html += `<button class="${cls}" data-k="${k}" data-td="${td}">${d}</button>`;
  }

  document.getElementById('calDays').innerHTML = html;

  document.querySelectorAll('#calDays .cd:not(.empty)').forEach(el => {
    el.addEventListener('click', () => {
      const k = el.dataset.k;
      if (getBatchMode()) {
        if (selectedBatchDays.has(k)) {
          selectedBatchDays.delete(k);
        } else {
          selectedBatchDays.add(k);
        }
        document.getElementById('batchCount').textContent = selectedBatchDays.size;
        renderCalendar();
      } else {
        showDayCard(el);
      }
    });
  });

  document.getElementById('dayCard').classList.remove('open');
}

export function showDayCard(el) {
  const k = el.dataset.k, td = parseInt(el.dataset.td);
  const [y,mo,d] = k.split('-').map(Number);
  const date = new Date(y, mo-1, d);
  const log = S.logs[k];
  const nowMid = new Date(); nowMid.setHours(0,0,0,0);
  const isPast = date < nowMid;
  const isToday = k === todayKey();
  const inRange = td >= 1 && td <= TOTAL;

  document.getElementById('dcDate').textContent = fmtFull(date);
  document.getElementById('dcBadge').textContent = inRange ? `Day ${td}` : 'Not in range';
  document.getElementById('dcBadge').style.display = inRange ? '' : 'none';

  const body = document.getElementById('dcBody');
  const actions = document.getElementById('dcActions');
  body.innerHTML = '';
  actions.innerHTML = '';

  if (!inRange) {
    body.innerHTML = `<div class="dc-row" style="color:var(--l3)">Outside treatment period</div>`;
  } else if (log?.done) {
    const t = new Date(log.ts);
    const timeStr = `${pad(t.getHours())}:${pad(t.getMinutes())}`;
    const isCapsule = log.method === 'capsule';
    let rows = `<div class="dc-row">✅ <span>${isCapsule?'Given':'Injected'} at ${timeStr}</span></div>`;
    if (isCapsule) {
      const band = capsuleBandInfo(log.capsuleBand);
      rows += `<div class="dc-row">💊 <span>${band ? band.color[0].toUpperCase()+band.color.slice(1)+' capsule ('+band.label+')' : 'Capsule'}</span></div>`;
    } else {
      if (log.doseKg)  rows += `<div class="dc-row">💉 <span>${log.doseKg} mg/kg${log.actual?' · '+log.actual+' ml':''}</span></div>`;
      if (log.conc)    rows += `<div class="dc-row">🧪 <span>${log.conc} mg/ml</span></div>`;
    }
    if (log.temp)    rows += `<div class="dc-row">🌡️ <span>${log.temp}°C</span></div>`;
    if (log.weight)  rows += `<div class="dc-row">⚖️ <span>${log.weight} kg</span></div>`;
    if (log.note)    rows += `<div class="dc-row">📝 <span style="font-weight:400;color:var(--l2)">${log.note}</span></div>`;
    body.innerHTML = rows;
    actions.innerHTML = `<button class="dc-btn dc-btn-blue" onclick="openEdit('${k}')">Edit</button>`;
  } else if (isPast || isToday) {
    body.innerHTML = `<div class="dc-row" style="color:${isPast&&!isToday?'var(--red)':'var(--l3)'}">
      ${isPast&&!isToday?'❌ Missed':'📅 Not logged yet'}</div>`;
    actions.innerHTML = `<button class="dc-btn dc-btn-blue" onclick="openEdit('${k}')">Add entry</button>`;
  } else {
    body.innerHTML = `<div class="dc-row" style="color:var(--l3)">📅 Upcoming</div>`;
  }

  document.getElementById('dayCard').classList.add('open');
  document.getElementById('dayCard').scrollIntoView({behavior:'smooth',block:'nearest'});
}
