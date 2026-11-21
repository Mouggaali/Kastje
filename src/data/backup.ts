/**
 * Back-up en herstellen: alles van Kastje (gegevens én foto's) in één bestand.
 *
 * Handig als je je browsergegevens wist, een nieuwe telefoon hebt, of je kast
 * van je computer naar de geïnstalleerde app op je telefoon wilt overzetten.
 */
import { getAllPhotos, savePhoto } from './photos';

export const BACKUP_VERSION = 1;
const PREFIX = 'kastje.';
/** Deze sleutels horen bij dit apparaat en gaan niet mee in een back-up. */
const DEVICE_ONLY = ['kastje.weatherCache', 'kastje.lastBackup'];

export interface BackupFile {
  app: 'kastje';
  version: number;
  exportedAt: string;
  /** Ruwe localStorage-waarden, per sleutel */
  data: Record<string, string>;
  /** Foto's als data-URL, per kledingstuk-id */
  photos: Record<string, string>;
}

/** Het deel van Storage dat we gebruiken; in tests vervangen we het door een nep-opslag. */
type StorageLike = Pick<Storage, 'length' | 'key' | 'getItem' | 'setItem' | 'removeItem'>;

function kastjeKeys(storage: StorageLike): string[] {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith(PREFIX)) keys.push(key);
  }
  return keys;
}

/** Alle Kastje-gegevens uit de opslag (zonder apparaat-specifieke dingen). */
export function collectData(storage: StorageLike): Record<string, string> {
  const data: Record<string, string> = {};
  for (const key of kastjeKeys(storage)) {
    if (DEVICE_ONLY.includes(key)) continue;
    const value = storage.getItem(key);
    if (value !== null) data[key] = value;
  }
  return data;
}

/** Vervangt alle Kastje-gegevens in de opslag door die uit de back-up. */
export function applyData(storage: StorageLike, data: Record<string, string>): void {
  for (const key of kastjeKeys(storage)) {
    if (!DEVICE_ONLY.includes(key)) storage.removeItem(key);
  }
  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith(PREFIX) && !DEVICE_ONLY.includes(key)) storage.setItem(key, value);
  }
}

/** Leest en controleert een back-upbestand. Gooit een fout met een begrijpelijke uitleg. */
export function parseBackup(text: string): BackupFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Dit bestand kan ik niet lezen. Kies een Kastje-back-up (.json).');
  }
  const backup = parsed as Partial<BackupFile>;
  if (backup?.app !== 'kastje' || typeof backup.data !== 'object' || backup.data === null) {
    throw new Error('Dit is geen Kastje-back-up.');
  }
  if (typeof backup.version !== 'number' || backup.version > BACKUP_VERSION) {
    throw new Error('Deze back-up komt uit een nieuwere versie van Kastje. Werk de app eerst bij.');
  }
  for (const [key, value] of Object.entries(backup.data)) {
    if (!key.startsWith(PREFIX) || typeof value !== 'string') throw new Error('De back-up is beschadigd.');
  }
  return {
    app: 'kastje',
    version: backup.version,
    exportedAt: String(backup.exportedAt ?? ''),
    data: backup.data,
    photos: backup.photos && typeof backup.photos === 'object' ? backup.photos : {},
  };
}

/** Hoeveel kledingstukken er in een back-up zitten (voor de bevestigingsvraag). */
export function countItems(backup: BackupFile): number {
  try {
    const items = JSON.parse(backup.data['kastje.items'] ?? '[]');
    return Array.isArray(items) ? items.length : 0;
  } catch {
    return 0;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Maakt een complete back-up: gegevens uit localStorage en alle foto's uit IndexedDB. */
export async function createBackup(): Promise<BackupFile> {
  const photos: Record<string, string> = {};
  for (const [id, blob] of await getAllPhotos()) photos[id] = await blobToDataUrl(blob);
  return {
    app: 'kastje',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: collectData(localStorage),
    photos,
  };
}

/**
 * Zet een back-up terug. Alles in Kastje op dit apparaat wordt vervangen.
 *
 * Volgorde, zodat een mislukking je huidige kast niet beschadigt:
 * 1. eerst alle foto's uit de back-up inlezen (gaat dat mis, dan is er nog niets veranderd);
 * 2. de foto's opslaan (bestaande foto's worden níét eerst gewist);
 * 3. pas daarna de gegevens vervangen.
 * Foto's van stukken die niet in de back-up zitten, ruimt de app bij de volgende start op.
 */
export async function restoreBackup(backup: BackupFile): Promise<void> {
  const photos: [string, Blob][] = [];
  for (const [id, dataUrl] of Object.entries(backup.photos)) {
    photos.push([id, await (await fetch(dataUrl)).blob()]);
  }
  for (const [id, blob] of photos) await savePhoto(id, blob);
  applyData(localStorage, backup.data);
}

/** Bestandsnaam zoals "kastje-backup-2026-11-21.json" */
export function backupFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `kastje-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}
