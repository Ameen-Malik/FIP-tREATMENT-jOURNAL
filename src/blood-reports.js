import { S_data, dayNDate, treatDay } from './state.js';
import { dkey, fmtShort } from './utils.js';
import { getBloodReports, uploadBloodReport, deleteBloodReport, bloodReportObjectUrl } from './supabase.js';
import { openSheet } from './ui/sheets.js';
import { toast } from './ui/toast.js';

const MILESTONES = [
  { day: 1, label: 'Day 1', sub: 'Baseline (optional)' },
  { day: 30, label: 'Day 30', sub: 'First checkpoint' },
  { day: 60, label: 'Day 60', sub: 'Second checkpoint' },
  { day: 84, label: 'Day 84', sub: 'Final report' },
];

let pendingUploadDateKey = null;

async function renderSlots() {
  const container = document.getElementById('bloodReportSlots');
  if (!S_data.activeCatId) { container.innerHTML = ''; return; }
  container.innerHTML = '<div class="sh-note">Loading…</div>';

  let reports;
  try {
    reports = await getBloodReports(S_data.activeCatId);
  } catch {
    container.innerHTML = '<div class="sh-note">Could not load reports — try again.</div>';
    return;
  }

  const byDate = {};
  for (const r of reports) (byDate[r.date_key] ||= []).push(r);

  const slotsHtml = await Promise.all(MILESTONES.map(async m => {
    const dateKey = dkey(dayNDate(m.day));
    const items = byDate[dateKey] || [];
    const thumbs = await Promise.all(items.map(async r => {
      let url = '#';
      try { url = await bloodReportObjectUrl(r.storage_path); } catch {}
      return `<div class="br-thumb-wrap">
        <a href="${url}" target="_blank" rel="noopener"><img class="br-thumb" src="${url}"/></a>
        <button class="br-thumb-del" data-id="${r.id}" data-path="${r.storage_path}">✕</button>
      </div>`;
    }));
    return `<div class="br-slot">
      <div class="br-slot-head">
        <div>
          <div class="br-slot-label">${m.label}</div>
          <div class="br-slot-sub">${m.sub} · ${fmtShort(dayNDate(m.day))}</div>
        </div>
        <button class="br-add-btn" data-date="${dateKey}">+ Add</button>
      </div>
      ${thumbs.length ? `<div class="br-thumbs">${thumbs.join('')}</div>` : ''}
    </div>`;
  }));

  container.innerHTML = slotsHtml.join('');

  container.querySelectorAll('.br-add-btn').forEach(btn => btn.addEventListener('click', () => {
    pendingUploadDateKey = btn.dataset.date;
    document.getElementById('bloodReportFileInput').click();
  }));
  container.querySelectorAll('.br-thumb-del').forEach(btn => btn.addEventListener('click', async () => {
    try {
      await deleteBloodReport({ id: btn.dataset.id, storage_path: btn.dataset.path });
      toast('Report removed');
      renderSlots();
    } catch {
      toast('Could not remove — try again');
    }
  }));
}

document.getElementById('bloodReportsRow').addEventListener('click', () => {
  if (!S_data.activeCatId) return;
  openSheet('bloodReportsSheet');
  renderSlots();
});

document.getElementById('bloodReportFileInput').addEventListener('change', async e => {
  const files = [...e.target.files];
  e.target.value = '';
  if (!files.length || !pendingUploadDateKey) return;
  toast('Uploading…');
  try {
    for (const file of files) {
      await uploadBloodReport(S_data.activeCatId, pendingUploadDateKey, file);
    }
    toast('Blood report added ✓');
    renderSlots();
  } catch {
    toast('Upload failed — try again');
  }
});

/** Shows/hides the Today-page milestone banner for day 1/30/60/84. */
export async function checkBloodReportMilestone() {
  const banner = document.getElementById('bloodReportBanner');
  if (!banner) return;
  if (!S_data.activeCatId) { banner.style.display = 'none'; return; }

  const today = treatDay(new Date());
  const milestone = MILESTONES.find(m => m.day === today);
  if (!milestone) { banner.style.display = 'none'; return; }

  const dateKey = dkey(dayNDate(milestone.day));
  let reports;
  try { reports = await getBloodReports(S_data.activeCatId); } catch { banner.style.display = 'none'; return; }
  if (reports.some(r => r.date_key === dateKey)) { banner.style.display = 'none'; return; }

  document.getElementById('bloodReportBannerText').textContent = `${milestone.label} milestone — add today's blood report?`;
  banner.style.display = 'flex';
  banner.onclick = () => { openSheet('bloodReportsSheet'); renderSlots(); };
}
