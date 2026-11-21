import { useEffect, useState, type CSSProperties } from 'react';
import { getPhoto } from '../data/photos';
import { colorInfo } from '../outfit/colors';
import { categoryInfo, type ClothingItem } from '../types';

/** Toont de foto van een kledingstuk, of een gekleurd vlak met icoon als er geen foto is. */
export function ItemPhoto({ item, small = false }: { item: ClothingItem; small?: boolean }) {
  // Elke versie van de foto heeft een eigen sleutel; zo tonen we nooit een oude foto bij een nieuw stuk.
  const key = `${item.id}:${item.updatedAt}`;
  const [loaded, setLoaded] = useState<{ key: string; url: string } | null>(null);

  useEffect(() => {
    if (!item.hasPhoto) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    getPhoto(item.id)
      .then((blob) => {
        if (cancelled || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setLoaded({ key, url: objectUrl });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.id, item.hasPhoto, key]);

  const url = item.hasPhoto && loaded?.key === key ? loaded.url : null;
  const className = small ? 'item-photo item-photo--small' : 'item-photo';
  if (url) return <img className={className} src={url} alt={item.name} />;

  return (
    <div
      className={`${className} item-photo--placeholder`}
      style={{ '--swatch': colorInfo(item.color).hex } as CSSProperties}
      aria-hidden="true"
    >
      <span>{categoryInfo(item.category).icon}</span>
    </div>
  );
}
