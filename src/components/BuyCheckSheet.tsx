import { useEffect, useState, type ChangeEvent } from 'react';
import { detectColor } from '../data/detectColor';
import { resizeImage } from '../data/resizeImage';
import { buyCheck } from '../outfit/buyCheck';
import { COLORS, colorInfo } from '../outfit/colors';
import { CATEGORIES, type Category, type ClothingItem, type Warmth } from '../types';
import { ItemPhoto } from './ItemPhoto';
import { OutfitCollage } from './OutfitCollage';

interface Props {
  items: ClothingItem[];
  onClose: () => void;
  /** "Toch toevoegen aan kast": opent het formulier met deze foto */
  onAddToWardrobe: (photo: Blob, color: string) => void;
}

const WARMTH_LEVELS: Warmth[] = [1, 2, 3, 4, 5];

/** Koop-check: fotografeer iets in de winkel en zie of het bij je kast past. */
export function BuyCheckSheet({ items, onClose, onAddToWardrobe }: Props) {
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [color, setColor] = useState('zwart');
  const [category, setCategory] = useState<Category>('shirt');
  const [warmth, setWarmth] = useState<Warmth>(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const blob = await resizeImage(file);
      setPhoto(blob);
      const detected = await detectColor(blob).catch(() => null);
      if (detected) setColor(detected.id);
    } catch {
      setError('Deze foto kon niet worden gelezen. Probeer het nog eens.');
    } finally {
      setBusy(false);
      input.value = '';
    }
  }

  const result = photo ? buyCheck({ category, color, warmth }, items) : null;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>🛍️ Koop-check</h2>
        <p className="muted">
          Twijfel je in de winkel? Maak een foto. Ik kijk of je al iets vergelijkbaars hebt en met hoeveel van je kleren
          het combineert.
        </p>

        <div className="photo-block">
          {preview ? (
            <img className="photo-preview" src={preview} alt="Foto van het kledingstuk in de winkel" />
          ) : (
            <div className="photo-preview photo-preview--empty">Nog geen foto</div>
          )}
          <div className="photo-actions">
            <label className={busy ? 'button button--busy' : 'button'}>
              {busy ? 'Bezig…' : `📷 ${photo ? 'Opnieuw' : 'Foto maken'}`}
              <input type="file" accept="image/*" capture="environment" onChange={handleFile} hidden />
            </label>
            <label className="button button--ghost">
              🖼️ Uit galerij
              <input type="file" accept="image/*" onChange={handleFile} hidden />
            </label>
          </div>
        </div>
        {error && <p className="error">{error}</p>}

        {photo && result && (
          <>
            <label className="field">
              <span>Wat is het?</span>
              <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.icon} {c.label}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="field">
              <legend>Kleur: {colorInfo(color).label.toLowerCase()}</legend>
              <div className="swatches">
                {COLORS.map((c) => (
                  <label key={c.id} className="swatch" title={c.label}>
                    <input type="radio" name="buy-color" checked={color === c.id} onChange={() => setColor(c.id)} />
                    <span className="swatch-dot" style={{ background: c.hex }} />
                    <span className="swatch-label">{c.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="field">
              <legend>Warmte</legend>
              <div className="segmented">
                {WARMTH_LEVELS.map((level) => (
                  <label key={level}>
                    <input type="radio" name="buy-warmth" checked={warmth === level} onChange={() => setWarmth(level)} />
                    <span>{level}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className={`verdict verdict--${result.verdict}`} aria-live="polite">
              <strong>{result.title}</strong>
              <span>{result.reason}</span>
            </div>

            {result.similar.length > 0 && (
              <div className="field">
                <span>Dit heb je al</span>
                <ul className="rank-list">
                  {result.similar.map((item) => (
                    <li key={item.id}>
                      <ItemPhoto item={item} small />
                      <span className="rank-text">
                        <span className="item-name">{item.name}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.examples.length > 0 && (
              <div className="field">
                <span>Zo zou je het kunnen dragen</span>
                {result.examples.map((pieces, i) => (
                  <OutfitCollage key={i} pieces={pieces} />
                ))}
              </div>
            )}
          </>
        )}

        <div className="sheet-actions">
          <span className="spacer" />
          <button type="button" className="button button--ghost" onClick={onClose}>
            Sluiten
          </button>
          {photo && (
            <button type="button" className="button" onClick={() => onAddToWardrobe(photo, color)}>
              Gekocht! Toevoegen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
