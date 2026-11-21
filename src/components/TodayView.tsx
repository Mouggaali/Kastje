import { useEffect, useState } from 'react';
import {
  outfitFromPieces,
  outfitItems,
  resolveSavedOutfit,
  SLOTS,
  suggestOutfit,
  type Outfit,
} from '../outfit/outfitLogic';
import {
  OCCASIONS,
  type ClothingItem,
  type Occasion,
  type OutfitVote,
  type PlannedDay,
  type SavedOutfit,
  type WearLogEntry,
} from '../types';
import type { WeatherState } from '../weather/useWeather';
import { LocationPicker } from './LocationPicker';
import { OutfitBuilder } from './OutfitBuilder';
import { OutfitCard } from './OutfitCard';
import { WeatherCard } from './WeatherCard';

interface Props {
  items: ClothingItem[];
  wearLog: WearLogEntry[];
  savedOutfits: SavedOutfit[];
  votes: OutfitVote[];
  plan: PlannedDay[];
  weather: WeatherState;
  occasion: Occasion | null;
  onOccasionChange: (occasion: Occasion | null) => void;
  anchor: ClothingItem | null;
  onAnchorChange: (item: ClothingItem | null) => void;
  onLogWear: (date: string, itemIds: string[]) => void;
  onSaveOutfit: (outfit: SavedOutfit) => void;
  onVote: (vote: OutfitVote) => void;
  onOpenWardrobe: () => void;
}

const DAY_LABELS = ['Vandaag', 'Morgen'];

/** Outfit → de ids per onderdeel, zoals een bewaarde outfit ze opslaat. */
function slotIds(outfit: Outfit | undefined): Partial<SavedOutfit> {
  const ids: Partial<SavedOutfit> = {};
  for (const slot of SLOTS) if (outfit?.[slot]) ids[slot] = outfit[slot]!.id;
  return ids;
}

export function TodayView(props: Props) {
  const { items, wearLog, savedOutfits, votes, plan, weather, occasion, onOccasionChange } = props;
  const { anchor, onAnchorChange, onLogWear, onSaveOutfit, onVote, onOpenWardrobe } = props;
  const days = weather.days?.slice(0, 2) ?? null;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [day, setDay] = useState(0);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  // Per dag: komt de getoonde outfit uit de weekplanner?
  const [fromPlan, setFromPlan] = useState<boolean[]>([]);
  // Per dag: tonen we de geplande outfit (true) of suggesties (false)?
  const [showPlanned, setShowPlanned] = useState([true, true]);
  const [voted, setVoted] = useState<(1 | -1 | undefined)[]>([]);
  const [noAlternative, setNoAlternative] = useState(false);
  const [keeping, setKeeping] = useState(false);

  const plannedFor = (index: number) => days && plan.find((p) => p.date === days[index].date);

  function suggest(index: number, extra: { avoid?: Outfit; votes?: OutfitVote[]; log?: WearLogEntry[] } = {}) {
    const w = days![index];
    return suggestOutfit({
      items,
      weather: w,
      wearLog: extra.log ?? wearLog,
      date: w.date,
      occasion,
      anchor,
      votes: extra.votes ?? votes,
      avoid: extra.avoid,
    });
  }

  /** De geplande outfit voor die dag (tenzij er een stuk is vastgezet), anders niets. */
  function plannedOutfit(index: number): Outfit | null {
    const planned = plannedFor(index);
    if (!planned || anchor) return null;
    const pieces = resolveSavedOutfit({ id: '', name: '', createdAt: 0, ...planned }, items);
    return outfitItems(pieces).length > 0 ? outfitFromPieces(pieces, days![index]) : null;
  }

  // Nieuwe outfits als het weer binnen is, of als kast, gelegenheid, vastgezet stuk of planning verandert.
  // (Bewust niet bij het loggen of stemmen, anders verspringt de outfit die je net koos.)
  useEffect(() => {
    if (!days) return;
    const planned = days.map((_, i) => (showPlanned[i] ? plannedOutfit(i) : null));
    setFromPlan(planned.map((p) => p !== null));
    setOutfits(days.map((_, i) => planned[i] ?? suggest(i)));
    setVoted([]);
    setNoAlternative(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, weather.days, occasion, anchor, plan]);

  useEffect(() => setNoAlternative(false), [day]);

  const outfit = outfits[day];
  const isPlanned = fromPlan[day] ?? false;

  function replaceOutfit(index: number, next: Outfit) {
    setOutfits((current) => current.map((o, i) => (i === index ? next : o)));
    setFromPlan((current) => current.map((p, i) => (i === index ? false : p)));
    setVoted((current) => current.map((v, i) => (i === index ? undefined : v)));
  }

  function anotherSuggestion() {
    if (!days || !outfit) return;
    setShowPlanned((current) => current.map((v, i) => (i === day ? false : v)));
    const next = suggest(day, { avoid: outfit });
    const ids = (o: Outfit) => outfitItems(o).map((i) => i.id).join();
    setNoAlternative(ids(next) === ids(outfit));
    replaceOutfit(day, next);
  }

  function vote(value: 1 | -1) {
    if (!days || !outfit) return;
    const entry: OutfitVote = { itemIds: outfitItems(outfit).map((i) => i.id), vote: value, date: days[day].date };
    onVote(entry);
    if (value === 1) {
      setVoted((current) => {
        const copy = [...current];
        copy[day] = 1;
        return copy;
      });
    } else {
      // 👎 = meteen iets anders laten zien, rekening houdend met deze stem.
      replaceOutfit(day, suggest(day, { avoid: outfit, votes: [...votes, entry] }));
    }
  }

  /** Logt de outfit van vandaag en past de suggestie voor morgen daarop aan. */
  function wearToday(date: string, itemIds: string[]) {
    onLogWear(date, itemIds);
    if (!days?.[1] || fromPlan[1]) return;
    const log = [...wearLog.filter((entry) => entry.date !== date), { date, itemIds }];
    replaceOutfit(1, suggest(1, { log }));
  }

  const todayDate = days?.[0]?.date;
  const loggedToday = wearLog.find((entry) => entry.date === todayDate);
  const todayIds = outfitItems(outfits[0]).map((i) => i.id);
  const wornToday = !!loggedToday && loggedToday.itemIds.join() === todayIds.join();
  const currentIds = slotIds(outfit);
  const alreadySaved = savedOutfits.some((saved) => SLOTS.every((slot) => saved[slot] === currentIds[slot]));
  const showPicker = pickerOpen || weather.status === 'needs-place';

  return (
    <section className="view">
      <div className="view-header">
        <h1>{DAY_LABELS[day]}</h1>
        {weather.place && !showPicker && (
          <button className="place-button" onClick={() => setPickerOpen(true)}>
            📍 {weather.place.name} <span className="link">wijzig</span>
          </button>
        )}
      </div>

      {showPicker && (
        <LocationPicker
          message={weather.message}
          onPick={(place) => {
            weather.choosePlace(place);
            setPickerOpen(false);
          }}
          onUseMyLocation={() => {
            weather.useMyLocation();
            setPickerOpen(false);
          }}
          onCancel={weather.place ? () => setPickerOpen(false) : undefined}
        />
      )}

      {weather.status === 'locating' && !showPicker && <p className="muted">Locatie bepalen…</p>}
      {weather.status === 'loading' && <p className="muted">Weer ophalen…</p>}
      {weather.status === 'error' && (
        <div className="card">
          <p className="error">{weather.message}</p>
          <button className="button" onClick={weather.retry}>
            Opnieuw proberen
          </button>
        </div>
      )}

      {weather.status === 'ready' && days && (
        <>
          <div className="weather-row">
            {days.map((w, index) => (
              <WeatherCard
                key={w.date}
                label={DAY_LABELS[index]}
                weather={w}
                selected={day === index}
                onSelect={() => setDay(index)}
              />
            ))}
          </div>

          <div className="chip-row occasion-row" role="group" aria-label="Gelegenheid">
            <button
              className={occasion === null ? 'chip chip--active' : 'chip'}
              onClick={() => onOccasionChange(null)}
            >
              Alles
            </button>
            {OCCASIONS.map((o) => (
              <button
                key={o.value}
                className={occasion === o.value ? 'chip chip--active' : 'chip'}
                onClick={() => onOccasionChange(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>

          {anchor && (
            <div className="anchor-chip">
              📌 Rond: <strong>{anchor.name}</strong>
              <button className="link-button" onClick={() => onAnchorChange(null)}>
                losmaken
              </button>
            </div>
          )}
        </>
      )}

      {weather.status === 'ready' && outfit && (
        <OutfitCard
          title={day === 0 ? 'Outfit voor vandaag' : 'Outfit voor morgen'}
          outfit={outfit}
          planned={isPlanned}
          onAnother={anotherSuggestion}
          onWear={day === 0 && todayDate ? () => wearToday(todayDate, todayIds) : undefined}
          worn={wornToday}
          noAlternative={noAlternative}
          onKeep={() => setKeeping(true)}
          saved={alreadySaved}
          onVote={isPlanned ? undefined : vote}
          voted={voted[day]}
          onPin={(item) => onAnchorChange(item.id === anchor?.id ? null : item)}
          pinnedId={anchor?.id}
          onOpenWardrobe={onOpenWardrobe}
        />
      )}

      {keeping && (
        <OutfitBuilder
          items={items}
          initial={currentIds}
          defaultName={`Outfit ${savedOutfits.length + 1}`}
          onSave={(saved) => {
            onSaveOutfit(saved);
            setKeeping(false);
          }}
          onCancel={() => setKeeping(false)}
        />
      )}
    </section>
  );
}
