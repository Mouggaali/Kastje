import { useState, type ChangeEvent, type FormEvent } from 'react';
import { detectColor } from '../data/detectColor';
import { useObjectUrl } from '../data/useObjectUrl';
import { resizeImage } from '../data/resizeImage';
import { newId } from '../data/storage';
import { COLORS, colorInfo } from '../outfit/colors';
import {
  ACCESSORY_TYPES,
  CATEGORIES,
  OCCASIONS,
  WARMTH_LABELS,
  type AccessoryType,
  type Category,
  type ClothingItem,
  type Occasion,
  type Warmth,
} from '../types';
import { ItemPhoto } from './ItemPhoto';

export type PhotoChange = { kind: 'keep' } | { kind: 'remove' } | { kind: 'new'; blob: Blob };

interface Props {
  /** Leeg bij een nieuw kledingstuk */
  item?: ClothingItem;
  /** Foto die net met de camera is gemaakt (al verkleind) */
  initialPhoto?: Blob;
  /** Kleur die uit die foto is herkend */
  initialColor?: string;
  onSave: (item: ClothingItem, photo: PhotoChange) => Promise<void>;
  onDelete?: () => void;
  /** Opruimen zonder te verwijderen */
  onArchive?: () => void;
  /** Naar Vandaag met dit stuk vastgezet */
  onBuildAround?: () => void;
  /** Bij meerdere foto's achter elkaar, bijv. "Foto 2 van 5" */
  progress?: string;
  onSkip?: () => void;
  onCancel: () => void;
}

const WARMTH_LEVELS: Warmth[] = [1, 2, 3, 4, 5];

function colorHintText(colorId: string) {
  return `Kleur herkend: ${colorInfo(colorId).label.toLowerCase()}. Klopt het niet? Kies hieronder een andere.`;
}

export function ItemForm(props: Props) {
  const { item, initialPhoto, initialColor, onSave, onDelete, onArchive, onBuildAround, progress, onSkip, onCancel } =
    props;
  const [name, setName] = useState(item?.name ?? '');
  const [category, setCategory] = useState<Category>(item?.category ?? 'shirt');
  const [accessoryType, setAccessoryType] = useState<AccessoryType>(item?.accessoryType ?? 'anders');
  const [occasions, setOccasions] = useState<Occasion[]>(item?.occasions ?? ['casual']);
  const [price, setPrice] = useState(item?.price !== undefined ? String(item.price) : '');
  const [color, setColor] = useState(item?.color ?? initialColor ?? 'zwart');
  // Bij een bestaand stuk heb je de kleur al gekozen; dan veranderen we hem niet automatisch.
  const [colorChosen, setColorChosen] = useState(!!item);
  const [colorHint, setColorHint] = useState(initialColor ? colorHintText(initialColor) : '');
  const [warmth, setWarmth] = useState<Warmth>(item?.warmth ?? 3);
  const [waterproof, setWaterproof] = useState(item?.waterproof ?? false);
  const [photo, setPhoto] = useState<PhotoChange>(initialPhoto ? { kind: 'new', blob: initialPhoto } : { kind: 'keep' });
  const preview = useObjectUrl(photo.kind === 'new' ? photo.blob : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const blob = await resizeImage(file);
      setPhoto({ kind: 'new', blob });
      if (!colorChosen) {
        const detected = await detectColor(blob).catch(() => null);
        if (detected) {
          setColor(detected.id);
          setColorHint(colorHintText(detected.id));
        }
      }
    } catch {
      setError('Deze foto kon niet worden gelezen. Probeer een JPG- of PNG-bestand.');
    } finally {
      setBusy(false);
      input.value = '';
    }
  }

  function chooseColor(id: string) {
    setColor(id);
    setColorChosen(true);
    setColorHint('');
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Geef het kledingstuk een naam.');
      return;
    }
    if (occasions.length === 0) {
      setError('Kies minstens één gelegenheid.');
      return;
    }
    const parsedPrice = price.trim() === '' ? undefined : Number(price.replace(',', '.'));
    if (parsedPrice !== undefined && (Number.isNaN(parsedPrice) || parsedPrice < 0)) {
      setError('Vul een geldige prijs in, bijvoorbeeld 39,95.');
      return;
    }
    const hasPhoto =
      photo.kind === 'new' ? true : photo.kind === 'remove' ? false : (item?.hasPhoto ?? false);
    setBusy(true);
    try {
      await onSave(
        {
          ...item,
          id: item?.id ?? newId(),
          name: name.trim(),
          category,
          accessoryType: category === 'accessoire' ? accessoryType : undefined,
          occasions,
          price: parsedPrice,
          createdAt: item?.createdAt ?? Date.now(),
          color,
          warmth,
          waterproof,
          hasPhoto,
          updatedAt: Date.now(),
        },
        photo,
      );
    } catch {
      setError('Opslaan is niet gelukt. Probeer het nog eens.');
      setBusy(false);
    }
  }

  const showExistingPhoto = photo.kind === 'keep' && item?.hasPhoto;
  const hasAnyPhoto = !!preview || !!showExistingPhoto;

  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <form className="sheet" onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
        <div className="card-title-row">
          <h2>{item ? 'Kledingstuk bewerken' : 'Kledingstuk toevoegen'}</h2>
          {progress && <span className="badge">{progress}</span>}
        </div>

        {onBuildAround && (
          <button type="button" className="button button--secondary" onClick={onBuildAround}>
            ✨ Outfit rond dit stuk
          </button>
        )}

        <div className="photo-block">
          {preview && <img className="photo-preview" src={preview} alt="Foto van het kledingstuk" />}
          {showExistingPhoto && item && (
            <div className="photo-preview">
              <ItemPhoto item={item} />
            </div>
          )}
          {!hasAnyPhoto && <div className="photo-preview photo-preview--empty">Nog geen foto</div>}
          <div className="photo-actions">
            <label className="button button--secondary">
              📷 {hasAnyPhoto ? 'Opnieuw' : 'Foto maken'}
              <input type="file" accept="image/*" capture="environment" onChange={handleFile} hidden />
            </label>
            <label className="button button--ghost">
              🖼️ Uit galerij
              <input type="file" accept="image/*" onChange={handleFile} hidden />
            </label>
            {hasAnyPhoto && (
              <button type="button" className="link-button" onClick={() => setPhoto({ kind: 'remove' })}>
                Foto verwijderen
              </button>
            )}
          </div>
        </div>

        <label className="field">
          <span>Naam</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bijv. Navy regenjas"
          />
        </label>

        <label className="field">
          <span>Categorie</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>
        </label>

        {category === 'accessoire' && (
          <label className="field">
            <span>Soort accessoire</span>
            <select value={accessoryType} onChange={(e) => setAccessoryType(e.target.value as AccessoryType)}>
              {ACCESSORY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                  {t.hint ? ` (${t.hint})` : ''}
                </option>
              ))}
            </select>
            <small className="hint">Kastje stelt sjaal, muts, zonnebril, pet en paraplu vanzelf voor bij het juiste weer.</small>
          </label>
        )}

        <fieldset className="field">
          <legend>Kleur: {colorInfo(color).label.toLowerCase()}</legend>
          {colorHint && <small className="hint hint--accent">{colorHint}</small>}
          <div className="swatches">
            {COLORS.map((c) => (
              <label key={c.id} className="swatch" title={c.label}>
                <input
                  type="radio"
                  name="color"
                  value={c.id}
                  checked={color === c.id}
                  onChange={() => chooseColor(c.id)}
                />
                <span className="swatch-dot" style={{ background: c.hex }} />
                <span className="swatch-label">{c.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>Warmte: {WARMTH_LABELS[warmth].toLowerCase()}</legend>
          <div className="segmented">
            {WARMTH_LEVELS.map((level) => (
              <label key={level}>
                <input
                  type="radio"
                  name="warmth"
                  checked={warmth === level}
                  onChange={() => setWarmth(level)}
                />
                <span>{level}</span>
              </label>
            ))}
          </div>
          <small className="hint">1 = heel licht (zomer), 5 = heel warm (winter)</small>
        </fieldset>

        <label className="check">
          <input type="checkbox" checked={waterproof} onChange={(e) => setWaterproof(e.target.checked)} />
          <span>Waterdicht</span>
        </label>

        <fieldset className="field">
          <legend>Gelegenheid</legend>
          <div className="chip-row">
            {OCCASIONS.map((o) => {
              const active = occasions.includes(o.value);
              return (
                <button
                  type="button"
                  key={o.value}
                  className={active ? 'chip chip--active' : 'chip'}
                  aria-pressed={active}
                  onClick={() =>
                    setOccasions((current) =>
                      active ? current.filter((x) => x !== o.value) : [...current, o.value],
                    )
                  }
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="field">
          <span>Prijs (optioneel)</span>
          <input
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Bijv. 39,95"
          />
          <small className="hint">Voor "prijs per keer dragen" bij Inzicht.</small>
        </label>

        {error && <p className="error">{error}</p>}

        <div className="sheet-actions">
          {onSkip && (
            <button type="button" className="button button--ghost" onClick={onSkip}>
              Overslaan
            </button>
          )}
          {onArchive && (
            <button type="button" className="button button--ghost" onClick={onArchive}>
              Archiveren
            </button>
          )}
          {onDelete && (
            <button type="button" className="button button--danger" onClick={onDelete}>
              Verwijderen
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="button button--ghost" onClick={onCancel}>
            Annuleren
          </button>
          <button type="submit" className="button" disabled={busy}>
            {busy ? 'Bezig…' : 'Opslaan'}
          </button>
        </div>
      </form>
    </div>
  );
}
