import { useState } from 'react';
import { entryToOutfitIds, monthGrid } from '../outfit/diary';
import { outfitItems, resolveSavedOutfit, toDateString } from '../outfit/outfitLogic';
import type { ClothingItem, WearLogEntry } from '../types';
import { ItemPhoto } from './ItemPhoto';
import { OutfitBuilder } from './OutfitBuilder';
import { OutfitCollage } from './OutfitCollage';

interface Props {
  /** Alle kleding, ook gearchiveerde: oude dagen blijven zo compleet. */
  allItems: ClothingItem[];
  /** Kleding waaruit je kunt kiezen bij toevoegen of wijzigen */
  activeItems: ClothingItem[];
  wearLog: WearLogEntry[];
  onLogWear: (date: string, itemIds: string[]) => void;
  onRemoveLog: (date: string) => void;
}

const WEEKDAYS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];

function longDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Kalender met wat je elke dag droeg. Tik op een dag om hem te bekijken, toe te voegen of te wijzigen. */
export function DiaryCard({ allItems, activeItems, wearLog, onLogWear, onRemoveLog }: Props) {
  const [today] = useState(() => toDateString(new Date()));
  const [shown, setShown] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const byDate = new Map(wearLog.map((entry) => [entry.date, entry]));
  const weeks = monthGrid(shown.year, shown.month);
  const isCurrentMonth = today.startsWith(`${shown.year}-${String(shown.month + 1).padStart(2, '0')}`);
  const monthLabel = new Date(shown.year, shown.month, 1, 12).toLocaleDateString('nl-NL', {
    month: 'long',
    year: 'numeric',
  });
  const loggedThisMonth = weeks.flat().filter((d) => d && byDate.has(d)).length;

  function moveMonth(delta: number) {
    setShown(({ year, month }) => {
      const next = new Date(year, month + delta, 1, 12);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  /** Eerste foto van een gelogde dag, voor in het kalendervakje. */
  function thumbnail(entry: WearLogEntry): ClothingItem | undefined {
    const ids = entryToOutfitIds(entry.itemIds, allItems);
    return allItems.find((i) => i.id === (ids.top ?? ids.bottom ?? entry.itemIds[0]));
  }

  const selectedEntry = selected ? byDate.get(selected) : undefined;
  const selectedIds = selectedEntry ? entryToOutfitIds(selectedEntry.itemIds, allItems) : {};

  return (
    <article className="card">
      <div className="card-title-row">
        <h2>Draagdagboek</h2>
        <span className="muted diary-count">{loggedThisMonth} dagen gelogd</span>
      </div>

      <div className="diary-nav">
        <button className="vote" onClick={() => moveMonth(-1)} aria-label="Vorige maand">
          ‹
        </button>
        <strong className="diary-month">{monthLabel}</strong>
        <button className="vote" onClick={() => moveMonth(1)} disabled={isCurrentMonth} aria-label="Volgende maand">
          ›
        </button>
      </div>

      <div className="diary-grid" role="grid" aria-label={`Draagdagboek ${monthLabel}`}>
        {WEEKDAYS.map((d) => (
          <span key={d} className="diary-weekday" aria-hidden="true">
            {d}
          </span>
        ))}
        {weeks.flat().map((date, i) => {
          if (!date) return <span key={`leeg-${i}`} />;
          const entry = byDate.get(date);
          const photo = entry ? thumbnail(entry) : undefined;
          const future = date > today;
          const classes = ['diary-day', entry && 'diary-day--worn', date === today && 'diary-day--today']
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={date}
              className={classes}
              disabled={future}
              onClick={() => setSelected(date)}
              aria-label={`${longDate(date)}${entry ? ', gelogd' : ''}`}
            >
              <span className="diary-date">{Number(date.slice(8))}</span>
              {photo && <ItemPhoto item={photo} small />}
            </button>
          );
        })}
      </div>
      <p className="hint">Tik op een dag om te zien wat je droeg, of om een vergeten dag toe te voegen.</p>

      {selected && !editing && (
        <div className="sheet-backdrop" onClick={() => setSelected(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedEntry ? `Gedragen op ${longDate(selected)}` : `Niets gelogd op ${longDate(selected)}`}</h2>
            {selectedEntry ? (
              <>
                <OutfitCollage pieces={resolveSavedOutfit(selectedIds, allItems)} />
                {outfitItems(resolveSavedOutfit(selectedIds, allItems)).length < selectedEntry.itemIds.length && (
                  <p className="hint">Niet alles van deze dag zit nog in je kast.</p>
                )}
              </>
            ) : (
              <p className="muted">Weet je nog wat je droeg? Voeg het toe, dan klopt je Inzicht weer.</p>
            )}
            <div className="sheet-actions">
              {selectedEntry && (
                <button
                  className="button button--danger"
                  onClick={() => {
                    onRemoveLog(selected);
                    setSelected(null);
                  }}
                >
                  Wissen
                </button>
              )}
              <span className="spacer" />
              <button className="button button--ghost" onClick={() => setSelected(null)}>
                Sluiten
              </button>
              <button className="button" onClick={() => setEditing(true)}>
                {selectedEntry ? 'Wijzigen' : 'Toevoegen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && editing && (
        <OutfitBuilder
          items={activeItems}
          initial={selectedIds}
          defaultName=""
          hideName
          title={`Gedragen op ${longDate(selected)}`}
          onSave={(outfit) => {
            // Ook gearchiveerde stukken die al in deze dag zaten, blijven bewaard.
            onLogWear(selected, outfitItems(resolveSavedOutfit(outfit, allItems)).map((i) => i.id));
            setEditing(false);
            setSelected(null);
          }}
          onCancel={() => setEditing(false)}
        />
      )}
    </article>
  );
}
