import { S, S_data } from '../state.js';
import { dkey } from '../utils.js';
import { markToday, undoToday } from '../actions.js';

export function updateHoldButtonState(done) {
  const container = document.getElementById('holdContainer');
  const icon = document.getElementById('holdIcon');
  const text = document.getElementById('holdText');
  const fill = document.getElementById('holdFill');
  const thumb = document.getElementById('holdThumb');

  if (done) {
    container.classList.add('completed');
    fill.style.transition = 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    thumb.style.transition = 'left 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    fill.style.width = '100%';
    thumb.style.left = 'calc(100% - 53px)';
    icon.innerHTML = `
      <svg class="hold-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    `;
    text.textContent = 'Logged ✓ — Tap to Undo';
  } else {
    container.classList.remove('completed');
    fill.style.transition = 'width 0.3s ease-out';
    thumb.style.transition = 'left 0.3s ease-out';
    fill.style.width = '56px';
    thumb.style.left = '3px';
    icon.innerHTML = `
      <svg class="hold-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    `;
    text.textContent = 'Press & Hold to Log Injection';
  }
}

export function initHoldToConfirm() {
  const container = document.getElementById('holdContainer');
  const fill = document.getElementById('holdFill');
  const thumb = document.getElementById('holdThumb');

  let isHolding = false;
  let holdStart = 0;
  let holdDuration = 1200; // 1.2s
  let holdInterval = null;

  const startHold = (e) => {
    if (container.classList.contains('completed')) return;
    isHolding = true;
    holdStart = Date.now();

    fill.style.transition = 'none';
    thumb.style.transition = 'none';

    const trackWidth = container.clientWidth;
    const maxSlide = trackWidth - 56;

    holdInterval = setInterval(() => {
      const elapsed = Date.now() - holdStart;
      const pct = Math.min(100, (elapsed / holdDuration) * 100);

      const currentFillWidth = 56 + (pct / 100) * maxSlide;
      const currentThumbLeft = 3 + (pct / 100) * maxSlide;

      fill.style.width = currentFillWidth + 'px';
      thumb.style.left = currentThumbLeft + 'px';

      const scale = 1 - (elapsed / holdDuration) * 0.03;
      container.style.transform = `scale(${scale})`;

      if (elapsed >= holdDuration) {
        clearInterval(holdInterval);
        isHolding = false;
        container.style.transform = '';
        markToday();
      }
    }, 16);

    e.preventDefault();
  };

  const cancelHold = () => {
    if (!isHolding) return;
    isHolding = false;
    clearInterval(holdInterval);

    container.style.transform = '';

    fill.style.transition = 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
    thumb.style.transition = 'left 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
    fill.style.width = '56px';
    thumb.style.left = '3px';
  };

  container.addEventListener('mousedown', startHold);
  container.addEventListener('mouseleave', cancelHold);
  container.addEventListener('mouseup', cancelHold);

  container.addEventListener('touchstart', startHold, { passive: false });
  container.addEventListener('touchend', cancelHold);
  container.addEventListener('touchcancel', cancelHold);

  container.addEventListener('click', () => {
    if (container.classList.contains('completed')) {
      undoToday();
    }
  });
}

export function getNextInjectionTarget() {
  if (!S_data.activeCatId) return new Date();

  // 1. Check yesterday's log. Calendar-day subtraction (not -86400000ms) and
  // reapplying the wall-clock hour/minute (not +86400000ms) both matter here
  // — raw millisecond arithmetic drifts by an hour across a DST transition,
  // which for a medication reminder is a real miss, not just cosmetic.
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = dkey(yesterday);
  const yLog = S.logs[yKey];
  if (yLog && yLog.ts) {
    const yTime = new Date(yLog.ts);
    const target = new Date();
    target.setHours(yTime.getHours(), yTime.getMinutes(), 0, 0);
    return target;
  }

  // 2. Look for the earliest logged day to extract default hour/minute
  let earliestTs = null;
  for (let k in S.logs) {
    if (S.logs[k].done && S.logs[k].ts) {
      if (!earliestTs || S.logs[k].ts < earliestTs) {
        earliestTs = S.logs[k].ts;
      }
    }
  }

  const targetDate = new Date();
  if (earliestTs) {
    const earliestDate = new Date(earliestTs);
    targetDate.setHours(earliestDate.getHours(), earliestDate.getMinutes(), 0, 0);
  } else {
    // Fallback to active cat profile's typicalTime
    const cat = S_data.cats[S_data.activeCatId];
    if (cat && cat.typicalTime) {
      const [hh, mm] = cat.typicalTime.split(':').map(Number);
      targetDate.setHours(hh, mm, 0, 0);
    } else {
      targetDate.setHours(20, 0, 0, 0);
    }
  }
  return targetDate;
}
