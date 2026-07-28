import { setActivePage, renderCalendar, renderLog } from './render/index.js';
import { shiftCalMonth } from './render/calendar.js';

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
document.getElementById('calPrev').addEventListener('click', () => shiftCalMonth(-1));
document.getElementById('calNext').addEventListener('click', () => shiftCalMonth(1));
