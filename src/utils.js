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

// Oral capsule dosing is tiered by weight band, not computed like injection
// ml — parents identify which capsule to give by the packet color, not a mg
// number (per user: pink/green/blue, small to large), so that's the primary
// UI label; band ids are stable identifiers independent of the color choice.
export const CAPSULE_BANDS = [
  { id: 'lt2_5',     label: '< 2.5 kg',  color: 'pink',  var: '--pink'  },
  { id: '2_5_to_5',  label: '2.5–5 kg',  color: 'green', var: '--green' },
  { id: 'gt5',       label: '> 5 kg',    color: 'blue',  var: '--blue'  },
];
export function capsuleBandForWeight(kg) {
  const w = parseFloat(kg);
  if (!w) return null;
  if (w < 2.5) return 'lt2_5';
  if (w <= 5) return '2_5_to_5';
  return 'gt5';
}
export function capsuleBandInfo(bandId) {
  return CAPSULE_BANDS.find(b => b.id === bandId) || null;
}
