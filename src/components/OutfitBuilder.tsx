import { useState, type FormEvent } from 'react';
import { newId } from '../data/storage';
import { harmonyScore } from '../outfit/harmony';
import {
  outfitItems,
  resolveSavedOutfit,
  SLOT_CATEGORIES,
  SLOT_NAMES,
  SLOTS,
  type Slot,
} from '../outfit/outfitLogic';
import type { ClothingItem, SavedOutfit } from '../types';
import { HarmonyBadge } from './HarmonyBadge';
import { ItemPhoto } from './ItemPhoto';
import { OutfitCollage } from './OutfitCollage';

interface Props {
  items: ClothingItem[];
  /** Startpunt: een bestaande outfit (met id = bewerken) of een suggestie (zonder id). */
  initial?: Partial<SavedOutfit>;
  defaultName: string;
  /** Eigen titel, bijv. "Plan voor dinsdag" */
  title?: string;
  /** Uitleg bovenaan, bijv. het weer van die dag */
  subtitle?: string;
  /** Zonder naamveld (de weekplanner heeft geen naam nodig) */
  hideName?: boolean;
  /** Knop om alles te wissen (bijv. een planning weghalen) */
  onClear?: () => void;
  onSave: (outfit: SavedOutfit) => void;
  onCancel: () => void;
}

const SLOT_TITLES: Record<Slot, string> = {
  top: 'Bovenstuk',
  bottom: 'Onderstuk',
  shoes: 'Schoenen',
  jacket: 'Jas (optioneel)',
};

/** Zelf een outfit samenstellen door per onderdeel op een foto te tikken. */
export function OutfitBuilder(props: Props) {
  const { items, initial, defaultName, title, subtitle, hideName, onClear, onSave, onCancel } = props;
  const [name, setName] = useState(initial?.name ?? '');
  const [chosen, setChosen] = useState<Partial<Record<Slot, string>>>(() => {
    const start: Partial<Record<Slot, string>> = {};
    for (const slot of SLOTS) if (initial?.[slot]) start[slot] = initial[slot];
    return start;
  });

  // Id en datum één keer vastleggen, niet bij elke render opnieuw.
  const [id] = useState(() => initial?.id ?? newId());
  const [createdAt] = useState(() => initial?.createdAt ?? Date.now());
  const draft: SavedOutfit = { id, name: name.trim() || defaultName, createdAt, ...chosen };
  const pieces = resolveSavedOutfit(draft, items);
  const isEmpty = Object.keys(pieces).length === 0;

  /** Tik op een foto om hem te kiezen; nog eens tikken haalt hem weg. */
  function toggle(slot: Slot, itemId: string) {
    setChosen((current) => ({ ...current, [slot]: current[slot] === itemId ? undefined : itemId }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isEmpty) onSave(draft);
  }

  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <form className="sheet" onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
        <h2>{title ?? (initial?.id ? 'Outfit bewerken' : 'Outfit samenstellen')}</h2>
        {subtitle && <p className="muted">{subtitle}</p>}

        <div className="builder-preview">
          {isEmpty ? (
            <p className="muted">Tik hieronder op de stukken die je wilt combineren.</p>
          ) : (
            <>
              <OutfitCollage pieces={pieces} />
              <HarmonyBadge harmony={harmonyScore(outfitItems(pieces))} />
            </>
          )}
        </div>

        {SLOTS.map((slot) => {
          const candidates = items.filter((item) => SLOT_CATEGORIES[slot].includes(item.category));
          return (
            <section key={slot} className="field">
              <span>{SLOT_TITLES[slot]}</span>
              {candidates.length === 0 ? (
                <small className="hint">Nog geen {SLOT_NAMES[slot]} in je kast.</small>
              ) : (
                <div className="photo-strip">
                  {candidates.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className={chosen[slot] === item.id ? 'strip-item strip-item--chosen' : 'strip-item'}
                      onClick={() => toggle(slot, item.id)}
                      aria-pressed={chosen[slot] === item.id}
                    >
                      <ItemPhoto item={item} />
                      <span className="strip-name">{item.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {!hideName && (
          <label className="field">
            <span>Naam</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={defaultName} />
          </label>
        )}

        <div className="sheet-actions">
          {onClear && (
            <button type="button" className="button button--danger" onClick={onClear}>
              Wissen
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="button button--ghost" onClick={onCancel}>
            Annuleren
          </button>
          <button type="submit" className="button" disabled={isEmpty}>
            Opslaan
          </button>
        </div>
      </form>
    </div>
  );
}
