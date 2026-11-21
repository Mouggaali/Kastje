import { describe, expect, it } from 'vitest';
import { applyData, backupFileName, collectData, countItems, parseBackup } from './backup';

/** Eenvoudige nep-opslag die werkt zoals localStorage. */
function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    dump: () => Object.fromEntries(map),
  };
}

describe('collectData', () => {
  it('neemt alleen Kastje-gegevens mee, zonder apparaat-specifieke dingen', () => {
    const storage = fakeStorage({
      'kastje.items': '[{"id":"a"}]',
      'kastje.place': '{"name":"Utrecht"}',
      'kastje.weatherCache': '{}',
      'kastje.lastBackup': '123',
      'iets.anders': 'x',
    });
    expect(collectData(storage)).toEqual({
      'kastje.items': '[{"id":"a"}]',
      'kastje.place': '{"name":"Utrecht"}',
    });
  });
});

describe('applyData', () => {
  it('vervangt de Kastje-gegevens maar laat andere dingen staan', () => {
    const storage = fakeStorage({ 'kastje.items': '["oud"]', 'kastje.votes': '[1]', 'iets.anders': 'x' });
    applyData(storage, { 'kastje.items': '["nieuw"]' });
    expect(storage.dump()).toEqual({ 'kastje.items': '["nieuw"]', 'iets.anders': 'x' });
  });

  it('een back-up maken en terugzetten geeft precies hetzelfde', () => {
    const original = { 'kastje.items': '[{"id":"a"}]', 'kastje.outfits': '[]', 'kastje.plan': '[{"date":"2026-11-22"}]' };
    const data = collectData(fakeStorage(original));
    const target = fakeStorage({ 'kastje.items': '[]' });
    applyData(target, data);
    expect(target.dump()).toEqual(original);
  });
});

describe('parseBackup', () => {
  const valid = { app: 'kastje', version: 1, exportedAt: '2026-11-21', data: { 'kastje.items': '[1,2]' }, photos: {} };

  it('accepteert een geldige back-up', () => {
    const backup = parseBackup(JSON.stringify(valid));
    expect(countItems(backup)).toBe(2);
  });

  it('weigert iets dat geen JSON is', () => {
    expect(() => parseBackup('hallo')).toThrow('kan ik niet lezen');
  });

  it('weigert een ander soort bestand', () => {
    expect(() => parseBackup(JSON.stringify({ foo: 1 }))).toThrow('geen Kastje-back-up');
  });

  it('weigert een back-up uit een nieuwere versie', () => {
    expect(() => parseBackup(JSON.stringify({ ...valid, version: 99 }))).toThrow('nieuwere versie');
  });

  it('weigert vreemde sleutels', () => {
    expect(() => parseBackup(JSON.stringify({ ...valid, data: { 'iets.anders': 'x' } }))).toThrow('beschadigd');
  });
});

describe('backupFileName', () => {
  it('zet de datum in de naam', () => {
    expect(backupFileName(new Date('2026-03-05T10:00:00'))).toBe('kastje-backup-2026-03-05.json');
  });
});
