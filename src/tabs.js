import { setActivePage, renderCalendar, renderLog } from './render/index.js';
import { calView } from './render/calendar.js';

document.querySelectorAll('.tb').forEach(btn => {
  btn.addEventListener('click', () => {
    const activePage = btn.dataset.p;
    setActivePage(activePage);
    document.querySelectorAll('.tb').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-'+activePage).classList.add('active');
    if (activePage==='calendar') renderCalendar();
    if (activePage==='log')      renderLog();
  });
});

/* ── CAL NAV ── */
document.getElementById('calPrev').addEventListener('click', () => { calView.setMonth(calView.getMonth()-1); renderCalendar(); });
document.getElementById('calNext').addEventListener('click', () => { calView.setMonth(calView.getMonth()+1); renderCalendar(); });
