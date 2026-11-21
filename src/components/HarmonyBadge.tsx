import type { Harmony } from '../outfit/harmony';

/** "Harmonie 92 · Neutraal met één accent", met een kleur die bij de score past. */
export function HarmonyBadge({ harmony }: { harmony: Harmony }) {
  const level = harmony.score >= 85 ? 'high' : harmony.score >= 65 ? 'mid' : 'low';
  return (
    <span className={`badge badge--harmony badge--${level}`} title={`Kleurharmonie: ${harmony.label}`}>
      <strong>{harmony.score}</strong> · {harmony.reason}
    </span>
  );
}
