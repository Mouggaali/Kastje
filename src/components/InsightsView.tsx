import { toDateString } from '../outfit/outfitLogic';
import { colorBreakdown, costPerWear, mostWorn, sleepers, SLEEPER_DAYS, wearStats } from '../outfit/stats';
import type { ClothingItem, WearLogEntry } from '../types';
import { ItemPhoto } from './ItemPhoto';

interface Props {
  /** Alle kleding, ook gearchiveerde */
  items: ClothingItem[];
  wearLog: WearLogEntry[];
  onItemsChange: (items: ClothingItem[]) => void;
  onBuildAround: (item: ClothingItem) => void;
}

const euro = (value: number) =>
  value.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });

function daysAgo(date: string, today: string): string {
  const days = Math.round((new Date(`${today}T12:00:00`).getTime() - new Date(`${date}T12:00:00`).getTime()) / 86_400_000);
  return days === 0 ? 'vandaag' : days === 1 ? 'gisteren' : `${days} dagen geleden`;
}

/** Inzicht in je kast: wat draag je echt, wat slaapt, en wat kun je opruimen. */
export function InsightsView({ items, wearLog, onItemsChange, onBuildAround }: Props) {
  const today = toDateString(new Date());
  const active = items.filter((i) => !i.archived);
  const archived = items.filter((i) => i.archived);
  const stats = wearStats(active, wearLog);
  const top = mostWorn(stats);
  const sleeping = sleepers(stats, today);
  const colors = colorBreakdown(active);
  const costs = costPerWear(stats);
  const wornOnce = stats.filter((s) => s.count > 0).length;
  const wornLast30 = new Set(
    wearLog.filter((e) => e.date > toDateString(new Date(Date.now() - 30 * 86_400_000))).flatMap((e) => e.itemIds),
  );

  function setArchived(item: ClothingItem, archivedValue: boolean) {
    onItemsChange(items.map((i) => (i.id === item.id ? { ...i, archived: archivedValue } : i)));
  }

  return (
    <section className="view">
      <div className="view-header">
        <h1>Inzicht</h1>
      </div>

      <div className="stat-row">
        <div className="stat">
          <strong>{active.length}</strong>
          <span>stuks in je kast</span>
        </div>
        <div className="stat">
          <strong>{active.length ? Math.round((wornLast30.size / active.length) * 100) : 0}%</strong>
          <span>gedragen in 30 dagen</span>
        </div>
        <div className="stat">
          <strong>{wearLog.length}</strong>
          <span>dagen gelogd</span>
        </div>
      </div>

      {wearLog.length === 0 && (
        <p className="notice">
          Tik elke ochtend op <strong>Dit draag ik vandaag</strong>. Dan zie je hier wat je echt draagt en wat al lang in
          de kast ligt.
        </p>
      )}

      {top.length > 0 && (
        <article className="card">
          <h2>Meest gedragen</h2>
          <ul className="rank-list">
            {top.map(({ item, count }) => (
              <li key={item.id}>
                <ItemPhoto item={item} small />
                <span className="rank-text">
                  <span className="item-name">{item.name}</span>
                  <span className="item-meta">{count}× gedragen</span>
                </span>
              </li>
            ))}
          </ul>
        </article>
      )}

      <article className="card">
        <h2>Slapers 💤</h2>
        <p className="muted">
          Al {SLEEPER_DAYS}+ dagen (of nog nooit) gedragen. Geef ze een kans, of ruim ze op.
          {wornOnce === 0 && ' Zolang je nog niets hebt gelogd, telt alles als slaper.'}
        </p>
        {sleeping.length === 0 ? (
          <p className="hint">Geen slapers: je draagt je hele kast. Knap!</p>
        ) : (
          <ul className="rank-list">
            {sleeping.map(({ item, lastWorn }) => (
              <li key={item.id}>
                <ItemPhoto item={item} small />
                <span className="rank-text">
                  <span className="item-name">{item.name}</span>
                  <span className="item-meta">{lastWorn ? `Laatst ${daysAgo(lastWorn, today)}` : 'Nog nooit gedragen'}</span>
                </span>
                <span className="rank-actions">
                  <button className="button button--secondary button--small" onClick={() => onBuildAround(item)}>
                    ✨ Draag dit
                  </button>
                  <button className="button button--ghost button--small" onClick={() => setArchived(item, true)}>
                    Archiveren
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </article>

      {colors.length > 0 && (
        <article className="card">
          <h2>Jouw kleuren</h2>
          <div className="color-bar" role="img" aria-label="Kleurverdeling van je kast">
            {colors.map(({ color, count }) => (
              <span
                key={color.id}
                style={{ background: color.hex, flexGrow: count }}
                title={`${color.label}: ${count}`}
              />
            ))}
          </div>
          <ul className="color-legend">
            {colors.map(({ color, count }) => (
              <li key={color.id}>
                <span className="color-dot" style={{ background: color.hex }} />
                {color.label} <span className="muted">{count}</span>
              </li>
            ))}
          </ul>
        </article>
      )}

      <article className="card">
        <h2>Prijs per keer dragen</h2>
        {costs.length === 0 ? (
          <p className="hint">Vul bij een kledingstuk de prijs in om te zien wat het je per keer dragen kost.</p>
        ) : (
          <ul className="rank-list">
            {costs.map(({ item, price, count, perWear }) => (
              <li key={item.id}>
                <ItemPhoto item={item} small />
                <span className="rank-text">
                  <span className="item-name">{item.name}</span>
                  <span className="item-meta">
                    {euro(price)} · {count}× gedragen
                  </span>
                </span>
                <strong className="rank-value">{euro(perWear)}</strong>
              </li>
            ))}
          </ul>
        )}
      </article>

      {archived.length > 0 && (
        <article className="card">
          <h2>Gearchiveerd</h2>
          <p className="muted">Opgeruimd, maar niet weg. Deze stukken doen niet mee in suggesties.</p>
          <ul className="rank-list">
            {archived.map((item) => (
              <li key={item.id}>
                <ItemPhoto item={item} small />
                <span className="rank-text">
                  <span className="item-name">{item.name}</span>
                </span>
                <button className="button button--ghost button--small" onClick={() => setArchived(item, false)}>
                  Terugzetten
                </button>
              </li>
            ))}
          </ul>
        </article>
      )}
    </section>
  );
}
