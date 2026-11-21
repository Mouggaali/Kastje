/**
 * Verkleint een foto tot maximaal `maxSize` pixels aan de langste kant
 * en slaat hem op als JPEG. Een telefoonfoto van 4 MB wordt zo ongeveer 80 kB.
 */
export async function resizeImage(file: Blob, maxSize = 800, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is niet beschikbaar');
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Kon de foto niet verkleinen'))),
      'image/jpeg',
      quality,
    );
  });
}
