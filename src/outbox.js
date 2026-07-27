import { outboxAdd, outboxGetAll, outboxRemove } from './db.js';
import { upsertCat, deleteCat, upsertLog, deleteLog } from './supabase.js';

const HANDLERS = {
  upsertCat: op => upsertCat(op.payload),
  deleteCat: op => deleteCat(op.payload.catId),
  upsertLog: op => upsertLog(op.payload.catId, op.payload.dateKey, op.payload.entry),
  deleteLog: op => deleteLog(op.payload.catId, op.payload.dateKey),
};

let pendingCount = 0;
let draining = false;
const listeners = new Set();

function status() {
  if (!navigator.onLine) return 'offline';
  return pendingCount > 0 ? 'pending' : 'synced';
}
function notify() {
  const s = { status: status(), pendingCount };
  listeners.forEach(fn => fn(s));
}

/** Subscribe to sync status changes. Returns an unsubscribe function. Fires once immediately. */
export function onStatusChange(fn) {
  listeners.add(fn);
  fn({ status: status(), pendingCount });
  return () => listeners.delete(fn);
}

/** Append an operation to the durable write-ahead queue. Call this before/instead of any direct network write. */
export async function enqueue(type, payload) {
  await outboxAdd({ type, payload });
  pendingCount++;
  notify();
  if (navigator.onLine) drain();
}

/**
 * Drains the outbox in insertion order. A failed entry is left queued and
 * skipped for the REST of this pass — not retried in a tight loop — but
 * later entries still get their turn. This matters because a failure can be
 * purely an ordering issue (e.g. a log row queued before its cat row, so its
 * FK constraint fails until the cat sync catches up later in this same
 * pass, or on the next one ~30s later via the periodic trigger) rather than
 * a permanent one; stopping the whole drain on the first failure would wedge
 * every later entry behind it indefinitely, which is worse than a bounded retry.
 */
export async function drain() {
  if (draining || !navigator.onLine) return;
  draining = true;
  try {
    const ops = await outboxGetAll();
    for (const op of ops) {
      try {
        await HANDLERS[op.type](op);
        await outboxRemove(op.id);
        pendingCount = Math.max(0, pendingCount - 1);
        notify();
      } catch (err) {
        console.warn('[outbox] sync failed, will retry later:', op.type, err);
      }
    }
  } finally {
    draining = false;
  }
}

/** Call once at boot after the local mirror has loaded, to prime pendingCount and start the sync loop. */
export async function initOutbox() {
  const ops = await outboxGetAll();
  pendingCount = ops.length;
  notify();

  window.addEventListener('online', () => { notify(); drain(); });
  window.addEventListener('offline', notify);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') drain();
  });
  setInterval(drain, 30000);

  drain();
}
