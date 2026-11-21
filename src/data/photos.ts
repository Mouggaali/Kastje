// Foto's staan in IndexedDB: daar passen veel meer en grotere bestanden in dan in localStorage.
// Elke foto wordt opgeslagen onder het id van het kledingstuk.

const DB_NAME = 'kastje';
const STORE = 'photos';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = action(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

export async function savePhoto(id: string, blob: Blob): Promise<void> {
  await run('readwrite', (store) => store.put(blob, id));
}

export function getPhoto(id: string): Promise<Blob | undefined> {
  return run('readonly', (store) => store.get(id) as IDBRequest<Blob | undefined>);
}

export async function deletePhoto(id: string): Promise<void> {
  await run('readwrite', (store) => store.delete(id));
}

/** Alle foto's als [id, foto]-paren (voor een back-up). */
export async function getAllPhotos(): Promise<[string, Blob][]> {
  const keys = await run('readonly', (store) => store.getAllKeys());
  const blobs = await run('readonly', (store) => store.getAll() as IDBRequest<Blob[]>);
  return keys.map((key, i) => [String(key), blobs[i]]);
}

/** Wist foto's waar geen kledingstuk meer bij hoort. */
export async function cleanupOrphanPhotos(itemIds: string[]): Promise<void> {
  const keep = new Set(itemIds);
  const keys = await run('readonly', (store) => store.getAllKeys());
  for (const key of keys) if (!keep.has(String(key))) await deletePhoto(String(key));
}

/** Alle foto's wissen (voor het terugzetten van een back-up). */
export async function clearPhotos(): Promise<void> {
  await run('readwrite', (store) => store.clear());
}
