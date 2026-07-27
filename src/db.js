const DB_NAME = 'fip_db';
const DB_VERSION = 1;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('mirror')) {
        db.createObjectStore('mirror', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('outbox')) {
        db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(storeName, mode) {
  return openDB().then(db => db.transaction(storeName, mode).objectStore(storeName));
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/* ── mirror: simple key/value persistence for S_data's three localStorage keys ── */
export async function mirrorGet(key) {
  const store = await tx('mirror', 'readonly');
  const row = await reqToPromise(store.get(key));
  return row ? row.value : undefined;
}
export async function mirrorSet(key, value) {
  const store = await tx('mirror', 'readwrite');
  await reqToPromise(store.put({ key, value }));
}

/* ── outbox: ordered write-ahead queue ── */
export async function outboxAdd(op) {
  const store = await tx('outbox', 'readwrite');
  return reqToPromise(store.add({ ...op, createdAt: Date.now() }));
}
export async function outboxGetAll() {
  const store = await tx('outbox', 'readonly');
  return reqToPromise(store.getAll());
}
export async function outboxRemove(id) {
  const store = await tx('outbox', 'readwrite');
  await reqToPromise(store.delete(id));
}
