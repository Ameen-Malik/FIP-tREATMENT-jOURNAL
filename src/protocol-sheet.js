import { S, S_data, save } from './state.js';
import { todayKey, calcMl } from './utils.js';
import { setShPills } from './ui/pills.js';
import { openSheet, closeSheet } from './ui/sheets.js';
import { renderToday } from './render/index.js';
import { toast } from './ui/toast.js';

document.getElementById('protoRow').addEventListener('click', () => {
  document.querySelectorAll('#typePills .sh-type-pill').forEach(p =>
    p.classList.toggle('sel', p.dataset.v === S.proto.type));
  setShPills('#protoConc', S.proto.conc||30);
  document.getElementById('protoWeight').value = S.proto.weight||'';
  openSheet('protoSheet');
});
document.querySelectorAll('#typePills .sh-type-pill').forEach(p => p.addEventListener('click', () => {
  document.querySelectorAll('#typePills .sh-type-pill').forEach(x => x.classList.remove('sel'));
  p.classList.add('sel');
}));
document.querySelectorAll('#protoConc .sh-pill').forEach(p => p.addEventListener('click', () => {
  document.querySelectorAll('#protoConc .sh-pill').forEach(x => x.classList.remove('sel'));
  p.classList.add('sel');
}));
document.getElementById('saveProtoBtn').addEventListener('click', () => {
  const tEl = document.querySelector('#typePills .sh-type-pill.sel');
  const cEl = document.querySelector('#protoConc .sh-pill.sel');
  const type = tEl ? tEl.dataset.v : 'dry';
  const conc = cEl ? parseInt(cEl.dataset.v) : 30;
  const weight = document.getElementById('protoWeight').value.trim();

  S.proto.type   = type;
  S.proto.conc   = conc;
  S.proto.weight = weight;

  // Propagate to today's active log in S_data if it isn't completed yet
  const tk = todayKey();
  if (S_data.activeCatId) {
    if (!S_data.logs[S_data.activeCatId]) S_data.logs[S_data.activeCatId] = {};
    const log = S_data.logs[S_data.activeCatId][tk] || { done: false };
    if (!log.done) {
      const doseKg = type === 'dry' ? 6 : type === 'wet' ? 8 : type === 'neuro' ? 10 : 6;
      log.weight = weight;
      log.conc = conc;
      log.doseKg = doseKg;
      log.actual = calcMl(weight, doseKg, conc);
      S_data.logs[S_data.activeCatId][tk] = log;
    }
  }

  save(); closeSheet('protoSheet'); renderToday(); toast('Protocol saved');
});
