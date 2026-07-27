import { S, save, stats } from './state.js';
import { todayKey, calcMl } from './utils.js';
import { toast } from './ui/toast.js';
import { openSheet } from './ui/sheets.js';
import { renderAll } from './render/index.js';
import { generateMilestoneCard } from './milestone-card.js';

export function readForm() {
  const cSel = document.querySelector('#concPills .pill.sel');
  return {
    temp:   document.getElementById('iTemp').value.trim(),
    weight: document.getElementById('iWeight').value.trim(),
    conc:   cSel ? cSel.dataset.v : S.proto.conc,
    doseKg: document.getElementById('iDoseKg').value.trim(),
    actual: document.getElementById('iActual').value.trim(),
    note:   document.getElementById('iNote').value.trim(),
  };
}

export function markToday() {
  const tk = todayKey();
  const timeVal = document.getElementById('iTime').value || '20:00';
  const [hh, mm] = timeVal.split(':').map(Number);
  const logDate = new Date();
  logDate.setHours(hh, mm, 0, 0);

  S.logs[tk] = { ...readForm(), done:true, ts:logDate.getTime() };
  save(); renderAll(); toast('Injection logged ✓');

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
