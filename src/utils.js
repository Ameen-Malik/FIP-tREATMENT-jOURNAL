export const TOTAL = 84;
export const MO = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const MOsh = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export const pad = n => String(n).padStart(2,'0');
export const dkey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export const todayKey = () => dkey(new Date());

export function fmtFull(d) { return `${DOW[d.getDay()]}, ${d.getDate()} ${MOsh[d.getMonth()]} ${d.getFullYear()}`; }
export function fmtShort(d) { return `${d.getDate()} ${MOsh[d.getMonth()]} ${d.getFullYear()}`; }

export function calcMl(w,dkg,c) {
  const cf = parseFloat(c);
  const v = parseFloat(w)*parseFloat(dkg)/cf;
  // isNaN() alone doesn't catch a zero/blank concentration — division by 0
  // gives Infinity, not NaN, which would otherwise flow into a log entry as
  // the literal string "Infinity".
  return !cf || isNaN(v) || !isFinite(v) ? null : v.toFixed(2);
}
