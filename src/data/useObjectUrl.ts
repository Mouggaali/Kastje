import { useEffect, useMemo } from 'react';

/** Tijdelijke URL om een foto (Blob) te tonen; wordt vanzelf opgeruimd als hij niet meer nodig is. */
export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  return url;
}
