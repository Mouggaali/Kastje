// @vitest-environment jsdom
/**
 * Tests van de schermen zelf: de app wordt echt getekend in een nagebootste browser (jsdom),
 * en we klikken en typen zoals een gebruiker. Weer en foto-opslag zijn nagemaakt.
 */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import type { ClothingItem } from './types';
import { fakeHourly, fakeWeatherFetch } from './test/fakeWeather';

// Foto's staan normaal in IndexedDB; in de test houden we alleen bij wat er gebeurt.
const photos = vi.hoisted(() => ({
  getPhoto: vi.fn(async () => undefined),
  savePhoto: vi.fn(async () => {}),
  deletePhoto: vi.fn(async () => {}),
  getAllPhotos: vi.fn(async () => []),
  clearPhotos: vi.fn(async () => {}),
  cleanupOrphanPhotos: vi.fn(async () => {}),
}));
vi.mock('./data/photos', () => photos);

const item = (id: string, name: string, category: ClothingItem['category'], color: string, warmth: ClothingItem['warmth']) =>
  ({ id, name, category, color, warmth, occasions: ['casual'], waterproof: false, hasPhoto: false, updatedAt: 1 }) as ClothingItem;

const closet = [
  item('grijs', 'Grijze trui', 'trui', 'grijs', 4),
  item('navy', 'Navy trui', 'trui', 'navy', 4),
  item('jeans', 'Blauwe jeans', 'broek', 'denim', 3),
  item('sneakers', 'Witte sneakers', 'schoenen', 'wit', 3),
];

function openTab(name: string) {
  fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name }));
}

/** Namen van kledingstukken in het zichtbare tabblad (Vandaag blijft verborgen op de pagina staan). */
const cardNames = () =>
  screen
    .queryAllByText((_, el) => el?.classList.contains('item-name') ?? false)
    .filter((el) => !el.closest('[hidden]'))
    .map((el) => el.textContent);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('kastje.place', JSON.stringify({ name: 'Utrecht', latitude: 52.09, longitude: 5.12 }));
  localStorage.setItem('kastje.items', JSON.stringify(closet));
  vi.stubGlobal('fetch', vi.fn(fakeWeatherFetch(fakeHourly(7, 6))));
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('Kast', () => {
  it('zoekt op naam en kleur', () => {
    render(<App />);
    openTab('Kast');
    const search = screen.getByLabelText('Zoeken in je kast');

    fireEvent.change(search, { target: { value: 'navy' } });
    expect(cardNames()).toEqual(['Navy trui']);

    fireEvent.change(search, { target: { value: 'trui grijs' } });
    expect(cardNames()).toEqual(['Grijze trui']);

    fireEvent.change(search, { target: { value: 'paars' } });
    expect(screen.getByText('Niets gevonden voor "paars".')).toBeTruthy();
  });

  it('verwijderen kan ongedaan worden gemaakt, en pas daarna gaat de foto echt weg', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    render(<App />);
    openTab('Kast');

    fireEvent.click(screen.getByText('Witte sneakers'));
    fireEvent.click(screen.getByRole('button', { name: 'Verwijderen' }));
    expect(cardNames()).not.toContain('Witte sneakers');
    expect(screen.getByRole('status').textContent).toContain('"Witte sneakers" verwijderd');

    fireEvent.click(screen.getByRole('button', { name: 'Ongedaan maken' }));
    expect(cardNames()).toContain('Witte sneakers');
    expect(photos.deletePhoto).not.toHaveBeenCalled();

    // Nog eens verwijderen en de 6 seconden laten verlopen: nu wordt de foto gewist.
    fireEvent.click(screen.getByText('Witte sneakers'));
    fireEvent.click(screen.getByRole('button', { name: 'Verwijderen' }));
    act(() => vi.advanceTimersByTime(6000));
    expect(photos.deletePhoto).toHaveBeenCalledWith('sneakers');
    expect(JSON.parse(localStorage.getItem('kastje.items')!).map((i: ClothingItem) => i.id)).not.toContain('sneakers');
  });
});

describe('Draagdagboek', () => {
  it('een vergeten dag toevoegen, wijzigen, wissen en weer terughalen', () => {
    render(<App />);
    openTab('Inzicht');
    const log = () => JSON.parse(localStorage.getItem('kastje.wearLog') ?? '[]') as { date: string; itemIds: string[] }[];

    // Gisteren aanklikken (in de huidige maand, of via ‹ als vandaag de 1e is)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (yesterday.getMonth() !== new Date().getMonth()) fireEvent.click(screen.getByRole('button', { name: 'Vorige maand' }));
    const label = yesterday.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(screen.getByText(`Niets gelogd op ${label}`)).toBeTruthy();

    // Toevoegen: grijze trui + jeans
    fireEvent.click(screen.getByRole('button', { name: 'Toevoegen' }));
    fireEvent.click(screen.getByRole('button', { name: /Grijze trui/ }));
    fireEvent.click(screen.getByRole('button', { name: /Blauwe jeans/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }));
    expect(log()).toHaveLength(1);
    expect(log()[0].itemIds).toEqual(['grijs', 'jeans']);

    // Wijzigen: sneakers erbij
    fireEvent.click(screen.getByRole('button', { name: `${label}, gelogd` }));
    fireEvent.click(screen.getByRole('button', { name: 'Wijzigen' }));
    fireEvent.click(screen.getByRole('button', { name: /Witte sneakers/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }));
    expect(log()[0].itemIds).toEqual(['grijs', 'jeans', 'sneakers']);

    // Wissen en ongedaan maken
    fireEvent.click(screen.getByRole('button', { name: `${label}, gelogd` }));
    fireEvent.click(screen.getByRole('button', { name: 'Wissen' }));
    expect(log()).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Ongedaan maken' }));
    expect(log()[0].itemIds).toEqual(['grijs', 'jeans', 'sneakers']);
  });
});

describe('Vandaag', () => {
  it('toont een outfit met harmoniescore voor het weer', async () => {
    render(<App />);
    expect(await screen.findByText('Outfit voor vandaag')).toBeTruthy();
    expect(screen.getByText(/Het is 6 °C en droog/)).toBeTruthy();
    expect(document.querySelector('.badge--harmony')?.textContent).toMatch(/^\d+ · /);
  });

  it('👎 onthoudt de stem en laat meteen een andere trui zien', async () => {
    render(<App />);
    await screen.findByText('Outfit voor vandaag');
    const topBefore = cardNames().find((n) => n?.includes('trui'));

    fireEvent.click(screen.getByRole('button', { name: /Geen goede combinatie/ }));

    const topAfter = cardNames().find((n) => n?.includes('trui'));
    expect(topAfter).not.toBe(topBefore);
    expect(JSON.parse(localStorage.getItem('kastje.votes')!)).toHaveLength(1);
  });

  it('de gelogde outfit blijft staan als je even naar een ander tabblad gaat', async () => {
    render(<App />);
    await screen.findByText('Outfit voor vandaag');
    const outfit = cardNames();
    fireEvent.click(screen.getByRole('button', { name: 'Dit draag ik vandaag' }));

    openTab('Kast');
    openTab('Vandaag');

    expect(cardNames()).toEqual(outfit);
    expect(screen.getByRole('button', { name: '✓ Gelogd voor vandaag' })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('kastje.wearLog')!)).toHaveLength(1);
  });

  it('👍 telt maar één keer per outfit', async () => {
    render(<App />);
    await screen.findByText('Outfit voor vandaag');
    const like = screen.getByRole('button', { name: 'Goede combinatie' });
    fireEvent.click(like);
    fireEvent.click(like);
    fireEvent.click(like);
    expect(JSON.parse(localStorage.getItem('kastje.votes')!)).toHaveLength(1);
  });

  it('een stuk vastzetten houdt het vast bij "Andere suggestie"', async () => {
    render(<App />);
    await screen.findByText('Outfit voor vandaag');
    const navyOrGrey = cardNames().find((n) => n?.includes('trui'))!;

    fireEvent.click(screen.getByText(navyOrGrey).closest('button')!);
    expect(screen.getByText(navyOrGrey, { selector: 'strong' })).toBeTruthy(); // "📌 Rond: …"

    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Andere suggestie/ }));
      expect(cardNames()).toContain(navyOrGrey);
    }
  });
});
