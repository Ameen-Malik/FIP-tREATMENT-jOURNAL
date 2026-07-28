import { S, save, protoDoseKg } from './state.js';
import { capsuleBandForWeight } from './utils.js';
import { toast } from './ui/toast.js';
import { openSheet, closeSheet } from './ui/sheets.js';
import { renderAll, renderCalendar } from './render/index.js';

function setBatchMethodUI(method) {
  document.querySelectorAll('#bMethodPills .sh-type-pill').forEach(p =>
    p.classList.toggle('sel', p.dataset.v === method));
  document.getElementById('batchInjectionFields').style.display = method === 'capsule' ? 'none' : '';
  document.getElementById('batchCapsuleFields').style.display = method === 'capsule' ? '' : 'none';
}
document.querySelectorAll('#bMethodPills .sh-type-pill').forEach(p => p.addEventListener('click', () => setBatchMethodUI(p.dataset.v)));
document.querySelectorAll('#bCapsulePills .sh-pill').forEach(p => p.addEventListener('click', () => {
  document.querySelectorAll('#bCapsulePills .sh-pill').forEach(x => x.classList.remove('sel'));
  p.classList.add('sel');
}));

let batchMode = false;
let selectedBatchDays = new Set();

export function getBatchMode() { return batchMode; }
export function getSelectedBatchDays() { return selectedBatchDays; }

document.getElementById('calBatchBtn').addEventListener('click', () => {
  batchMode = !batchMode;
  if (!batchMode) {
    selectedBatchDays.clear();
    document.getElementById('batchLogBanner').style.display = 'none';
  } else {
    selectedBatchDays.clear();
    document.getElementById('batchCount').textContent = '0';
    document.getElementById('batchLogBanner').style.display = 'flex';
    toast("Select days on calendar to log 📅");
  }
  renderCalendar();
});

document.getElementById('batchConfirmBtn').addEventListener('click', () => {
  if (selectedBatchDays.size === 0) {
    toast("Please select at least one day first! 📅");
    return;
  }
  // Hide selection banner while inputs modal is active
  document.getElementById('batchLogBanner').style.display = 'none';

  // Pre-fill batch form with protocol defaults
  document.getElementById('bTemp').value = '';
  document.getElementById('bWeight').value = S.proto.weight || '';
  document.getElementById('bDoseKg').value = protoDoseKg() || '';
  document.getElementById('bActual').value = '';
  document.getElementById('bNote').value = 'Batch backfilled logs';
  setBatchMethodUI(S.proto.method || 'injection');
  const band = capsuleBandForWeight(S.proto.weight);
  document.querySelectorAll('#bCapsulePills .sh-pill').forEach(p =>
    p.classList.toggle('sel', p.dataset.v === band));

  openSheet('batchLogSheet');
});

document.getElementById('batchCancelBtn').addEventListener('click', () => {
  batchMode = false;
  selectedBatchDays.clear();
  document.getElementById('batchLogBanner').style.display = 'none';
  renderCalendar();
});

document.getElementById('batchSaveSubmitBtn').addEventListener('click', () => {
  const method = document.querySelector('#bMethodPills .sh-type-pill.sel')?.dataset.v || 'injection';
  const tempVal = document.getElementById('bTemp').value.trim();
  const weightVal = document.getElementById('bWeight').value.trim();
  const noteVal = document.getElementById('bNote').value.trim();
  const timeVal = document.getElementById('bTime').value || '20:00';
  const [hh, mm] = timeVal.split(':').map(Number);

  const doseKgVal = document.getElementById('bDoseKg').value.trim() || protoDoseKg() || '';
  const actualVal = document.getElementById('bActual').value.trim();
  const conc = S.proto.conc || 30;
  const bandEl = document.querySelector('#bCapsulePills .sh-pill.sel');
  const band = bandEl ? bandEl.dataset.v : capsuleBandForWeight(weightVal);

  selectedBatchDays.forEach(k => {
    const [y, mo, d] = k.split('-').map(Number);
    const logDate = new Date(y, mo - 1, d, hh, mm);

    S.logs[k] = {
      done: true,
      ts: logDate.getTime(),
      temp: tempVal,
      weight: weightVal,
      note: noteVal,
      method,
      ...(method === 'capsule'
        ? { capsuleBand: band, conc:'', doseKg:'', actual:'' }
        : { conc, doseKg: doseKgVal, actual: actualVal, capsuleBand:'' }),
    };
  });

  save();

  // Exit batch selection state
  batchMode = false;
  selectedBatchDays.clear();
  document.getElementById('batchLogBanner').style.display = 'none';

  closeSheet('batchLogSheet');
  renderAll();
  toast("Batch entries logged successfully!");
});
