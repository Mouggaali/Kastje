import { useState, type ChangeEvent } from 'react';
import { backupFileName, countItems, createBackup, parseBackup, restoreBackup } from '../data/backup';
import { saveFile } from '../data/download';

interface Props {
  lastBackup: number | null;
  onBackupMade: (time: number) => void;
}

function formatAgo(time: number): string {
  const days = Math.floor((Date.now() - time) / 86_400_000);
  if (days <= 0) return 'vandaag';
  if (days === 1) return 'gisteren';
  return `${days} dagen geleden`;
}

/** Back-up maken en terugzetten. */
export function BackupCard({ lastBackup, onBackupMade }: Props) {
  const [busy, setBusy] = useState<'maken' | 'terugzetten' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function makeBackup() {
    setBusy('maken');
    setError('');
    setMessage('');
    try {
      const backup = await createBackup();
      const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
      await saveFile(blob, backupFileName());
      const now = Date.now();
      onBackupMade(now);
      setMessage(`Back-up gemaakt met ${countItems(backup)} kledingstukken en ${Object.keys(backup.photos).length} foto's.`);
    } catch {
      setError('De back-up is niet gelukt. Probeer het nog eens.');
    } finally {
      setBusy(null);
    }
  }

  async function handleRestore(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    setError('');
    setMessage('');
    try {
      const backup = parseBackup(await file.text());
      const date = backup.exportedAt ? new Date(backup.exportedAt).toLocaleDateString('nl-NL') : 'onbekende datum';
      const ok = window.confirm(
        `Back-up van ${date} met ${countItems(backup)} kledingstukken terugzetten?\n\n` +
          'Alles wat nu in Kastje op dit apparaat staat, wordt vervangen. Dit kan niet ongedaan worden gemaakt.',
      );
      if (!ok) return;
      setBusy('terugzetten');
      await restoreBackup(backup);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terugzetten is niet gelukt.');
      setBusy(null);
    }
  }

  return (
    <article className="card">
      <h2>Je gegevens</h2>
      <p className="muted">
        Alles staat alleen op dit apparaat. Maak af en toe een back-up, zodat je niets kwijtraakt en je kast kunt overzetten
        naar een ander apparaat.
      </p>
      <p className="hint">Laatste back-up: {lastBackup ? formatAgo(lastBackup) : 'nog nooit'}</p>
      <div className="row">
        <button className="button" onClick={makeBackup} disabled={busy !== null}>
          {busy === 'maken' ? 'Bezig…' : '💾 Back-up maken'}
        </button>
        <label className={busy ? 'button button--ghost button--busy' : 'button button--ghost'}>
          {busy === 'terugzetten' ? 'Terugzetten…' : '↩️ Back-up terugzetten'}
          <input type="file" accept="application/json,.json" onChange={handleRestore} hidden />
        </label>
      </div>
      {message && <p className="notice">{message}</p>}
      {error && <p className="error">{error}</p>}
    </article>
  );
}
