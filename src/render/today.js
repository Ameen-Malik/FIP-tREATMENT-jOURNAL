import { S, curDay, stats, dayNDate, protoDoseKg } from '../state.js';
import { TOTAL, fmtShort, fmtFull, todayKey } from '../utils.js';
import { setPills } from '../ui/pills.js';
import { updateHoldButtonState, getNextInjectionTarget } from '../ui/hold-to-confirm.js';
import { applyMethodToTodayForm } from '../actions.js';
import { capsuleBandInfo } from '../utils.js';
import { checkBloodReportMilestone } from '../blood-reports.js';

export function renderToday() {
  const day = curDay(), st = stats(), tk = todayKey(), log = S.logs[tk]||{};
  const now = new Date();

  // Cat name
  document.getElementById('catName').textContent = S.name||'Set name';
  document.getElementById('heroName').textContent = S.name ? `${S.name}'s treatment` : 'Treatment day';
  document.getElementById('heroStatus').textContent = `Day ${day}`;

  // Stats
  document.getElementById('hmDone').textContent = st.done;
  document.getElementById('hmLeft').textContent = st.left;
  document.getElementById('hmStreak').textContent = st.streak;

  // Progress bar
  const pct = Math.round(st.done/TOTAL*100);
  document.getElementById('progFill').style.width = pct+'%';
  document.getElementById('progPct').textContent = pct+'%';
  document.getElementById('startDateLbl').textContent = fmtShort(dayNDate(1));
  document.getElementById('endDateLbl').textContent = fmtShort(dayNDate(84));
  document.getElementById('completionSub').textContent = fmtFull(dayNDate(84));

  // Protocol sub
  const pNames = {dry:'Dry FIP · 6 mg/kg',wet:'Wet FIP · 8 mg/kg',neuro:'Neurological · 10 mg/kg'};
  const methodLabel = S.proto.method === 'capsule' ? '💊 Capsule' : '💉 Injection';
  document.getElementById('protoSub').textContent = S.proto.type
    ? `${pNames[S.proto.type]} · ${S.proto.method === 'capsule' ? methodLabel : S.proto.conc + ' mg/ml'}`
    : 'Tap to set FIP type & defaults';

  // CTA date
  document.getElementById('ctaDate').textContent = fmtFull(now);

  // Update Hold Button state, form visibility and dynamic gamified message
  const done = !!log.done;
  updateHoldButtonState(done);

  // Timing notification banner
  const banner = document.getElementById('injectionTimingBanner');
  const targetTime = getNextInjectionTarget();
  const hrsVal = targetTime.getHours().toString().padStart(2, '0');
  const minsVal = targetTime.getMinutes().toString().padStart(2, '0');
  const targetTimeStr = `${hrsVal}:${minsVal}`;

  const logForm = document.getElementById('logForm');
  const loggedCard = document.getElementById('loggedStateCard');

  if (done) {
    logForm.style.display = 'none';
    loggedCard.style.display = 'flex';

    const catName = S.name || 'your cat';
    document.getElementById('loggedStreakMsg').textContent = `One step closer to saving ${catName}! 🐾`;

    // Populate summary of logged details
    document.getElementById('lsTemp').textContent = log.temp ? `${log.temp}°C` : '—';
    document.getElementById('lsWeight').textContent = log.weight ? `${log.weight} kg` : '—';
    let doseVal = '—';
    if (log.method === 'capsule') {
      const band = capsuleBandInfo(log.capsuleBand);
      doseVal = band ? `${band.color[0].toUpperCase()}${band.color.slice(1)} capsule` : 'Capsule';
    } else if (log.actual) {
      doseVal = `${log.actual} ml`;
    } else if (log.doseKg) {
      doseVal = `${log.doseKg} mg/kg`;
    }
    document.getElementById('lsDose').textContent = doseVal;

    // Logged banner state
    if (log.ts) {
      const loggedDate = new Date(log.ts);
      const lHrs = loggedDate.getHours().toString().padStart(2, '0');
      const lMins = loggedDate.getMinutes().toString().padStart(2, '0');
      document.getElementById('injectionTimingText').textContent = `Today's injection completed at ${lHrs}:${lMins} ✓`;
    } else {
      document.getElementById('injectionTimingText').textContent = `Today's injection completed ✓`;
    }
    banner.style.background = 'var(--gd)';
    banner.style.color = 'var(--green)';
    banner.style.borderColor = 'rgba(48, 209, 88, 0.25)';
    banner.style.display = 'flex';
  } else {
    logForm.style.display = 'block';
    loggedCard.style.display = 'none';

    // Unlock form inputs
    const inputs = ['iTemp', 'iWeight', 'iDoseKg', 'iActual', 'iNote', 'iTime'];
    inputs.forEach(id => {
      document.getElementById(id).disabled = false;
    });
    document.querySelectorAll('#concPills .pill').forEach(p => {
      p.disabled = false;
    });

    // Active timing calculation
    const diffMs = targetTime - Date.now();
    if (diffMs > 0) {
      const diffHrs = Math.floor(diffMs / 3600000);
      const diffMins = Math.floor((diffMs % 3600000) / 60000);
      document.getElementById('injectionTimingText').textContent = `Next injection due at ${targetTimeStr} (${diffHrs}h ${diffMins}m remaining)`;
      banner.style.background = 'var(--bd)';
      banner.style.color = 'var(--blue)';
      banner.style.borderColor = 'rgba(0, 122, 255, 0.15)';
    } else {
      const overdueMs = Math.abs(diffMs);
      const diffHrs = Math.floor(overdueMs / 3600000);
      const diffMins = Math.floor((overdueMs % 3600000) / 60000);
      document.getElementById('injectionTimingText').textContent = `Injection overdue! Was due at ${targetTimeStr} (${diffHrs}h ${diffMins}m overdue) ⚠️`;
      banner.style.background = 'var(--rd)';
      banner.style.color = 'var(--red)';
      banner.style.borderColor = 'rgba(255, 59, 48, 0.2)';
    }
    banner.style.display = 'flex';
  }

  // Restore form values
  document.getElementById('iTemp').value   = log.temp||'';
  document.getElementById('iWeight').value = log.weight||'';
  document.getElementById('iDoseKg').value = log.doseKg||protoDoseKg()||'';
  document.getElementById('iActual').value = log.actual||'';
  document.getElementById('iNote').value   = log.note||'';

  if (log.ts) {
    const tObj = new Date(log.ts);
    document.getElementById('iTime').value = `${tObj.getHours().toString().padStart(2, '0')}:${tObj.getMinutes().toString().padStart(2, '0')}`;
  } else {
    document.getElementById('iTime').value = `${hrsVal}:${minsVal}`;
  }

  setPills('#concPills', log.conc||S.proto.conc||30);
  applyMethodToTodayForm();
  if (log.method === 'capsule' && log.capsuleBand) {
    document.querySelectorAll('#capsulePillsToday .pill').forEach(p =>
      p.classList.toggle('sel', p.dataset.v === log.capsuleBand));
  }
  checkBloodReportMilestone();
}
