// Minimal IndexedDB key-value store (uploaded .fprg files, generated PDFs, delivery queue).
const DB = "fg-exam";
const STORE = "kv";
let dbp: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  if (!dbp)
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  return dbp;
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

export const idb = {
  get: <T = unknown>(k: string) => tx<T>("readonly", (s) => s.get(k) as IDBRequest<T>).catch(() => undefined as T | undefined),
  set: (k: string, v: unknown) => tx("readwrite", (s) => s.put(v, k)).catch(() => undefined),
  del: (k: string) => tx("readwrite", (s) => s.delete(k)).catch(() => undefined),
  keys: () => tx<IDBValidKey[]>("readonly", (s) => s.getAllKeys()).catch(() => [] as IDBValidKey[]),
};
