import { S, treatDay } from '../state.js';
import { pad, fmtShort, capsuleBandInfo } from '../utils.js';

export function renderLog() {
  const entries = Object.entries(S.logs)
    .filter(([,v]) => v.done)
    .sort((a,b) => b[0].localeCompare(a[0]));

  if (!entries.length) {
    document.getElementById('logList').innerHTML =
      `<div class="empty-state"><div class="empty-icon">💉</div><div class="empty-t">No entries logged</div><div class="empty-s">Mark today's dose on the Today tab.</div></div>`;
    return;
  }

  document.getElementById('logList').innerHTML = entries.map(([k, log]) => {
    const [y,mo,d] = k.split('-').map(Number);
    const date = new Date(y, mo-1, d);
    const td = treatDay(date);
    const t = new Date(log.ts);
    const isCapsule = log.method === 'capsule';
    const chips = [];
    if (!isCapsule && log.conc) chips.push(log.conc+' mg/ml');
    if (log.temp)   chips.push(log.temp+'°C');
    if (log.weight) chips.push(log.weight+' kg');
    const band = isCapsule ? capsuleBandInfo(log.capsuleBand) : null;
    const mainLine = isCapsule
      ? `💊 ${band ? band.color[0].toUpperCase()+band.color.slice(1)+' capsule' : 'Capsule'}`
      : `💉 ${log.doseKg||'—'} mg/kg${log.actual?' · '+log.actual+' ml':''}`;
    return `<div class="log-item" onclick="openEdit('${k}')">
      <div class="log-badge">${td}</div>
      <div class="log-body">
        <div class="log-date">${fmtShort(date)} · ${pad(t.getHours())}:${pad(t.getMinutes())}</div>
        <div class="log-main">${mainLine}</div>
        ${chips.length?`<div class="log-chips">${chips.map(c=>`<span class="log-chip">${c}</span>`).join('')}</div>`:''}
        ${log.note?`<div class="log-note">${log.note}</div>`:''}
      </div>
    </div>`;
  }).join('');
}
