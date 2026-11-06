import { useEffect, useRef, useState } from "react";
import { coverUrl } from "../lib/format";
import { compressImage } from "../lib/image";
import type { CoverChange } from "../lib/activities";

interface Props {
  current: string | null;
  change: CoverChange;
  onChange: (change: CoverChange) => void;
  onError: (message: string) => void;
}

/** Izbor naslovne slike u formi aktivnosti (pregled, promjena, uklanjanje). */
export default function CoverPicker({ current, change, onChange, onError }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Pregled nove (jos neposlane) slike.
  useEffect(() => {
    if (change && "file" in change) {
      const url = URL.createObjectURL(change.file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview(null);
  }, [change]);

  const removed = !!change && "remove" in change;
  const src = preview ?? (current && !removed ? coverUrl(current) : null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange({ file: await compressImage(file) });
    } catch (err) {
      onError(err instanceof Error ? err.message : "Greška pri obradi slike");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="cover-picker">
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
      {src ? (
        <div className="cover-preview">
          <img src={src} alt="Naslovna slika" />
          <div className="cover-preview-actions">
            <button type="button" className="btn small" onClick={() => input.current?.click()} disabled={busy}>
              Promijeni
            </button>
            <button type="button" className="btn small" onClick={() => onChange(current ? { remove: true } : null)} disabled={busy}>
              Ukloni
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="cover-empty" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? "Obrada slike..." : "Dodaj naslovnu sliku"}
        </button>
      )}
    </div>
  );
}
