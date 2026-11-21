import { useState } from 'react';
import { outfitItems, resolveSavedOutfit, SLOTS, suggestOutfit } from '../outfit/outfitLogic';
import type { ClothingItem, DayWeather, Occasion, OutfitVote, PlannedDay, SavedOutfit, WearLogEntry } from '../types';
import { describeWeather } from '../weather/openMeteo';
import type { WeatherState } from '../weather/useWeather';
import { OutfitBuilder } from './OutfitBuilder';
import { OutfitCollage } from './OutfitCollage';

interface Props {
  items: ClothingItem[];
  wearLog: WearLogEntry[];
  votes: OutfitVote[];
  occasion: Occasion | null;
  weather: WeatherState;
  plan: PlannedDay[];
  onPlanChange: (plan: PlannedDay[]) => void;
  onOpenToday: () => void;
}

/** "Vandaag", "Morgen", of bijv. "dinsdag 24 nov." */
export function dayLabel(date: string, index: number): string {
  if (index === 0) return 'Vandaag';
  if (index === 1) return 'Morgen';
  return new Date(`${date}T12:00:00`).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'short' });
}

function weatherLine(w: DayWeather): string {
  const { icon, label } = describeWeather(w.weatherCode);
  return `${icon} ${w.feelsLike}° · ${label.toLowerCase()} · 💧 ${w.rainChance}%`;
}

/** Plan je outfits voor de komende week, met het weerbericht erbij. */
export function PlanView({ items, wearLog, votes, occasion, weather, plan, onPlanChange, onOpenToday }: Props) {
  const [editing, setEditing] = useState<{ day: DayWeather; index: number } | null>(null);

  if (!weather.days) {
    return (
      <section className="view">
        <div className="view-header">
          <h1>Plannen</h1>
        </div>
        <p className="empty">
          {weather.status === 'loading' || weather.status === 'locating'
            ? 'Weer ophalen…'
            : 'Kies eerst je locatie op het scherm Vandaag, dan zie je hier het weer voor de hele week.'}
        </p>
        {weather.status !== 'loading' && weather.status !== 'locating' && (
          <button className="button" onClick={onOpenToday}>
            Naar Vandaag
          </button>
        )}
      </section>
    );
  }

  /** Startpunt voor de bouwer: wat er al gepland is, of anders een suggestie voor het weer van die dag. */
  function initialFor(day: DayWeather): Partial<SavedOutfit> {
    const planned = plan.find((p) => p.date === day.date);
    if (planned) return planned;
    const suggestion = suggestOutfit({ items, weather: day, wearLog, date: day.date, occasion, votes });
    const ids: Partial<SavedOutfit> = {};
    for (const slot of SLOTS) if (suggestion[slot]) ids[slot] = suggestion[slot]!.id;
    return ids;
  }

  function savePlanned(date: string, outfit: SavedOutfit) {
    const entry: PlannedDay = { date };
    for (const slot of SLOTS) if (outfit[slot]) entry[slot] = outfit[slot];
    onPlanChange([...plan.filter((p) => p.date !== date), entry].sort((a, b) => a.date.localeCompare(b.date)));
    setEditing(null);
  }

  return (
    <section className="view">
      <div className="view-header">
        <h1>Plannen</h1>
      </div>
      <p className="muted">Plan je outfits voor de komende week. Ik stel per dag iets voor dat bij het weer past.</p>

      <ul className="plan-list">
        {weather.days.map((day, index) => {
          const planned = plan.find((p) => p.date === day.date);
          const pieces = planned ? resolveSavedOutfit({ id: '', name: '', createdAt: 0, ...planned }, items) : {};
          const hasPieces = outfitItems(pieces).length > 0;
          return (
            <li key={day.date} className="card plan-day">
              <div className="plan-day-head">
                <div>
                  <h2>{dayLabel(day.date, index)}</h2>
                  <span className="muted">{weatherLine(day)}</span>
                </div>
                <button
                  className={hasPieces ? 'button button--secondary button--small' : 'button button--small'}
                  onClick={() => setEditing({ day, index })}
                >
                  {hasPieces ? 'Wijzig' : 'Plan'}
                </button>
              </div>
              {hasPieces ? (
                <OutfitCollage pieces={pieces} compact />
              ) : (
                <p className="hint">Nog niets gepland.</p>
              )}
            </li>
          );
        })}
      </ul>

      {editing && (
        <OutfitBuilder
          items={items}
          initial={initialFor(editing.day)}
          defaultName=""
          hideName
          title={`Plan voor ${dayLabel(editing.day.date, editing.index).toLowerCase()}`}
          subtitle={weatherLine(editing.day)}
          onClear={
            plan.some((p) => p.date === editing.day.date)
              ? () => {
                  onPlanChange(plan.filter((p) => p.date !== editing.day.date));
                  setEditing(null);
                }
              : undefined
          }
          onSave={(outfit) => savePlanned(editing.day.date, outfit)}
          onCancel={() => setEditing(null)}
        />
      )}
    </section>
  );
}
