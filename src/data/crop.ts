/**
 * Foto bijsnijden en draaien: de rekensom.
 *
 * We denken in de gedraaide foto: na 90° draaien wordt een staande foto liggend.
 * Het kader is altijd vierkant. Bij zoom 1 is het zo groot als de korte kant van de foto;
 * bij zoom 2 half zo groot (je ziet dan een kleiner stuk, groter in beeld).
 */

export type Rotation = 0 | 90 | 180 | 270;

export interface Crop {
  /** Linkerbovenhoek van het kader, in pixels van de gedraaide foto */
  x: number;
  y: number;
  /** Zijde van het vierkante kader, in pixels van de gedraaide foto */
  size: number;
}

/** Afmetingen van de foto na draaien. */
export function rotatedSize(width: number, height: number, rotation: Rotation) {
  return rotation === 90 || rotation === 270 ? { width: height, height: width } : { width, height };
}

/**
 * Het vierkante kader voor een gegeven zoom en middelpunt.
 * Het kader blijft altijd helemaal binnen de foto, ook als je "te ver" schuift.
 */
export function clampCrop(
  width: number,
  height: number,
  rotation: Rotation,
  zoom: number,
  center: { x: number; y: number },
): Crop {
  const rotated = rotatedSize(width, height, rotation);
  const size = Math.min(rotated.width, rotated.height) / Math.max(1, zoom);
  const half = size / 2;
  const cx = Math.min(Math.max(center.x, half), rotated.width - half);
  const cy = Math.min(Math.max(center.y, half), rotated.height - half);
  return { x: cx - half, y: cy - half, size };
}

/** Volgende draaistand (een kwartslag met de klok mee). */
export function nextRotation(rotation: Rotation): Rotation {
  return ((rotation + 90) % 360) as Rotation;
}

/**
 * Tekent het gekozen kader op een vierkant canvas van `outSize` pixels.
 * (Wordt gebruikt voor de live preview én voor de uiteindelijke foto.)
 */
export function drawCrop(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource & { width: number; height: number },
  rotation: Rotation,
  crop: Crop,
  outSize: number,
): void {
  const rotated = rotatedSize(image.width, image.height, rotation);
  context.save();
  context.clearRect(0, 0, outSize, outSize);
  context.scale(outSize / crop.size, outSize / crop.size);
  context.translate(-crop.x, -crop.y);
  // De foto gedraaid neerzetten, met het midden van de gedraaide foto als draaipunt.
  context.translate(rotated.width / 2, rotated.height / 2);
  context.rotate((rotation * Math.PI) / 180);
  context.drawImage(image, -image.width / 2, -image.height / 2);
  context.restore();
}

/** Maakt de bijgesneden foto: vierkant, `outSize` pixels, als JPEG. */
export function renderCrop(
  image: CanvasImageSource & { width: number; height: number },
  rotation: Rotation,
  crop: Crop,
  outSize = 800,
  quality = 0.85,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = outSize;
  canvas.height = outSize;
  const context = canvas.getContext('2d');
  if (!context) return Promise.reject(new Error('Canvas is niet beschikbaar'));
  drawCrop(context, image, rotation, crop, outSize);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Kon de foto niet bijsnijden'))),
      'image/jpeg',
      quality,
    );
  });
}
