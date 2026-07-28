import { S, S_data, save } from './state.js';
import { todayKey, calcMl, capsuleBandForWeight, capsuleBandInfo } from './utils.js';
import { setShPills } from './ui/pills.js';
import { openSheet, closeSheet } from './ui/sheets.js';
import { renderToday } from './render/index.js';
import { toast } from './ui/toast.js';

function updateMethodUI() {
  const method = document.querySelector('#methodPills .sh-type-pill.sel')?.dataset.v || 'injection';
  const type = document.querySelector('#typePills .sh-type-pill.sel')?.dataset.v;
  const weight = document.getElementById('protoWeight').value;

  document.getElementById('injectionProtoFields').style.display = method === 'injection' ? '' : 'none';
  document.getElementById('injectionNote').style.display = method === 'injection' ? '' : 'none';
  document.getElementById('capsuleNeuroWarning').style.display = method === 'capsule' && type === 'neuro' ? '' : 'none';

  const readout = document.getElementById('capsuleBandReadout');
  if (method === 'capsule') {
    const band = capsuleBandInfo(capsuleBandForWeight(weight));
    readout.style.display = '';
    readout.innerHTML = band
      ? `Capsule band: <strong style="color:var(${band.var})">${band.color[0].toUpperCase()}${band.color.slice(1)} packet</strong> (${band.label})`
      : 'Enter weight to see the capsule packet color for this cat.';
  } else {
    readout.style.display = 'none';
  }
}

document.getElementById('protoRow').addEventListener('click', () => {
  document.querySelectorAll('#typePills .sh-type-pill').forEach(p =>
    p.classList.toggle('sel', p.dataset.v === S.proto.type));
  document.querySelectorAll('#methodPills .sh-type-pill').forEach(p =>
    p.classList.toggle('sel', p.dataset.v === S.proto.method));
  setShPills('#protoConc', S.proto.conc||30);
  document.getElementById('protoWeight').value = S.proto.weight||'';
  document.getElementById('methodSwitchNote').style.display = 'none';
  updateMethodUI();
  openSheet('protoSheet');
});
document.querySelectorAll('#typePills .sh-type-pill').forEach(p => p.addEventListener('click', () => {
  document.querySelectorAll('#typePills .sh-type-pill').forEach(x => x.classList.remove('sel'));
  p.classList.add('sel');
  updateMethodUI();
}));
document.querySelectorAll('#methodPills .sh-type-pill').forEach(p => p.addEventListener('click', () => {
  const changed = !p.classList.contains('sel');
  document.querySelectorAll('#methodPills .sh-type-pill').forEach(x => x.classList.remove('sel'));
  p.classList.add('sel');
  if (changed && p.dataset.v !== S.proto.method) {
    document.getElementById('methodSwitchNote').style.display = '';
  }
  updateMethodUI();
}));
document.getElementById('protoWeight').addEventListener('input', updateMethodUI);
document.querySelectorAll('#protoConc .sh-pill').forEach(p => p.addEventListener('click', () => {
  document.querySelectorAll('#protoConc .sh-pill').forEach(x => x.classList.remove('sel'));
  p.classList.add('sel');
}));
document.getElementById('saveProtoBtn').addEventListener('click', () => {
  const tEl = document.querySelector('#typePills .sh-type-pill.sel');
  const mEl = document.querySelector('#methodPills .sh-type-pill.sel');
  const cEl = document.querySelector('#protoConc .sh-pill.sel');
  const type = tEl ? tEl.dataset.v : 'dry';
  const method = mEl ? mEl.dataset.v : 'injection';
  const conc = cEl ? parseInt(cEl.dataset.v) : 30;
  const weight = document.getElementById('protoWeight').value.trim();

  // S.proto is a getter/setter pair — S.proto.type = x only mutates the
  // throwaway object the getter just returned and discards it. Assigning the
  // whole object is what actually invokes the setter and persists to the cat.
  S.proto = { type, conc, weight, method };

  // Propagate to today's active log in S_data if it isn't completed yet
  const tk = todayKey();
  if (S_data.activeCatId) {
    if (!S_data.logs[S_data.activeCatId]) S_data.logs[S_data.activeCatId] = {};
    const log = S_data.logs[S_data.activeCatId][tk] || { done: false };
    if (!log.done) {
      log.weight = weight;
      log.method = method;
      if (method === 'capsule') {
        log.capsuleBand = capsuleBandForWeight(weight);
        log.conc = ''; log.doseKg = ''; log.actual = '';
      } else {
        const doseKg = type === 'dry' ? 6 : type === 'wet' ? 8 : type === 'neuro' ? 10 : 6;
        log.conc = conc;
        log.doseKg = doseKg;
        log.actual = calcMl(weight, doseKg, conc);
        log.capsuleBand = '';
      }
      S_data.logs[S_data.activeCatId][tk] = log;
    }
  }

  save(); closeSheet('protoSheet'); renderToday(); toast('Protocol saved');
});
