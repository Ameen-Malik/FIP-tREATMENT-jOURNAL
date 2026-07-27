import { renderToday } from './today.js';
import { renderCalendar } from './calendar.js';
import { renderLog } from './log.js';

export let activePage = 'today';
export function setActivePage(p) { activePage = p; }

export function renderAll() {
  renderToday();
  if (activePage==='calendar') renderCalendar();
  if (activePage==='log')      renderLog();
}

export { renderToday, renderCalendar, renderLog };
