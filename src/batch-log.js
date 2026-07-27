import { S, save, protoDoseKg } from './state.js';
import { toast } from './ui/toast.js';
import { openSheet, closeSheet } from './ui/sheets.js';
import { renderAll, renderCalendar } from './render/index.js';

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

  openSheet('batchLogSheet');
});

document.getElementById('batchCancelBtn').addEventListener('click', () => {
  batchMode = false;
  selectedBatchDays.clear();
  document.getElementById('batchLogBanner').style.display = 'none';
  renderCalendar();
});

document.getElementById('batchSaveSubmitBtn').addEventListener('click', () => {
  const tempVal = document.getElementById('bTemp').value.trim();
  const weightVal = document.getElementById('bWeight').value.trim();
  const doseKgVal = document.getElementById('bDoseKg').value.trim() || protoDoseKg() || '';
  const actualVal = document.getElementById('bActual').value.trim();
  const noteVal = document.getElementById('bNote').value.trim();
  const timeVal = document.getElementById('bTime').value || '20:00';
  const [hh, mm] = timeVal.split(':').map(Number);

  const conc = S.proto.conc || 30;

  selectedBatchDays.forEach(k => {
    const [y, mo, d] = k.split('-').map(Number);
    const logDate = new Date(y, mo - 1, d, hh, mm);

    S.logs[k] = {
      done: true,
      ts: logDate.getTime(),
      doseKg: doseKgVal,
      actual: actualVal,
      conc: conc,
      temp: tempVal,
      weight: weightVal,
      note: noteVal
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
