import { S, dayNDate } from './state.js';
import { TOTAL, dkey } from './utils.js';
import { toast } from './ui/toast.js';

export function buildRows() {
  const rows = [['Day','Date','Done','Temp (°C)','Weight (kg)','Vial (mg/ml)','Dose (mg/kg)','Actual (ml)','Notes']];
  for (let i=1; i<=TOTAL; i++) {
    const date = dayNDate(i), k = dkey(date), l = S.logs[k]||{};
    rows.push([i, k, l.done?'Yes':'No', l.temp||'', l.weight||'', l.conc||'', l.doseKg||'', l.actual||'', l.note||'']);
  }
  return rows;
}
document.getElementById('exportCSV').addEventListener('click', () => {
  const csv = buildRows().map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  dl(new Blob([csv],{type:'text/csv'}), `fip-${S.name||'journal'}.csv`);
  toast('CSV downloaded');
});
document.getElementById('exportXLS').addEventListener('click', () => {
  const rows = buildRows();
  const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="FIP Journal"><Table>${
    rows.map(r=>`<Row>${r.map(v=>`<Cell><Data ss:Type="String">${String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</Data></Cell>`).join('')}</Row>`).join('')
  }</Table></Worksheet></Workbook>`;
  dl(new Blob([xml],{type:'application/vnd.ms-excel'}), `fip-${S.name||'journal'}.xls`);
  toast('Excel downloaded');
});
function dl(blob, name) {
  const a = Object.assign(document.createElement('a'), {href:URL.createObjectURL(blob), download:name});
  a.click(); URL.revokeObjectURL(a.href);
}
