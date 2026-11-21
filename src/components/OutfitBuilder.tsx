import { useState, type FormEvent } from 'react';
import { newId } from '../data/storage';
import { harmonyScore } from '../outfit/harmony';
import {
  missingFromSaved,
  outfitItems,
  resolveSavedOutfit,
  SLOT_CATEGORIES,
  type OutfitIds,
  type Slot,
} from '../outfit/outfitLogic';
import type { Category, ClothingItem, SavedOutfit } from '../types';
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

type SectionKey = Slot | 'layer' | 'accessories';

/** De rijen met foto's in de bouwer, van boven naar beneden. */
const SECTIONS: { key: SectionKey; title: string; empty: string; categories: Category[] }[] = [
  { key: 'top', title: 'Bovenstuk', empty: 'bovenstuk', categories: SLOT_CATEGORIES.top },
  { key: 'layer', title: 'Laag eronder (optioneel)', empty: 'shirt', categories: ['shirt'] },
  { key: 'bottom', title: 'Onderstuk', empty: 'onderstuk', categories: SLOT_CATEGORIES.bottom },
  { key: 'shoes', title: 'Schoenen', empty: 'schoenen', categories: SLOT_CATEGORIES.shoes },
  { key: 'jacket', title: 'Jas (optioneel)', empty: 'jas', categories: SLOT_CATEGORIES.jacket },
  { key: 'accessories', title: 'Accessoires (optioneel, meerdere)', empty: 'accessoires', categories: ['accessoire'] },
];

/** Zelf een outfit samenstellen door per onderdeel op een foto te tikken. */
export function OutfitBuilder(props: Props) {
  const { items, initial, defaultName, title, subtitle, hideName, onClear, onSave, onCancel } = props;
  const [name, setName] = useState(initial?.name ?? '');
  // De oorspronkelijke ids overnemen, ook van stukken die nu gearchiveerd zijn: anders zou
  // opslaan ze stilletjes uit je outfit halen. (Ze zijn alleen niet zichtbaar zolang ze gearchiveerd zijn.)
  const [chosen, setChosen] = useState<OutfitIds>(() => ({
    top: initial?.top,
    layer: initial?.layer,
    bottom: initial?.bottom,
    shoes: initial?.shoes,
    jacket: initial?.jacket,
    accessories: initial?.accessories?.length ? [...initial.accessories] : undefined,
  }));

  // Id en datum één keer vastleggen, niet bij elke render opnieuw.
  const [id] = useState(() => initial?.id ?? newId());
  const [createdAt] = useState(() => initial?.createdAt ?? Date.now());
  const draft: SavedOutfit = { id, name: name.trim() || defaultName, createdAt, ...chosen };
  const pieces = resolveSavedOutfit(draft, items);
  const isEmpty = Object.keys(pieces).length === 0;
  // Stukken die in de outfit zitten maar nu gearchiveerd (of verwijderd) zijn.
  const hiddenCount = missingFromSaved(draft, items);

  /** Tik op een foto om hem te kiezen; nog eens tikken haalt hem weg. Accessoires: meerdere tegelijk. */
  function toggle(key: SectionKey, itemId: string) {
    setChosen((current) => {
      if (key === 'accessories') {
        const list = current.accessories ?? [];
        const next = list.includes(itemId) ? list.filter((x) => x !== itemId) : [...list, itemId];
        return { ...current, accessories: next.length > 0 ? next : undefined };
      }
      return { ...current, [key]: current[key] === itemId ? undefined : itemId };
    });
  }

  const isChosen = (key: SectionKey, itemId: string) =>
    key === 'accessories' ? (chosen.accessories ?? []).includes(itemId) : chosen[key] === itemId;
  // De laag-rij alleen tonen als je een trui hebt gekozen (of al een laag had).
  const topIsSweater = items.find((i) => i.id === chosen.top)?.category === 'trui';
  const sections = SECTIONS.filter((s) => s.key !== 'layer' || topIsSweater || chosen.layer);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isEmpty) onSave(draft);
  }

  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <form className="sheet" onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
        <h2>{title ?? (initial?.id ? 'Outfit bewerken' : 'Outfit samenstellen')}</h2>
        {subtitle && <p className="muted">{subtitle}</p>}

        {hiddenCount > 0 && (
          <p className="hint">
            {hiddenCount === 1 ? 'Eén stuk' : `${hiddenCount} stukken`} uit deze outfit {hiddenCount === 1 ? 'is' : 'zijn'} nu
            gearchiveerd of verwijderd. Dat blijft bewaard, tenzij je het hier vervangt.
          </p>
        )}

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

        {sections.map(({ key, title, empty, categories }) => {
          const candidates = items.filter((item) => categories.includes(item.category));
          return (
            <section key={key} className="field">
              <span>{title}</span>
              {candidates.length === 0 ? (
                <small className="hint">Nog geen {empty} in je kast.</small>
              ) : (
                <div className="photo-strip">
                  {candidates.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className={isChosen(key, item.id) ? 'strip-item strip-item--chosen' : 'strip-item'}
                      onClick={() => toggle(key, item.id)}
                      aria-pressed={isChosen(key, item.id)}
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
