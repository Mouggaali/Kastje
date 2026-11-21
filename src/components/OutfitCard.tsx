import { outfitItems, type Outfit } from '../outfit/outfitLogic';
import type { ClothingItem } from '../types';
import { HarmonyBadge } from './HarmonyBadge';
import { OutfitCollage } from './OutfitCollage';

interface Props {
  title: string;
  outfit: Outfit;
  /** Komt dit uit de weekplanner? */
  planned: boolean;
  onAnother: () => void;
  /** Alleen voor vandaag: logt de outfit als gedragen. */
  onWear?: () => void;
  worn: boolean;
  /** true als "Andere suggestie" niets nieuws kon vinden */
  noAlternative: boolean;
  /** Opent de outfitbouwer met deze suggestie, om aan te passen en te bewaren. */
  onKeep: () => void;
  /** true als precies deze combinatie al bij je outfits staat */
  saved: boolean;
  /** 👍 of 👎 (alleen bij suggesties, niet bij een geplande outfit) */
  onVote?: (vote: 1 | -1) => void;
  voted?: 1 | -1;
  /** Tik op een foto om dat stuk vast te zetten */
  onPin: (item: ClothingItem) => void;
  pinnedId?: string;
  onOpenWardrobe: () => void;
}

export function OutfitCard(props: Props) {
  const { title, outfit, planned, onAnother, onWear, worn, noAlternative, onKeep, saved } = props;
  const { onVote, voted, onPin, pinnedId, onOpenWardrobe } = props;
  const hasPieces = outfitItems(outfit).length > 0;

  return (
    <article className="card outfit-card">
      <div className="card-title-row">
        <h2>{title}</h2>
        {hasPieces && (
          <button className="keep-button" onClick={onKeep} disabled={saved} aria-label="Outfit bewaren">
            {saved ? '♥ Bewaard' : '♡ Bewaren'}
          </button>
        )}
      </div>

      {planned && <p className="badge badge--planned">📅 Dit had je gepland</p>}
      <p className="explanation">{outfit.explanation}</p>
      {hasPieces && <HarmonyBadge harmony={outfit.harmony} />}

      <OutfitCollage pieces={outfit} onTileClick={onPin} pinnedId={pinnedId} />
      {hasPieces && !pinnedId && <p className="hint">Tip: tik op een foto om dat stuk vast te zetten.</p>}

      {noAlternative && (
        <p className="notice">Dit is de enige combinatie die nu goed past. Voeg meer kleding toe voor meer variatie.</p>
      )}

      {outfit.missing.length > 0 && (
        <p className="notice">
          Ik mis nog: {outfit.missing.join(', ')}.{' '}
          <button className="link-button" onClick={onOpenWardrobe}>
            Voeg toe in je kast
          </button>
        </p>
      )}

      {hasPieces && (
        <>
          {onVote && (
            <div className="vote-row">
              <span className="muted">{voted ? 'Bedankt, ik onthoud het!' : 'Wat vind je ervan?'}</span>
              <button
                className={voted === 1 ? 'vote vote--active' : 'vote'}
                onClick={() => onVote(1)}
                aria-label="Goede combinatie"
                aria-pressed={voted === 1}
              >
                👍
              </button>
              <button className="vote" onClick={() => onVote(-1)} aria-label="Geen goede combinatie, geef een andere">
                👎
              </button>
            </div>
          )}
          <div className="row">
            <button className="button button--secondary" onClick={onAnother}>
              ↻ {planned ? 'Toch een suggestie' : 'Andere suggestie'}
            </button>
            {onWear && (
              <button className="button" onClick={onWear} disabled={worn}>
                {worn ? '✓ Gelogd voor vandaag' : 'Dit draag ik vandaag'}
              </button>
            )}
          </div>
        </>
      )}
    </article>
  );
}
