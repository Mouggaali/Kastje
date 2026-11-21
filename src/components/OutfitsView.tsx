import { useState } from 'react';
import { missingFromSaved, outfitItems, resolveSavedOutfit, toDateString } from '../outfit/outfitLogic';
import type { ClothingItem, SavedOutfit, WearLogEntry } from '../types';
import { harmonyScore } from '../outfit/harmony';
import { HarmonyBadge } from './HarmonyBadge';
import { OutfitBuilder } from './OutfitBuilder';
import { OutfitCollage } from './OutfitCollage';

interface Props {
  items: ClothingItem[];
  outfits: SavedOutfit[];
  wearLog: WearLogEntry[];
  onOutfitsChange: (outfits: SavedOutfit[]) => void;
  onLogWear: (date: string, itemIds: string[]) => void;
}

/** Je eigen, bewaarde outfits. */
export function OutfitsView({ items, outfits, wearLog, onOutfitsChange, onLogWear }: Props) {
  const [editing, setEditing] = useState<SavedOutfit | 'nieuw' | null>(null);
  const today = toDateString(new Date());
  const loggedToday = wearLog.find((entry) => entry.date === today)?.itemIds.join();

  function handleSave(saved: SavedOutfit) {
    const exists = outfits.some((o) => o.id === saved.id);
    onOutfitsChange(exists ? outfits.map((o) => (o.id === saved.id ? saved : o)) : [saved, ...outfits]);
    setEditing(null);
  }

  function handleDelete(outfit: SavedOutfit) {
    if (!window.confirm(`Outfit "${outfit.name}" verwijderen? Je kleding blijft gewoon in je kast.`)) return;
    onOutfitsChange(outfits.filter((o) => o.id !== outfit.id));
  }

  return (
    <section className="view">
      <div className="view-header">
        <h1>Mijn outfits</h1>
        <button className="button" onClick={() => setEditing('nieuw')}>
          + Nieuwe outfit
        </button>
      </div>

      {outfits.length === 0 && (
        <p className="empty">
          Nog geen outfits. Stel er zelf een samen met je foto's, of tik op ♡ Bewaren bij een suggestie op Vandaag.
        </p>
      )}

      {outfits.map((outfit) => {
        const pieces = resolveSavedOutfit(outfit, items);
        const ids = outfitItems(pieces).map((i) => i.id);
        const missing = missingFromSaved(outfit, items);
        const worn = ids.length > 0 && loggedToday === ids.join();
        return (
          <article key={outfit.id} className="card outfit-card">
            <div className="card-title-row">
              <h2>{outfit.name}</h2>
            </div>
            {ids.length > 0 && <HarmonyBadge harmony={harmonyScore(outfitItems(pieces))} />}
            <OutfitCollage pieces={pieces} />
            {missing > 0 && (
              <p className="notice">
                {missing === 1 ? 'Eén stuk' : `${missing} stukken`} uit deze outfit zit niet meer in je kast.
              </p>
            )}
            <div className="row">
              <button className="button" onClick={() => onLogWear(today, ids)} disabled={worn || ids.length === 0}>
                {worn ? '✓ Gelogd voor vandaag' : 'Dit draag ik vandaag'}
              </button>
              <button className="button button--secondary" onClick={() => setEditing(outfit)}>
                Bewerken
              </button>
              <button className="button button--ghost" onClick={() => handleDelete(outfit)}>
                Verwijderen
              </button>
            </div>
          </article>
        );
      })}

      {editing && (
        <OutfitBuilder
          items={items}
          initial={editing === 'nieuw' ? undefined : editing}
          defaultName={`Outfit ${outfits.length + 1}`}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}
    </section>
  );
}
