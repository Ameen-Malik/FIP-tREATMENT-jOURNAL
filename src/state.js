import { TOTAL } from './utils.js';
import { dkey, todayKey } from './utils.js';
import { syncToCloud } from './cloud-sync-legacy.js';
import { mirrorGet, mirrorSet } from './db.js';
import { enqueue } from './outbox.js';
import { getUserId } from './auth.js';
import { getCats, getLogs } from './supabase.js';
import { toast } from './ui/toast.js';

export const K_MULTI = { activeId: 'fip_active_cat_id', cats: 'fip_cats', logs: 'fip_logs' };

export let S_data = {
  activeCatId: '',
  cats: {},
  logs: {}
};

export let S = {
  get name() {
    const cat = S_data.cats[S_data.activeCatId];
    return cat ? cat.name : '';
  },
  set name(val) {
    const cat = S_data.cats[S_data.activeCatId];
    if (cat) cat.name = val;
  },
  get proto() {
    const cat = S_data.cats[S_data.activeCatId];
    return cat ? {
      type: cat.type || '',
      conc: parseInt(cat.conc) || 30,
      weight: cat.weight || '',
      method: cat.method || 'injection'
    } : { type: '', conc: 30, weight: '', method: 'injection' };
  },
  set proto(val) {
    const cat = S_data.cats[S_data.activeCatId];
    if (cat) {
      cat.type = val.type;
      cat.conc = parseInt(val.conc);
      cat.weight = val.weight;
      if (val.method) cat.method = val.method;
    }
  },
  get logs() {
    if (!S_data.activeCatId) return {};
    if (!S_data.logs[S_data.activeCatId]) S_data.logs[S_data.activeCatId] = {};
    return S_data.logs[S_data.activeCatId];
  },
  set logs(val) {
    if (S_data.activeCatId) {
      S_data.logs[S_data.activeCatId] = val;
    }
  }
};

/* ── UTILS (state-dependent) ── */
export function getActiveStart() {
  const cat = S_data.cats[S_data.activeCatId];
  if (cat && cat.startDate) {
    const [y, m, d] = cat.startDate.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  return new Date(2026, 5, 23, 0, 0, 0, 0);
}

export function dayNDate(n) {
  const d = new Date(getActiveStart());
  d.setDate(d.getDate() + (n - 1));
  return d;
}
export function treatDay(date) {
  const a = new Date(getActiveStart()); a.setHours(0,0,0,0);
  const b = new Date(date);  b.setHours(0,0,0,0);
  return Math.round((b - a) / 86400000) + 1;
}
export function curDay() { return Math.max(1, Math.min(TOTAL, treatDay(new Date()))); }
export function protoDoseKg() { return S.proto.type==='dry'?6:S.proto.type==='wet'?8:S.proto.type==='neuro'?10:''; }

/* ── PERSISTENCE ──
 * S_data is mirrored into IndexedDB (not localStorage — no practical size
 * ceiling, and it's where the outbox queue below also lives). save() diffs
 * the new S_data against a snapshot of what it last processed and enqueues
 * one outbox operation per cat/log entry that actually changed, so callers
 * (actions.js, batch-log.js, etc.) can keep calling plain save() exactly as
 * before with no changes on their end.
 *
 * That diff snapshot (lastSynced) is itself persisted in the mirror under
 * the 'lastSynced' key — it MUST survive page reloads. An in-memory-only
 * snapshot resets to empty on every load(), which made every single refresh
 * re-diff the whole history against nothing and re-enqueue everything all
 * over again (a real bug hit during Phase 4 testing — see changelog.md).
 */
const LAST_SYNCED_KEY = 'lastSynced';
let lastSynced = { cats: {}, logs: {} };

const MIRROR_OWNER_KEY = 'mirrorOwner';

export async function load() {
  const ownerId = getUserId();
  const storedOwner = await mirrorGet(MIRROR_OWNER_KEY);
  const isFirstEverLoad = storedOwner === undefined;

  if (storedOwner === ownerId) {
    // Same signed-in user as last time on this browser — local mirror is trustworthy.
    S_data.activeCatId = (await mirrorGet(K_MULTI.activeId)) || '';
    S_data.cats = (await mirrorGet(K_MULTI.cats)) || {};
    S_data.logs = (await mirrorGet(K_MULTI.logs)) || {};
  } else {
    // Different (or first-ever) signed-in user on this browser — local
    // leftovers (mirror AND diff baseline) could belong to whoever was
    // signed in before. Don't trust them; pull this user's real data from
    // Supabase instead, and treat it as already-synced (it came from there).
    S_data.activeCatId = '';
    S_data.cats = {};
    S_data.logs = {};
    try {
      const cats = await getCats();
      for (const cat of cats) {
        S_data.cats[cat.id] = cat;
        S_data.logs[cat.id] = await getLogs(cat.id);
      }
      S_data.activeCatId = cats[0]?.id || '';
      await mirrorSet(MIRROR_OWNER_KEY, ownerId);
      lastSynced = { cats: structuredClone(S_data.cats), logs: structuredClone(S_data.logs) };
      await mirrorSet(LAST_SYNCED_KEY, lastSynced);
    } catch (err) {
      // A Supabase failure here (auth rejected, offline, RLS misconfig) used
      // to throw straight out of boot() and silently skip every step after
      // load() — sync status, hold-to-log wiring, the first render. Degrade
      // instead: start from an empty local state and leave mirrorOwner unset
      // so the next successful load retries the real pull, rather than
      // permanently treating this empty state as "this user has no data".
      console.error('[load] could not pull from Supabase:', err);
      toast("Couldn't reach cloud sync — starting fresh locally");
    }
  }

  // One-time, invisible migration: nothing pulled from the cloud and this is
  // the first time this browser has ever run the new system — it may have
  // older localStorage data from before Phase 4. Distinct from the Phase 5
  // "import your journal to the cloud" flow — this just moves the storage
  // engine, no user decision involved. Gated on isFirstEverLoad so a second
  // account signing in on the same browser never inherits this leftover data
  // — and the source keys are cleared below right after use, since
  // isFirstEverLoad is only true for whichever account happens to load
  // first post-migration, not "the account that originally owned this data".
  // Leaving them in place would let a second account's first-ever load copy
  // the exact same ambient data again (confirmed: caused two Supabase cat
  // rows with duplicate content, one per account, from one shared leftover).
  let migratedFromLegacy = false;
  if (isFirstEverLoad && !S_data.activeCatId && Object.keys(S_data.cats).length === 0) {
    const oldActiveId = localStorage.getItem(K_MULTI.activeId);
    const oldCatsRaw = localStorage.getItem(K_MULTI.cats);
    const oldLogsRaw = localStorage.getItem(K_MULTI.logs);
    if (oldActiveId || oldCatsRaw) {
      S_data.activeCatId = oldActiveId || '';
      try { S_data.cats = JSON.parse(oldCatsRaw) || {}; } catch { S_data.cats = {}; }
      try { S_data.logs = JSON.parse(oldLogsRaw) || {}; } catch { S_data.logs = {}; }
      migratedFromLegacy = true;
    }
    localStorage.removeItem(K_MULTI.activeId);
    localStorage.removeItem(K_MULTI.cats);
    localStorage.removeItem(K_MULTI.logs);
  }

  // Backward-compatibility migration from the older single-cat schema.
  const oldName = isFirstEverLoad ? localStorage.getItem('fip_n') : null;
  const oldLogs = isFirstEverLoad ? localStorage.getItem('fip_l3') : null;
  const oldProto = isFirstEverLoad ? localStorage.getItem('fip_p2') : null;

  if (oldName || oldLogs || oldProto) {
    const catId = crypto.randomUUID();
    let name = oldName || 'My Cat';
    let proto = { type: '', conc: 30, weight: '' };
    let logs = {};

    try { if (oldProto) proto = { ...proto, ...JSON.parse(oldProto) }; } catch {}
    try { if (oldLogs) logs = JSON.parse(oldLogs) || {}; } catch {}

    S_data.cats[catId] = {
      id: catId,
      name: name,
      type: proto.type || '',
      conc: parseInt(proto.conc) || 30,
      weight: proto.weight || '',
      startDate: '2026-06-23'
    };
    S_data.logs[catId] = logs;
    S_data.activeCatId = catId;
    migratedFromLegacy = true;

    await save();

    localStorage.removeItem('fip_n');
    localStorage.removeItem('fip_l3');
    localStorage.removeItem('fip_p2');
  }

  if (migratedFromLegacy) toast('Imported your existing journal ✓');

  // One-time repair: cat IDs used to be generated as "cat_<timestamp>", which
  // isn't a valid Postgres uuid — the cats.id column requires one. Rekey any
  // such cat (and its logs, and activeCatId if it points there) to a real
  // UUID so it can actually sync, instead of failing forever.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  for (const oldId of Object.keys(S_data.cats)) {
    if (UUID_RE.test(oldId)) continue;
    const newId = crypto.randomUUID();
    S_data.cats[newId] = { ...S_data.cats[oldId], id: newId };
    delete S_data.cats[oldId];
    if (S_data.logs[oldId]) {
      S_data.logs[newId] = S_data.logs[oldId];
      delete S_data.logs[oldId];
    }
    if (S_data.activeCatId === oldId) S_data.activeCatId = newId;
  }

  // Load the persisted diff baseline. Absent entirely (true first run of the
  // outbox system) it defaults to empty, so the reconciliation save() below
  // enqueues any pre-existing local data exactly once — not on every load.
  lastSynced = (await mirrorGet(LAST_SYNCED_KEY)) || { cats: {}, logs: {} };

  await save();
}

export async function save() {
  await mirrorSet(K_MULTI.activeId, S_data.activeCatId);
  await mirrorSet(K_MULTI.cats, S_data.cats);
  await mirrorSet(K_MULTI.logs, S_data.logs);

  await diffAndEnqueue();

  syncToCloud();
}

async function diffAndEnqueue() {
  for (const catId in S_data.cats) {
    const cat = S_data.cats[catId];
    const prev = lastSynced.cats[catId];
    if (!prev || JSON.stringify(prev) !== JSON.stringify(cat)) {
      await enqueue('upsertCat', { ...cat, id: catId });
    }
  }
  for (const catId in lastSynced.cats) {
    if (!(catId in S_data.cats)) {
      await enqueue('deleteCat', { catId });
    }
  }

  for (const catId in S_data.logs) {
    const catLogs = S_data.logs[catId] || {};
    const prevCatLogs = lastSynced.logs[catId] || {};
    for (const dateKey in catLogs) {
      const entry = catLogs[dateKey];
      if (!prevCatLogs[dateKey] || JSON.stringify(prevCatLogs[dateKey]) !== JSON.stringify(entry)) {
        await enqueue('upsertLog', { catId, dateKey, entry });
      }
    }
    for (const dateKey in prevCatLogs) {
      if (!(dateKey in catLogs)) {
        await enqueue('deleteLog', { catId, dateKey });
      }
    }
  }
  for (const catId in lastSynced.logs) {
    if (!(catId in S_data.logs)) {
      for (const dateKey in lastSynced.logs[catId] || {}) {
        await enqueue('deleteLog', { catId, dateKey });
      }
    }
  }

  lastSynced = { cats: structuredClone(S_data.cats), logs: structuredClone(S_data.logs) };
  await mirrorSet(LAST_SYNCED_KEY, lastSynced);
}

/* ── STATS ── */
export function stats() {
  const day = curDay();
  let done=0, missed=0, streak=0;
  for (let i=1; i<=day; i++) {
    const k = dkey(dayNDate(i));
    if (S.logs[k]?.done) done++;
    else if (i < day) missed++;
  }
  // Don't zero the streak just because *today* hasn't been logged yet — a
  // streak built over prior days shouldn't read as broken before the day is
  // even over. Start counting from yesterday instead when today's still open.
  const todayDone = S.logs[dkey(dayNDate(day))]?.done;
  for (let i = todayDone ? day : day - 1; i >= 1; i--) {
    if (S.logs[dkey(dayNDate(i))]?.done) streak++; else break;
  }
  return {done, missed, streak, left: TOTAL-done};
}
