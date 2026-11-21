import { useState, type ChangeEvent } from 'react';
import { detectColors } from '../data/detectColor';
import { deletePhoto, savePhoto } from '../data/photos';
import { resizeImage } from '../data/resizeImage';
import { colorInfo, itemColors } from '../outfit/colors';
import { CATEGORIES, categoryInfo, OCCASIONS, PATTERNS, type Category, type ClothingItem } from '../types';
import { BuyCheckSheet } from './BuyCheckSheet';
import { ItemForm, type PhotoChange } from './ItemForm';
import { ItemPhoto } from './ItemPhoto';

interface Props {
  /** Alle kleding, ook gearchiveerde (die tonen we hier niet, maar ze moeten bewaard blijven). */
  items: ClothingItem[];
  onItemsChange: (items: ClothingItem[]) => void;
  /** Verwijderen (met "Ongedaan maken") */
  onDeleteItem: (item: ClothingItem) => void;
  /** Archiveren (met "Ongedaan maken") */
  onArchiveItem: (item: ClothingItem) => void;
  /** Naar Vandaag met dit stuk vastgezet */
  onBuildAround: (item: ClothingItem) => void;
}

/** Kleurstip: bij twee kleuren een stip met twee helften. */
function dotBackground(item: ClothingItem): string {
  const [first, second] = itemColors(item).map((c) => colorInfo(c).hex);
  return second ? `linear-gradient(90deg, ${first} 50%, ${second} 50%)` : first;
}

/** Kleine letters en zonder accenten, zodat "Bordeaux" ook "bordeaux" en "Rok/jurk" ook "jurk" vindt. */
function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Alles waarop je een kledingstuk kunt vinden: naam, kleur, categorie en gelegenheden. */
function searchText(item: ClothingItem): string {
  const occasions = item.occasions.map((o) => OCCASIONS.find((x) => x.value === o)?.label ?? o);
  const pattern = PATTERNS.find((p) => p.value === item.pattern)?.label ?? '';
  const colors = itemColors(item).map((c) => colorInfo(c).label);
  return normalize([item.name, ...colors, categoryInfo(item.category).label, pattern, ...occasions].join(' '));
}

const CATEGORY_ORDER = CATEGORIES.map((c) => c.value);

/** Wat er in het formulier open staat: een bestaand stuk, of een nieuw stuk (eventueel met foto). */
type Editing = { item?: ClothingItem; photo?: Blob; color?: string; color2?: string; source?: Blob };

/** Verkleint een foto en herkent de kleur. */
async function preparePhoto(file: File): Promise<Editing> {
  // Een scherpe versie om eventueel uit bij te snijden, en de gewone foto (800 px) om op te slaan.
  const source = await resizeImage(file, 1600);
  const photo = await resizeImage(source);
  const colors = await detectColors(photo).catch(() => undefined);
  return { photo, color: colors?.primary.id, color2: colors?.secondary?.id, source };
}

export function WardrobeView({ items, onItemsChange, onDeleteItem, onArchiveItem, onBuildAround }: Props) {
  const [filter, setFilter] = useState<Category | 'alle'>('alle');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Editing | null>(null);
  // Wachtrij bij "Meerdere foto's": de foto's worden één voor één ingevuld.
  const [queue, setQueue] = useState<Editing[]>([]);
  const [queueTotal, setQueueTotal] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [buyCheckOpen, setBuyCheckOpen] = useState(false);

  const activeItems = items.filter((i) => !i.archived);

  /** Eén foto gemaakt: verkleinen, kleur herkennen en het formulier openen. */
  async function handleCameraPhoto(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setProcessing(true);
    setPhotoError('');
    try {
      setEditing(await preparePhoto(file));
    } catch {
      setPhotoError('Deze foto kon niet worden gelezen. Probeer het nog eens.');
    } finally {
      setProcessing(false);
      input.value = '';
    }
  }

  /** Meerdere foto's gekozen: allemaal voorbereiden en dan één voor één invullen. */
  async function handleManyPhotos(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = [...(input.files ?? [])];
    if (files.length === 0) return;
    setProcessing(true);
    setPhotoError('');
    const prepared: Editing[] = [];
    for (const file of files) {
      try {
        prepared.push(await preparePhoto(file));
      } catch {
        // Een onleesbare foto slaan we over; de rest gaat gewoon door.
      }
    }
    if (prepared.length < files.length) {
      setPhotoError(`${files.length - prepared.length} foto('s) konden niet worden gelezen en zijn overgeslagen.`);
    }
    setQueue(prepared);
    setQueueTotal(prepared.length);
    setProcessing(false);
    input.value = '';
  }

  // Elk woord moet ergens voorkomen: "zwart werk" vindt zwarte werkkleding.
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const visible = activeItems
    .filter((i) => filter === 'alle' || i.category === filter)
    .filter((i) => words.every((word) => searchText(i).includes(word)))
    .sort(
      (a, b) =>
        CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
        a.name.localeCompare(b.name, 'nl'),
    );

  async function saveItem(saved: ClothingItem, photo: PhotoChange) {
    if (photo.kind === 'new') await savePhoto(saved.id, photo.blob);
    if (photo.kind === 'remove') await deletePhoto(saved.id);
    const exists = items.some((i) => i.id === saved.id);
    onItemsChange(exists ? items.map((i) => (i.id === saved.id ? saved : i)) : [...items, saved]);
  }

  function handleDelete(item: ClothingItem) {
    onDeleteItem(item);
    setEditing(null);
  }

  function handleArchive(item: ClothingItem) {
    onArchiveItem(item);
    setEditing(null);
  }

  const count = (category: Category) => activeItems.filter((i) => i.category === category).length;
  const queued = queue[0];

  return (
    <section className="view">
      <div className="view-header">
        <h1>Mijn kast</h1>
        <label className={processing ? 'button button--busy' : 'button'}>
          {processing ? 'Foto verwerken…' : '📷 Foto maken'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCameraPhoto}
            disabled={processing}
            hidden
          />
        </label>
      </div>

      <div className="action-row">
        <button className="button button--ghost button--small" onClick={() => setEditing({})}>
          + Zonder foto
        </button>
        <label className="button button--ghost button--small">
          🖼️ Meerdere foto's
          <input type="file" accept="image/*" multiple onChange={handleManyPhotos} disabled={processing} hidden />
        </label>
        <button className="button button--ghost button--small" onClick={() => setBuyCheckOpen(true)}>
          🛍️ Koop-check
        </button>
      </div>
      {photoError && <p className="error">{photoError}</p>}

      <div className="search-field">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zoek op naam, kleur of gelegenheid"
          aria-label="Zoeken in je kast"
        />
        {query && (
          <button className="search-clear" onClick={() => setQuery('')} aria-label="Zoekveld leegmaken">
            ✕
          </button>
        )}
      </div>

      <div className="chips" role="group" aria-label="Filter op categorie">
        <button className={filter === 'alle' ? 'chip chip--active' : 'chip'} onClick={() => setFilter('alle')}>
          Alles <span className="chip-count">{activeItems.length}</span>
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            className={filter === c.value ? 'chip chip--active' : 'chip'}
            onClick={() => setFilter(c.value)}
          >
            {c.label} <span className="chip-count">{count(c.value)}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="empty">
          {activeItems.length === 0
            ? 'Je kast is nog leeg. Maak een foto van je eerste kledingstuk!'
            : words.length > 0
              ? `Niets gevonden voor "${query.trim()}".`
              : 'Niets in deze categorie.'}
        </p>
      ) : (
        <ul className="item-grid">
          {visible.map((item) => {
            return (
              <li key={item.id}>
                <button className="item-card" onClick={() => setEditing({ item })}>
                  <ItemPhoto item={item} />
                  <span className="item-name">{item.name}</span>
                  <span className="item-meta">
                    <span className="color-dot" style={{ background: dotBackground(item) }} />
                    {itemColors(item)
                      .map((c, i) => (i === 0 ? colorInfo(c).label : colorInfo(c).label.toLowerCase()))
                      .join('/')}
                    {item.pattern && item.pattern !== 'effen' && `, ${item.pattern}`} · warmte {item.warmth}
                    {item.waterproof && ' · 💧'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <ItemForm
          item={editing.item}
          initialPhoto={editing.photo}
          initialColor={editing.color}
          initialSource={editing.source}
          initialSecondColor={editing.color2}
          onSave={async (saved, photo) => {
            await saveItem(saved, photo);
            setEditing(null);
          }}
          onDelete={editing.item ? () => handleDelete(editing.item!) : undefined}
          onArchive={editing.item ? () => handleArchive(editing.item!) : undefined}
          onBuildAround={editing.item ? () => onBuildAround(editing.item!) : undefined}
          onCancel={() => setEditing(null)}
        />
      )}

      {!editing && queued && (
        <ItemForm
          key={queueTotal - queue.length}
          initialPhoto={queued.photo}
          initialColor={queued.color}
          initialSource={queued.source}
          initialSecondColor={queued.color2}
          progress={`Foto ${queueTotal - queue.length + 1} van ${queueTotal}`}
          onSave={async (saved, photo) => {
            await saveItem(saved, photo);
            setQueue((q) => q.slice(1));
          }}
          onSkip={() => setQueue((q) => q.slice(1))}
          onCancel={() => setQueue([])}
        />
      )}

      {buyCheckOpen && (
        <BuyCheckSheet
          items={activeItems}
          onClose={() => setBuyCheckOpen(false)}
          onAddToWardrobe={(photo, color) => {
            setBuyCheckOpen(false);
            setEditing({ photo, color });
          }}
        />
      )}
    </section>
  );
}
