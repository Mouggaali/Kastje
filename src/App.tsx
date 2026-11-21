import { useEffect, useMemo, useState } from 'react';
import { InsightsView } from './components/InsightsView';
import { OutfitsView } from './components/OutfitsView';
import { PlanView } from './components/PlanView';
import { TodayView } from './components/TodayView';
import { WardrobeView } from './components/WardrobeView';
import {
  loadItems,
  loadLastBackup,
  loadOccasion,
  loadPlan,
  loadSavedOutfits,
  loadVotes,
  loadWearLog,
  saveItems,
  saveLastBackup,
  saveOccasion,
  savePlan,
  saveSavedOutfits,
  saveVotes,
  saveWearLog,
} from './data/storage';
import type { ClothingItem, Occasion, OutfitVote, PlannedDay, SavedOutfit, WearLogEntry } from './types';
import { useWeather } from './weather/useWeather';

type Tab = 'vandaag' | 'plannen' | 'outfits' | 'kast' | 'inzicht';

/** Na zoveel dagen zonder back-up krijg je op Vandaag een herinnering. */
const BACKUP_REMINDER_DAYS = 14;

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'vandaag', label: 'Vandaag', icon: '☀️' },
  { id: 'plannen', label: 'Plannen', icon: '📅' },
  { id: 'outfits', label: 'Outfits', icon: '👗' },
  { id: 'kast', label: 'Kast', icon: '🧥' },
  { id: 'inzicht', label: 'Inzicht', icon: '📊' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('vandaag');
  const [items, setItems] = useState<ClothingItem[]>(loadItems);
  const [wearLog, setWearLog] = useState<WearLogEntry[]>(loadWearLog);
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>(loadSavedOutfits);
  const [votes, setVotes] = useState<OutfitVote[]>(loadVotes);
  const [plan, setPlan] = useState<PlannedDay[]>(loadPlan);
  const [occasion, setOccasion] = useState<Occasion | null>(loadOccasion);
  // Het stuk waar de outfit omheen gebouwd wordt (📌)
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [lastBackup, setLastBackup] = useState<number | null>(loadLastBackup);
  // Moment waarop de app opende; voor de back-upherinnering (Date.now mag niet tijdens het renderen).
  const [openedAt] = useState(() => Date.now());
  const weather = useWeather();

  // Elke wijziging direct bewaren.
  useEffect(() => saveItems(items), [items]);
  useEffect(() => saveWearLog(wearLog), [wearLog]);
  useEffect(() => saveSavedOutfits(savedOutfits), [savedOutfits]);
  useEffect(() => saveVotes(votes), [votes]);
  useEffect(() => savePlan(plan), [plan]);
  useEffect(() => saveOccasion(occasion), [occasion]);

  // Gearchiveerde kleding doet niet mee in suggesties, outfits en planning.
  // useMemo: alleen een nieuwe lijst als de kast echt verandert, anders zou Vandaag
  // bij elke klik (👍, loggen) een nieuwe outfit uitrekenen.
  const activeItems = useMemo(() => items.filter((i) => !i.archived), [items]);
  const anchor = activeItems.find((i) => i.id === anchorId) ?? null;

  // Herinnering: je hebt eigen kleding ingevoerd, maar al 14 dagen (of nooit) een back-up gemaakt.
  const hasOwnItems = items.some((i) => !i.id.startsWith('voorbeeld-'));
  const backupDue = hasOwnItems && (!lastBackup || openedAt - lastBackup > BACKUP_REMINDER_DAYS * 86_400_000);

  /** "Dit draag ik vandaag": vervangt een eventuele eerdere keuze voor dezelfde dag. */
  function logWear(date: string, itemIds: string[]) {
    setWearLog((log) => [...log.filter((entry) => entry.date !== date), { date, itemIds }]);
  }

  /** "✨ Outfit rond dit stuk": naar Vandaag met dit stuk vastgezet. */
  function buildAround(item: ClothingItem) {
    setAnchorId(item.id);
    setTab('vandaag');
    window.scrollTo(0, 0);
  }

  return (
    <div className="app">
      <main>
        {tab === 'vandaag' && (
          <TodayView
            items={activeItems}
            wearLog={wearLog}
            savedOutfits={savedOutfits}
            votes={votes}
            plan={plan}
            weather={weather}
            occasion={occasion}
            onOccasionChange={setOccasion}
            anchor={anchor}
            onAnchorChange={(item) => setAnchorId(item?.id ?? null)}
            onLogWear={logWear}
            onSaveOutfit={(outfit) => setSavedOutfits((current) => [outfit, ...current])}
            onVote={(vote) => setVotes((current) => [...current, vote])}
            onOpenWardrobe={() => setTab('kast')}
            backupDue={backupDue}
            onOpenInsights={() => setTab('inzicht')}
          />
        )}
        {tab === 'plannen' && (
          <PlanView
            items={activeItems}
            wearLog={wearLog}
            votes={votes}
            occasion={occasion}
            weather={weather}
            plan={plan}
            onPlanChange={setPlan}
            onOpenToday={() => setTab('vandaag')}
          />
        )}
        {tab === 'outfits' && (
          <OutfitsView
            items={activeItems}
            outfits={savedOutfits}
            wearLog={wearLog}
            onOutfitsChange={setSavedOutfits}
            onLogWear={logWear}
          />
        )}
        {tab === 'kast' && <WardrobeView items={items} onItemsChange={setItems} onBuildAround={buildAround} />}
        {tab === 'inzicht' && (
          <InsightsView
            items={items}
            wearLog={wearLog}
            onItemsChange={setItems}
            onBuildAround={buildAround}
            lastBackup={lastBackup}
            onBackupMade={(time) => {
              saveLastBackup(time);
              setLastBackup(time);
            }}
          />
        )}
      </main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'tab tab--active' : 'tab'} onClick={() => setTab(t.id)}>
            <span aria-hidden="true">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
