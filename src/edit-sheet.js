import { S, save, treatDay, protoDoseKg } from './state.js';
import { calcMl, fmtFull } from './utils.js';
import { setShPills } from './ui/pills.js';
import { openSheet, closeSheet } from './ui/sheets.js';
import { getNextInjectionTarget } from './ui/hold-to-confirm.js';
import { renderAll } from './render/index.js';
import { toast } from './ui/toast.js';

let editKey = null;

export function openEdit(k) {
  editKey = k;
  const [y,mo,d] = k.split('-').map(Number);
  const date = new Date(y, mo-1, d);
  const td = treatDay(date);
  const log = S.logs[k]||{};

  document.getElementById('editTitle').textContent = `Day ${td}`;
  document.getElementById('editSub').textContent = fmtFull(date);
  document.getElementById('eTemp').value   = log.temp||'';
  document.getElementById('eWeight').value = log.weight||'';
  document.getElementById('eDoseKg').value = log.doseKg||protoDoseKg()||'';
  document.getElementById('eActual').value = log.actual||'';
  document.getElementById('eNote').value   = log.note||'';

  if (log.ts) {
    const lDate = new Date(log.ts);
    const thrs = lDate.getHours().toString().padStart(2, '0');
    const tmins = lDate.getMinutes().toString().padStart(2, '0');
    document.getElementById('eTime').value = `${thrs}:${tmins}`;
  } else {
    const nextTarget = getNextInjectionTarget();
    const thrs = nextTarget.getHours().toString().padStart(2, '0');
    const tmins = nextTarget.getMinutes().toString().padStart(2, '0');
    document.getElementById('eTime').value = `${thrs}:${tmins}`;
  }

  setShPills('#editConc', log.conc||S.proto.conc||30);
  document.getElementById('editDelBtn').style.display = log.done ? '' : 'none';

  // Close day card
  document.getElementById('dayCard').classList.remove('open');
  openSheet('editSheet');
}
window.openEdit = openEdit;

['eWeight','eDoseKg'].forEach(id =>
  document.getElementById(id).addEventListener('input', () => {
    const cEl = document.querySelector('#editConc .sh-pill.sel');
    const c = cEl ? cEl.dataset.v : S.proto.conc;
    const ml = calcMl(
      document.getElementById('eWeight').value,
      document.getElementById('eDoseKg').value, c);
    if (ml) document.getElementById('eActual').value = ml;
  }));

document.querySelectorAll('#editConc .sh-pill').forEach(p => p.addEventListener('click', () => {
  document.querySelectorAll('#editConc .sh-pill').forEach(x => x.classList.remove('sel'));
  p.classList.add('sel');
  const ml = calcMl(document.getElementById('eWeight').value,
    document.getElementById('eDoseKg').value, p.dataset.v);
  if (ml) document.getElementById('eActual').value = ml;
}));

document.getElementById('editSaveBtn').addEventListener('click', () => {
  if (!editKey) return;
  const cEl = document.querySelector('#editConc .sh-pill.sel');

  const timeVal = document.getElementById('eTime').value || '20:00';
  const [hh, mm] = timeVal.split(':').map(Number);
  const [y, mo, d] = editKey.split('-').map(Number);
  const logDateObj = new Date(y, mo - 1, d, hh, mm, 0, 0);

  S.logs[editKey] = {
    ...(S.logs[editKey]||{}),
    done:   true,
    ts:     logDateObj.getTime(),
    temp:   document.getElementById('eTemp').value.trim(),
    weight: document.getElementById('eWeight').value.trim(),
    conc:   cEl ? cEl.dataset.v : S.proto.conc,
    doseKg: document.getElementById('eDoseKg').value.trim(),
    actual: document.getElementById('eActual').value.trim(),
    note:   document.getElementById('eNote').value.trim(),
  };
  save(); closeSheet('editSheet'); renderAll(); toast('Saved');
});
document.getElementById('editDelBtn').addEventListener('click', () => {
  if (editKey && S.logs[editKey]) S.logs[editKey].done = false;
  save(); closeSheet('editSheet'); renderAll(); toast('Entry removed');
});
document.getElementById('editCancelBtn').addEventListener('click', () => closeSheet('editSheet'));
