import { mainItems, type OutfitPieces } from '../outfit/outfitLogic';
import { categoryInfo, type ClothingItem } from '../types';
import { ItemPhoto } from './ItemPhoto';

interface Props {
  pieces: OutfitPieces;
  /** Als dit er is, kun je op een foto tikken (bijv. om dat stuk vast te zetten). */
  onTileClick?: (item: ClothingItem) => void;
  /** Het vastgezette stuk krijgt een 📌 */
  pinnedId?: string;
  /** Kleinere variant, bijv. in de weekplanner */
  compact?: boolean;
}

/** Een outfit als raster van grote foto's: boven, onder, schoenen en eventueel jas. */
export function OutfitCollage({ pieces, onTileClick, pinnedId, compact = false }: Props) {
  const items = mainItems(pieces);
  const accessories = pieces.accessories ?? [];
  if (items.length === 0 && accessories.length === 0) return null;

  const className = `collage collage--${compact ? 'compact' : Math.min(items.length, 5)}`;
  return (
    <>
      <ul className={className}>
        {items.map((item) => {
          const pinned = item.id === pinnedId;
          const content = (
            <>
              <ItemPhoto item={item} />
              {pinned && (
                <span className="pin" aria-label="Vastgezet">
                  📌
                </span>
              )}
              {!compact && (
                <span className="collage-caption">
                  <span className="item-name">{item.name}</span>
                  <span className="item-meta">{categoryInfo(item.category).label}</span>
                </span>
              )}
            </>
          );
          // Het shirt ónder de trui is niet los vast te zetten: dan zou het de trui vervangen.
          const pinnable = onTileClick && item.id !== pieces.layer?.id;
          return (
            <li key={item.id} className={pinned ? 'collage-tile collage-tile--pinned' : 'collage-tile'}>
              {pinnable ? (
                <button
                  type="button"
                  className="collage-button"
                  onClick={() => onTileClick(item)}
                  aria-pressed={pinned}
                  title={pinned ? 'Losmaken' : 'Vastzetten en de rest eromheen kiezen'}
                >
                  {content}
                </button>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
      {accessories.length > 0 && (
        <ul className={compact ? 'accessory-row accessory-row--compact' : 'accessory-row'} aria-label="Accessoires">
          {accessories.map((item) => (
            <li key={item.id} title={item.name}>
              <ItemPhoto item={item} small />
              {!compact && <span className="accessory-name">{item.name}</span>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
