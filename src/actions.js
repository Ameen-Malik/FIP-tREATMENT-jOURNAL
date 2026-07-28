import { S, save, stats } from './state.js';
import { todayKey, calcMl, capsuleBandForWeight } from './utils.js';
import { toast } from './ui/toast.js';
import { openSheet } from './ui/sheets.js';
import { renderAll } from './render/index.js';
import { generateMilestoneCard } from './milestone-card.js';

/** Show injection or capsule fields on the today form, matching the cat's current protocol method. */
export function applyMethodToTodayForm() {
  const isCapsule = S.proto.method === 'capsule';
  document.getElementById('injectionFieldsToday').style.display = isCapsule ? 'none' : '';
  document.getElementById('doseFieldsToday').style.display = isCapsule ? 'none' : '';
  document.getElementById('capsuleFieldsToday').style.display = isCapsule ? '' : 'none';
  if (isCapsule) {
    const weight = document.getElementById('iWeight').value || S.proto.weight;
    const band = capsuleBandForWeight(weight);
    document.querySelectorAll('#capsulePillsToday .pill').forEach(p =>
      p.classList.toggle('sel', p.dataset.v === band));
  }
}

export function readForm() {
  const isCapsule = S.proto.method === 'capsule';
  const base = {
    temp:   document.getElementById('iTemp').value.trim(),
    weight: document.getElementById('iWeight').value.trim(),
    note:   document.getElementById('iNote').value.trim(),
    method: S.proto.method || 'injection',
  };
  if (isCapsule) {
    const bandEl = document.querySelector('#capsulePillsToday .pill.sel');
    return { ...base, capsuleBand: bandEl ? bandEl.dataset.v : capsuleBandForWeight(base.weight), conc:'', doseKg:'', actual:'' };
  }
  const cSel = document.querySelector('#concPills .pill.sel');
  return { ...base, conc: cSel ? cSel.dataset.v : S.proto.conc, doseKg: document.getElementById('iDoseKg').value.trim(), actual: document.getElementById('iActual').value.trim(), capsuleBand:'' };
}

export function markToday() {
  const tk = todayKey();
  const timeVal = document.getElementById('iTime').value || '20:00';
  const [hh, mm] = timeVal.split(':').map(Number);
  const logDate = new Date();
  logDate.setHours(hh, mm, 0, 0);

  S.logs[tk] = { ...readForm(), done:true, ts:logDate.getTime() };
  save(); renderAll(); toast('Logged ✓');

  const st = stats();
  const todayDayNum = st.done;
  const milestones = [7, 14, 21, 30, 42, 50, 60, 70, 80, 84];
  if (milestones.includes(todayDayNum)) {
    setTimeout(() => {
      generateMilestoneCard(todayDayNum);
      openSheet('shareCardSheet');
    }, 1000);
  }
}
export function undoToday() {
  const tk = todayKey();
  if (S.logs[tk]) S.logs[tk].done = false;
  save(); renderAll(); toast('Unmarked');
}

let _dt;
export function debounce() {
  clearTimeout(_dt);
  _dt = setTimeout(() => {
    const tk = todayKey();
    if (!S.logs[tk]) S.logs[tk] = {done:false};
    Object.assign(S.logs[tk], readForm());
    save();
  }, 600);
}

/* ── AUTO-CALC ml ── */
export function autoCalc(weightEl, dkgEl, concSel, actualEl) {
  const w   = document.getElementById(weightEl).value || S.proto.weight;
  const dkg = document.getElementById(dkgEl).value;
  const cEl = document.querySelector(concSel+' .pill.sel') ||
               document.querySelector(concSel+' .sh-pill.sel');
  const c   = cEl ? cEl.dataset.v : S.proto.conc;
  const ml  = calcMl(w, dkg, c);
  if (ml) document.getElementById(actualEl).value = ml;
}

['iWeight','iDoseKg'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    autoCalc('iWeight','iDoseKg','#concPills','iActual');
    applyMethodToTodayForm();
    debounce();
  });
});
['iTemp','iActual','iNote'].forEach(id =>
  document.getElementById(id).addEventListener('input', debounce));

document.querySelectorAll('#concPills .pill').forEach(p => p.addEventListener('click', () => {
  document.querySelectorAll('#concPills .pill').forEach(x => x.classList.remove('sel'));
  p.classList.add('sel');
  autoCalc('iWeight','iDoseKg','#concPills','iActual');
  debounce();
}));
document.querySelectorAll('#capsulePillsToday .pill').forEach(p => p.addEventListener('click', () => {
  document.querySelectorAll('#capsulePillsToday .pill').forEach(x => x.classList.remove('sel'));
  p.classList.add('sel');
  debounce();
}));
