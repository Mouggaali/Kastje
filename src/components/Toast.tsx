import { useCallback, useEffect, useRef, useState } from 'react';

export interface ToastMessage {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Hoe lang een melding met "Ongedaan maken" zichtbaar blijft. */
const UNDO_MS = 6000;

/**
 * Meldingen met "Ongedaan maken".
 *
 * `showUndo(bericht, ongedaanMaken, definitief)`: de wijziging is al doorgevoerd; binnen 6 seconden
 * kun je hem terugdraaien. Gebeurt dat niet, dan draait `definitief` (bijv. de foto echt wissen).
 */
export function useUndo() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const pending = useRef<{ timer: ReturnType<typeof setTimeout>; commit?: () => void } | null>(null);

  /** De vorige wijziging definitief maken (als die nog openstond). */
  const finalize = useCallback(() => {
    if (!pending.current) return;
    clearTimeout(pending.current.timer);
    pending.current.commit?.();
    pending.current = null;
  }, []);

  const showUndo = useCallback(
    (message: string, undo: () => void, commit?: () => void) => {
      finalize();
      const id = Date.now();
      const timer = setTimeout(() => {
        finalize();
        setToast((current) => (current?.id === id ? null : current));
      }, UNDO_MS);
      pending.current = { timer, commit };
      setToast({
        id,
        message,
        actionLabel: 'Ongedaan maken',
        onAction: () => {
          clearTimeout(timer);
          pending.current = null;
          undo();
          setToast(null);
        },
      });
    },
    [finalize],
  );

  // Bij het sluiten van de app: openstaande wijzigingen alsnog definitief maken.
  useEffect(() => {
    window.addEventListener('pagehide', finalize);
    return () => window.removeEventListener('pagehide', finalize);
  }, [finalize]);

  return { toast, showUndo, dismiss: () => setToast(null) };
}

/** Een melding onderin het scherm, boven de tabbalk. */
export function Toast({ toast, onClose }: { toast: ToastMessage | null; onClose: () => void }) {
  if (!toast) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      <span>{toast.message}</span>
      {toast.onAction && (
        <button className="toast-action" onClick={toast.onAction}>
          {toast.actionLabel}
        </button>
      )}
      <button className="toast-close" onClick={onClose} aria-label="Melding sluiten">
        ✕
      </button>
    </div>
  );
}
