/**
 * Bewaart een bestand op het apparaat.
 * Op een telefoon openen we het deelmenu, zodat je het direct in je cloud of bestanden kunt zetten;
 * op een computer wordt het gewoon gedownload.
 *
 * Geeft false als je het deelmenu annuleerde (dan is er dus níéts bewaard).
 */
export async function saveFile(blob: Blob, fileName: string): Promise<boolean> {
  const file = new File([blob], fileName, { type: blob.type });
  const isTouchDevice = window.matchMedia?.('(pointer: coarse)').matches;
  if (isTouchDevice && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return true;
    } catch (error) {
      // Gebruiker annuleerde het deelmenu: dan stoppen we gewoon.
      if ((error as Error).name === 'AbortError') return false;
      // Andere fout: val terug op een gewone download.
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
