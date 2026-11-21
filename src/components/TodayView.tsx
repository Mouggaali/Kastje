import { useState } from 'react';
import {
  outfitFromPieces,
  outfitItems,
  resolveSavedOutfit,
  piecesToIds,
  sameOutfit,
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
import { weatherTips } from '../weather/tips';
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
  /** Tijd voor een nieuwe back-up? */
  backupDue: boolean;
  onOpenInsights: () => void;
}

const DAY_LABELS = ['Vandaag', 'Morgen'];


export function TodayView(props: Props) {
  const { items, wearLog, savedOutfits, votes, plan, weather, occasion, onOccasionChange } = props;
  const { anchor, onAnchorChange, onLogWear, onSaveOutfit, onVote, onOpenWardrobe, backupDue, onOpenInsights } = props;
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
  // Het huidige uur, zodat tips voor vandaag niet over uren gaan die al voorbij zijn.
  const nowHour = new Date(weather.checkedAt).getHours();

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
    const pieces = resolveSavedOutfit(planned, items);
    return outfitItems(pieces).length > 0 ? outfitFromPieces(pieces, days![index]) : null;
  }

  // Nieuwe outfits als het weer binnen is, of als kast, gelegenheid, vastgezet stuk of planning verandert.
  // Bewust niet bij het loggen of stemmen, anders verspringt de outfit die je net koos.
  // (Dit is het patroon "state aanpassen als de invoer verandert" uit de React-documentatie:
  // tijdens het renderen vergelijken met de vorige invoer, zonder extra effect.)
  // Bij het weer telt alleen de datum: een verse weersverwachting voor dezelfde dag mag de outfit
  // die je al koos (en misschien logde) niet vervangen. Een nieuwe dag wel.
  const dates = days?.map((d) => d.date).join() ?? '';
  const inputs = { items, dates, occasion, anchor, plan };
  const [lastInputs, setLastInputs] = useState<typeof inputs | null>(null);
  const inputsChanged =
    !lastInputs ||
    (Object.keys(inputs) as (keyof typeof inputs)[]).some((key) => inputs[key] !== lastInputs[key]);
  if (inputsChanged) {
    setLastInputs(inputs);
    if (days) {
      const planned = days.map((_, i) => (showPlanned[i] ? plannedOutfit(i) : null));
      setFromPlan(planned.map((p) => p !== null));
      setOutfits(days.map((_, i) => planned[i] ?? suggest(i)));
    }
    setVoted([]);
    setNoAlternative(false);
  }

  function selectDay(index: number) {
    setDay(index);
    setNoAlternative(false);
  }

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
    // Eén 👍 per outfit; nog eens tikken telt niet dubbel.
    if (value === 1 && voted[day] === 1) return;
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
  const currentIds = piecesToIds(outfit);
  const alreadySaved = savedOutfits.some((saved) => sameOutfit(saved, currentIds));
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
            weather.locateMe();
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

      {weather.status === 'ready' && weather.offline && weather.fetchedAt && (
        <p className="notice">
          📴 Je bent offline. Dit is het weer van{' '}
          {new Date(weather.fetchedAt).toLocaleString('nl-NL', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}.{' '}
          <button className="link-button" onClick={weather.retry}>
            Opnieuw proberen
          </button>
        </p>
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
                onSelect={() => selectDay(index)}
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
          tips={days ? weatherTips(days[day], day === 0 ? nowHour : 0) : []}
          onOpenWardrobe={onOpenWardrobe}
        />
      )}

      {backupDue && (
        <p className="notice">
          💾 Je kast staat alleen op dit apparaat. Maak af en toe een back-up, dan raak je niets kwijt.{' '}
          <button className="link-button" onClick={onOpenInsights}>
            Back-up maken
          </button>
        </p>
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
