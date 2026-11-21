import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { clampCrop, drawCrop, nextRotation, renderCrop, rotatedSize, type Rotation } from '../data/crop';

interface Props {
  photo: Blob;
  onDone: (cropped: Blob) => void;
  onCancel: () => void;
}

/** Pixels van het preview-canvas (wordt kleiner getoond, zodat het scherp is op telefoons). */
const PREVIEW_PX = 600;

/** Foto vierkant bijsnijden: slepen om te verschuiven, schuif om te zoomen, knop om te draaien. */
export function PhotoEditor({ photo, onDone, onCancel }: Props) {
  const [image, setImage] = useState<ImageBitmap | null>(null);
  const [error, setError] = useState('');
  const [rotation, setRotation] = useState<Rotation>(0);
  const [zoom, setZoom] = useState(1);
  // Middelpunt van het kader in de gedraaide foto; null = precies in het midden.
  const [center, setCenter] = useState<{ x: number; y: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragFrom = useRef<{ x: number; y: number } | null>(null);

  // Foto inladen.
  useEffect(() => {
    let cancelled = false;
    let loaded: ImageBitmap | null = null;
    createImageBitmap(photo)
      .then((bitmap) => {
        loaded = bitmap;
        if (!cancelled) setImage(bitmap);
      })
      .catch(() => !cancelled && setError('Deze foto kan niet worden bijgesneden.'));
    return () => {
      cancelled = true;
      loaded?.close();
    };
  }, [photo]);

  const rotated = image ? rotatedSize(image.width, image.height, rotation) : null;
  const crop =
    image && rotated
      ? clampCrop(image.width, image.height, rotation, zoom, center ?? { x: rotated.width / 2, y: rotated.height / 2 })
      : null;

  // Preview tekenen zodra er iets verandert.
  useEffect(() => {
    const context = canvasRef.current?.getContext('2d');
    if (!context || !image || !crop) return;
    drawCrop(context, image, rotation, crop, PREVIEW_PX);
  });

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    try {
      // Blijf de vinger volgen, ook als die even buiten het kader komt.
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Niet overal beschikbaar; slepen werkt dan nog steeds binnen het kader.
    }
    dragFrom.current = { x: event.clientX, y: event.clientY };
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!dragFrom.current || !crop) return;
    // Schermpixels omrekenen naar fotopixels; de foto beweegt mee met je vinger.
    const perPixel = crop.size / event.currentTarget.getBoundingClientRect().width;
    const dx = (event.clientX - dragFrom.current.x) * perPixel;
    const dy = (event.clientY - dragFrom.current.y) * perPixel;
    dragFrom.current = { x: event.clientX, y: event.clientY };
    setCenter({ x: crop.x + crop.size / 2 - dx, y: crop.y + crop.size / 2 - dy });
  }

  function endDrag() {
    dragFrom.current = null;
  }

  function rotate() {
    setRotation(nextRotation(rotation));
    setCenter(null);
  }

  async function finish() {
    if (!image || !crop) return;
    setBusy(true);
    try {
      onDone(await renderCrop(image, rotation, crop));
    } catch {
      setError('Bijsnijden is niet gelukt.');
      setBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop sheet-backdrop--top" onClick={onCancel}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>✂️ Bijsnijden</h2>
        <p className="muted">Sleep de foto zodat het kledingstuk in het vierkant past.</p>

        <div className="crop-frame">
          {image ? (
            <canvas
              ref={canvasRef}
              width={PREVIEW_PX}
              height={PREVIEW_PX}
              className="crop-canvas"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              aria-label="Voorbeeld van de bijgesneden foto; sleep om te verschuiven"
              role="img"
            />
          ) : (
            <p className="muted">{error || 'Foto laden…'}</p>
          )}
        </div>

        <div className="crop-controls">
          <label className="field crop-zoom">
            <span>Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              disabled={!image}
            />
          </label>
          <button type="button" className="button button--secondary" onClick={rotate} disabled={!image}>
            ↻ Draaien
          </button>
        </div>
        {error && image && <p className="error">{error}</p>}

        <div className="sheet-actions">
          <span className="spacer" />
          <button type="button" className="button button--ghost" onClick={onCancel}>
            Annuleren
          </button>
          <button type="button" className="button" onClick={finish} disabled={!image || busy}>
            {busy ? 'Bezig…' : 'Klaar'}
          </button>
        </div>
      </div>
    </div>
  );
}
