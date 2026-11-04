import { useState, type FormEvent } from "react";
import Modal from "./Modal";
import { FOLDER_COLORS, buildFolderTree, descendantIds, flattenTree } from "../lib/format";
import type { Folder, FolderInput } from "../lib/types";

interface Props {
  folders: Folder[];
  /** Folder koji se mijenja; ako nema, kreira se novi */
  folder?: Folder;
  defaultParentId?: number | null;
  onSave: (data: FolderInput) => Promise<void>;
  onClose: () => void;
}

export default function FolderForm({ folders, folder, defaultParentId = null, onSave, onClose }: Props) {
  const [name, setName] = useState(folder?.name ?? "");
  const [color, setColor] = useState(folder?.color ?? FOLDER_COLORS[0]);
  const [parentId, setParentId] = useState<number | null>(folder ? folder.parentId : defaultParentId);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Folder ne moze biti premjesten u sebe ili u svoje podfoldere.
  const excluded = folder ? descendantIds(folders, folder.id) : new Set<number>();
  const options = flattenTree(buildFolderTree(folders)).filter((f) => !excluded.has(f.id));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave({ name: name.trim(), color, parentId });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greska");
      setBusy(false);
    }
  };

  return (
    <Modal title={folder ? "Izmjena foldera" : "Novi folder"} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          Naziv
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} autoFocus placeholder="npr. Fakultet" />
        </label>
        <label>
          Nadređeni folder
          <select value={parentId ?? ""} onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">(nema, glavni nivo)</option>
            {options.map((f) => (
              <option key={f.id} value={f.id}>
                {"  ".repeat(f.depth)}
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="color-picker">
          <legend>Boja</legend>
          {FOLDER_COLORS.map((c) => (
            <button
              type="button"
              key={c}
              className={`color-swatch${c === color ? " selected" : ""}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`Boja ${c}`}
            />
          ))}
        </fieldset>
        {error && <p className="error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Otkaži
          </button>
          <button className="btn primary" disabled={busy}>
            Sačuvaj
          </button>
        </div>
      </form>
    </Modal>
  );
}
