import { S_data, save } from './state.js';
import { MO, dkey, todayKey, fmtFull, calcMl, capsuleBandForWeight } from './utils.js';
import { toast } from './ui/toast.js';
import { openSheet, closeSheet } from './ui/sheets.js';
import { renderAll } from './render/index.js';

document.getElementById('catBtn').addEventListener('click', () => {
  renderSwitcherCatList();
  openSheet('catSwitcherSheet');
});

let editingCatId = null;

export function editCatProfile(catId) {
  editingCatId = catId;
  const cat = S_data.cats[catId];
  if (!cat) return;

  closeSheet('catSwitcherSheet');

  // Pre-fill form fields
  document.getElementById('obName').value = cat.name;
  document.getElementById('obWeight').value = cat.weight || '';
  document.getElementById('obTime').value = cat.typicalTime || '20:00';

  document.querySelectorAll('#obConcPills .sh-pill').forEach(x => {
    x.classList.toggle('sel', x.dataset.v === String(cat.conc || 30));
  });

  document.querySelectorAll('#obTypePills .sh-type-pill').forEach(x => {
    x.classList.toggle('sel', x.dataset.v === cat.type);
  });

  // Show Start Date selector and hide stage option
  document.getElementById('obStageSect').style.display = 'none';
  document.getElementById('obStageGroup').style.display = 'none';
  document.getElementById('obDateSect').style.display = 'block';
  document.getElementById('obDateGroup').style.display = 'flex';
  document.getElementById('obStartDate').value = cat.startDate || '';

  const [sy, smo, sd] = (cat.startDate || '').split('-').map(Number);
  if (sy && smo && sd) {
    document.getElementById('obStartDateText').textContent = fmtFull(new Date(sy, smo-1, sd));
  } else {
    document.getElementById('obStartDateText').textContent = 'Select Date';
  }

  document.getElementById('onboardTitle').textContent = "Edit Cat Profile 🐾";
  document.getElementById('onboardSub').textContent = "Modify recovery details for " + cat.name;
  document.getElementById('obSaveBtn').textContent = "Save Changes";
  document.getElementById('obCancelBtn').style.display = 'block';

  openSheet('onboardingSheet');
}
window.editCatProfile = editCatProfile;

// Reusable Custom Confirm controller
let currentConfirmCallback = null;
function showConfirm(title, msg, onYes) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMessage').textContent = msg;
  currentConfirmCallback = onYes;
  openSheet('confirmSheet');
}
document.getElementById('confirmYesBtn').addEventListener('click', () => {
  if (currentConfirmCallback) currentConfirmCallback();
  closeSheet('confirmSheet');
});
document.getElementById('confirmNoBtn').addEventListener('click', () => {
  closeSheet('confirmSheet');
});

// Delete helper
export function deleteCatProfile(catId) {
  if (Object.keys(S_data.cats).length <= 1) {
    toast("You must keep at least one cat profile!");
    return;
  }
  showConfirm(
    "Delete Profile 🐾",
    `Are you sure you want to delete ${S_data.cats[catId].name}'s entire profile and logs? This cannot be undone.`,
    () => {
      delete S_data.cats[catId];
      if (S_data.logs[catId]) delete S_data.logs[catId];
      if (S_data.activeCatId === catId) {
        S_data.activeCatId = Object.keys(S_data.cats)[0];
      }
      save();
      renderSwitcherCatList();
      renderAll();
      toast("Profile deleted 🐾");
    }
  );
}
window.deleteCatProfile = deleteCatProfile;

// Render cat list in switcher
function renderSwitcherCatList() {
  const container = document.getElementById('switcherCatList');
  container.innerHTML = '';

  Object.values(S_data.cats).forEach(cat => {
    const isCurrent = cat.id === S_data.activeCatId;
    const item = document.createElement('div');
    item.className = 'ir';
    item.style.padding = '12px 16px';
    item.style.borderRadius = 'var(--rs)';
    item.style.border = isCurrent ? '1.5px solid var(--blue)' : '1px solid var(--l4)';
    item.style.background = isCurrent ? 'rgba(0, 122, 255, 0.05)' : 'var(--s1)';
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.justifyContent = 'space-between';
    item.style.cursor = 'pointer';
    item.style.margin = '4px 0';

    item.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:20px">🐱</span>
        <div style="display:flex;flex-direction:column">
          <span style="font-weight:700;color:var(--l1);font-size:14px">${cat.name}</span>
          <span style="font-size:11px;color:var(--l2)">FIP Start: ${cat.startDate}</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        ${isCurrent ? '<span style="color:var(--blue);font-size:12px;font-weight:700;margin-right:4px;">Active</span>' : ''}
        <button class="sh-btn" style="padding:4px 8px;font-size:11px;border-radius:6px;height:auto;border:1px solid var(--l4);background:var(--s2);color:var(--blue);cursor:pointer;" onclick="event.stopPropagation(); editCatProfile('${cat.id}')">Edit</button>
        <button class="sh-btn" style="padding:4px 8px;font-size:11px;border-radius:6px;height:auto;border:1px solid var(--l4);background:var(--s2);color:var(--red);cursor:pointer;" onclick="event.stopPropagation(); deleteCatProfile('${cat.id}')">Delete</button>
      </div>
    `;

    item.addEventListener('click', () => {
      S_data.activeCatId = cat.id;
      save();
      closeSheet('catSwitcherSheet');
      renderAll();
      toast(`Switched to ${cat.name} 🐱`);
    });
    container.appendChild(item);
  });
}

// Add new cat from switcher
document.getElementById('switcherAddBtn').addEventListener('click', () => {
  editingCatId = null;
  closeSheet('catSwitcherSheet');

  // Reset onboarding form inputs
  document.getElementById('obName').value = '';
  document.getElementById('obWeight').value = '';
  document.getElementById('obTime').value = '20:00';

  document.querySelectorAll('#obConcPills .sh-pill').forEach(x => {
    x.classList.toggle('sel', x.dataset.v === '30');
  });

  document.querySelectorAll('#obTypePills .sh-type-pill').forEach(x => {
    x.classList.toggle('sel', x.dataset.v === 'dry');
  });

  // Show Stage buttons and hide start date
  document.getElementById('obStageSect').style.display = 'block';
  document.getElementById('obStageGroup').style.display = 'flex';
  document.getElementById('obDateSect').style.display = 'none';
  document.getElementById('obDateGroup').style.display = 'none';
  document.querySelector('input[name="obStage"][value="today"]').click();

  const localDate = new Date();
  const y = localDate.getFullYear();
  const m = String(localDate.getMonth() + 1).padStart(2, '0');
  const d = String(localDate.getDate()).padStart(2, '0');
  const todayISO = `${y}-${m}-${d}`;
  document.getElementById('obStartDate').value = todayISO;
  document.getElementById('obStartDateText').textContent = fmtFull(localDate);

  // Show cancel button if we already have an active profile
  document.getElementById('obCancelBtn').style.display = S_data.activeCatId ? 'block' : 'none';
  document.getElementById('onboardTitle').textContent = "Add New Cat 🐾";
  document.getElementById('onboardSub').textContent = "Enter details to create another recovery profile.";
  document.getElementById('obSaveBtn').textContent = "Create Recovery Profile";

  openSheet('onboardingSheet');
});

// Onboarding stage toggle (radio listener)
document.querySelectorAll('input[name="obStage"]').forEach(el => {
  el.addEventListener('change', () => {
    const isPast = el.value === 'past';
    document.getElementById('obDateSect').style.display = isPast ? 'block' : 'none';
    document.getElementById('obDateGroup').style.display = isPast ? 'flex' : 'none';
  });
});

// FIP Type pills inside onboarding
document.querySelectorAll('#obTypePills .sh-type-pill').forEach(p => p.addEventListener('click', () => {
  document.querySelectorAll('#obTypePills .sh-type-pill').forEach(x => x.classList.remove('sel'));
  p.classList.add('sel');
}));

// Onboarding Concentration pills
document.querySelectorAll('#obConcPills .sh-pill').forEach(p => p.addEventListener('click', () => {
  document.querySelectorAll('#obConcPills .sh-pill').forEach(x => x.classList.remove('sel'));
  p.classList.add('sel');
}));

// Inline Calendar Picker for Onboarding Start Date
let obCalView = new Date();
function renderObCalendar() {
  const y = obCalView.getFullYear(), m = obCalView.getMonth();
  document.getElementById('obCalMonth').textContent = `${MO[m]} ${y}`;

  const firstDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m+1, 0).getDate();

  let html = '';
  for (let i=0; i<firstDow; i++) html += `<div style="height:28px;"></div>`;

  const currentSelStr = document.getElementById('obStartDate').value;

  for (let d=1; d<=daysInMonth; d++) {
    const dateObj = new Date(y, m, d);
    const k = dkey(dateObj);
    const isSel = k === currentSelStr;

    const btnStyle = isSel
      ? `background:var(--blue); color:#ffffff; font-weight:700; border-radius:50%;`
      : `color:var(--l1);`;

    html += `<button type="button" class="ob-cal-day" data-k="${k}" style="height:28px; width:28px; border:none; background:none; font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; margin:auto; ${btnStyle}">${d}</button>`;
  }

  document.getElementById('obCalDays').innerHTML = html;

  document.querySelectorAll('.ob-cal-day').forEach(el => {
    el.addEventListener('click', () => {
      const k = el.dataset.k;
      document.getElementById('obStartDate').value = k;

      const [yVal, moVal, dVal] = k.split('-').map(Number);
      document.getElementById('obStartDateText').textContent = fmtFull(new Date(yVal, moVal-1, dVal));

      document.getElementById('obCalendarWrapper').style.display = 'none';
      renderObCalendar();
    });
  });
}

document.getElementById('obStartDateRow').addEventListener('click', () => {
  const wrapper = document.getElementById('obCalendarWrapper');
  const isHidden = wrapper.style.display === 'none';
  wrapper.style.display = isHidden ? 'block' : 'none';
  if (isHidden) {
    const curVal = document.getElementById('obStartDate').value;
    if (curVal) {
      const [y, mo, d] = curVal.split('-').map(Number);
      obCalView = new Date(y, mo-1, 1);
    }
    renderObCalendar();
  }
});

document.getElementById('obCalPrev').addEventListener('click', (e) => {
  e.stopPropagation();
  obCalView.setMonth(obCalView.getMonth() - 1);
  renderObCalendar();
});

document.getElementById('obCalNext').addEventListener('click', (e) => {
  e.stopPropagation();
  obCalView.setMonth(obCalView.getMonth() + 1);
  renderObCalendar();
});

// Save onboarding / Add cat profile
document.getElementById('obSaveBtn').addEventListener('click', () => {
  const name = document.getElementById('obName').value.trim();
  const typePill = document.querySelector('#obTypePills .sh-type-pill.sel');
  const type = typePill ? typePill.dataset.v : 'dry';
  const concPill = document.querySelector('#obConcPills .sh-pill.sel');
  const conc = concPill ? parseInt(concPill.dataset.v) : 30;
  const weight = parseFloat(document.getElementById('obWeight').value) || 1.0;
  const typicalTimeVal = document.getElementById('obTime').value || '20:00';

  if (!name) {
    toast("Please enter your cat's name! 🐾");
    return;
  }

  const localDateObj = new Date();
  const ly = localDateObj.getFullYear();
  const lm = String(localDateObj.getMonth() + 1).padStart(2, '0');
  const ld = String(localDateObj.getDate()).padStart(2, '0');
  let startDateVal = `${ly}-${lm}-${ld}`;
  if (editingCatId) {
    // In edit mode, start date is directly visible
    startDateVal = document.getElementById('obStartDate').value;
    const cat = S_data.cats[editingCatId];
    if (cat) {
      cat.name = name;
      cat.type = type;
      cat.conc = conc;
      cat.weight = weight;
      cat.startDate = startDateVal;
      cat.typicalTime = typicalTimeVal;

      // Propagate changes to today's log if not completed (only touches
      // weight/dose fields for the cat's current method — this form has no
      // method selector of its own, that lives in the Protocol sheet).
      if (editingCatId === S_data.activeCatId) {
        const tk = todayKey();
        if (!S_data.logs[editingCatId]) S_data.logs[editingCatId] = {};
        const log = S_data.logs[editingCatId][tk] || { done: false };
        if (!log.done) {
          log.weight = weight;
          if (cat.method === 'capsule') {
            log.method = 'capsule';
            log.capsuleBand = capsuleBandForWeight(weight);
          } else {
            const doseKg = type === 'dry' ? 6 : type === 'wet' ? 8 : type === 'neuro' ? 10 : 6;
            log.conc = conc;
            log.doseKg = doseKg;
            log.actual = calcMl(weight, doseKg, conc);
          }
          S_data.logs[editingCatId][tk] = log;
        }
      }

      save();
      editingCatId = null;
      closeSheet('onboardingSheet');
      renderAll();
      toast(`Saved changes for ${name} 🐱`);
    }
    return;
  }

  const isPast = document.querySelector('input[name="obStage"]:checked').value === 'past';
  if (isPast) {
    startDateVal = document.getElementById('obStartDate').value;
  }

  const catId = crypto.randomUUID();

  // Build logs with auto-backfill if needed
  const startDateObj = new Date(startDateVal);
  startDateObj.setHours(0,0,0,0);
  const todayDateObj = new Date();
  todayDateObj.setHours(0,0,0,0);

  const diffTime = todayDateObj - startDateObj;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const catLogs = {};
  const dose = type === 'dry' ? 6 : type === 'wet' ? 8 : 10;

  if (diffDays > 0) {
    // User is mid-treatment: auto-populate logs *before* today with defaults
    const [tH, tM] = typicalTimeVal.split(':').map(Number);
    for (let i = 0; i < diffDays; i++) {
      const d = new Date(startDateObj);
      d.setDate(d.getDate() + i);
      d.setHours(tH, tM, 0, 0);
      const k = dkey(d);
      catLogs[k] = {
        done: true,
        ts: d.getTime(),
        doseKg: dose,
        actual: '',
        conc: conc,
        temp: '',
        weight: weight,
        note: 'Auto-backfilled during setup',
        method: 'injection'
      };
    }
  } else {
    // Starting fresh today: do not pre-complete any logs so the user can log Day 1 themselves!
  }

  S_data.cats[catId] = {
    id: catId,
    name: name,
    type: type,
    conc: conc,
    weight: weight,
    startDate: startDateVal,
    typicalTime: typicalTimeVal,
    method: 'injection'
  };
  S_data.logs[catId] = catLogs;
  S_data.activeCatId = catId;

  save();
  closeSheet('onboardingSheet');
  renderAll();
  toast(`Welcome, ${name}! Recovery profile created.`);
});

// Onboarding Cancel button
document.getElementById('obCancelBtn').addEventListener('click', () => {
  editingCatId = null;
  closeSheet('onboardingSheet');
});

export function checkOnboarding() {
  if (!S_data.activeCatId || Object.keys(S_data.cats).length === 0) {
    document.getElementById('obCancelBtn').style.display = 'none';
    document.getElementById('onboardTitle').textContent = "Welcome to FIP Journal 🐾";
    document.getElementById('onboardSub').textContent = "Let's set up your cat's recovery profile.";
    setTimeout(() => {
      document.querySelector('#obTypePills [data-v="dry"]').click();
      openSheet('onboardingSheet');
    }, 1500);
  }
}
