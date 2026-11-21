import { useEffect, useMemo, useState } from 'react';
import { InsightsView } from './components/InsightsView';
import { OutfitsView } from './components/OutfitsView';
import { PlanView } from './components/PlanView';
import { Toast, useUndo } from './components/Toast';
import { TodayView } from './components/TodayView';
import { WardrobeView } from './components/WardrobeView';
import { cleanupOrphanPhotos, deletePhoto } from './data/photos';
import {
  loadItems,
  loadLastBackup,
  loadOccasion,
  loadPlan,
  loadSavedOutfits,
  loadTrip,
  loadVotes,
  loadWearLog,
  saveItems,
  saveLastBackup,
  saveOccasion,
  savePlan,
  saveSavedOutfits,
  saveTrip,
  saveVotes,
  saveWearLog,
} from './data/storage';
import type { ClothingItem, Occasion, OutfitVote, PlannedDay, SavedOutfit, Trip, WearLogEntry } from './types';
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
  const [trip, setTrip] = useState<Trip | null>(loadTrip);
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
  useEffect(() => saveTrip(trip), [trip]);

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

  // ---------- Verwijderen en archiveren, met "Ongedaan maken" ----------

  const { toast, showUndo, dismiss } = useUndo();

  // Opruimen: foto's van kledingstukken die niet meer bestaan (bijv. na het sluiten tijdens "Ongedaan maken").
  useEffect(() => {
    cleanupOrphanPhotos(loadItems().map((i) => i.id)).catch(() => {});
  }, []);

  function deleteItem(item: ClothingItem) {
    setItems((current) => current.filter((i) => i.id !== item.id));
    showUndo(
      `"${item.name}" verwijderd`,
      () => setItems((current) => [...current, item]),
      // Pas definitief wissen als het stuk echt weg is. (Is er intussen een back-up teruggezet
      // waarin het stuk wél zit, dan laten we de foto staan.)
      () => {
        if (!loadItems().some((i) => i.id === item.id)) deletePhoto(item.id).catch(() => {});
      },
    );
  }

  function setArchived(item: ClothingItem, archived: boolean) {
    const update = (value: boolean) =>
      setItems((current) => current.map((i) => (i.id === item.id ? { ...i, archived: value } : i)));
    update(archived);
    showUndo(`"${item.name}" ${archived ? 'gearchiveerd' : 'teruggezet'}`, () => update(!archived));
  }

  function deleteOutfit(outfit: SavedOutfit) {
    setSavedOutfits((current) => current.filter((o) => o.id !== outfit.id));
    showUndo(`Outfit "${outfit.name}" verwijderd`, () => setSavedOutfits((current) => [outfit, ...current]));
  }

  /** Een dag uit het draagdagboek wissen (met "Ongedaan maken"). */
  function removeLog(date: string) {
    const entry = wearLog.find((e) => e.date === date);
    if (!entry) return;
    setWearLog((log) => log.filter((e) => e.date !== date));
    showUndo('Dag gewist uit je dagboek', () => setWearLog((log) => [...log.filter((e) => e.date !== date), entry]));
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
        {/* Vandaag blijft altijd bestaan (alleen verborgen), zodat de gekozen en gelogde outfit
            niet verdwijnt als je even naar een ander tabblad gaat. */}
        <div hidden={tab !== 'vandaag'} data-tab="vandaag">
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
        </div>
        {tab === 'plannen' && (
          <PlanView
            items={activeItems}
            wearLog={wearLog}
            votes={votes}
            occasion={occasion}
            weather={weather}
            plan={plan}
            onPlanChange={setPlan}
            trip={trip}
            onTripChange={setTrip}
            onOpenToday={() => setTab('vandaag')}
          />
        )}
        {tab === 'outfits' && (
          <OutfitsView
            items={activeItems}
            outfits={savedOutfits}
            wearLog={wearLog}
            onOutfitsChange={setSavedOutfits}
            onDeleteOutfit={deleteOutfit}
            onLogWear={logWear}
          />
        )}
        {tab === 'kast' && (
          <WardrobeView
            items={items}
            onItemsChange={setItems}
            onDeleteItem={deleteItem}
            onArchiveItem={(item) => setArchived(item, true)}
            onBuildAround={buildAround}
          />
        )}
        {tab === 'inzicht' && (
          <InsightsView
            items={items}
            wearLog={wearLog}
            onArchiveChange={setArchived}
            onBuildAround={buildAround}
            lastBackup={lastBackup}
            onLogWear={logWear}
            onRemoveLog={removeLog}
            onBackupMade={(time) => {
              saveLastBackup(time);
              setLastBackup(time);
            }}
          />
        )}
      </main>

      <Toast toast={toast} onClose={dismiss} />

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
