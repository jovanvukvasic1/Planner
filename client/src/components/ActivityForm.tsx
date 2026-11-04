import { useState, type FormEvent } from "react";
import Modal from "./Modal";
import { PRIORITY_LABELS, buildFolderTree, flattenTree, fromLocalInput, toLocalInput } from "../lib/format";
import type { Activity, ActivityInput, Folder, Priority } from "../lib/types";

interface Props {
  folders: Folder[];
  activity?: Activity;
  defaultFolderId?: number | null;
  onSave: (data: ActivityInput) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240, 300, 480];

export default function ActivityForm({ folders, activity, defaultFolderId = null, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(activity?.title ?? "");
  const [description, setDescription] = useState(activity?.description ?? "");
  const [deadline, setDeadline] = useState(toLocalInput(activity?.deadline ?? null));
  const [priority, setPriority] = useState<Priority>(activity?.priority ?? 1);
  const [estimated, setEstimated] = useState<number | null>(activity?.estimatedMinutes ?? null);
  const [folderId, setFolderId] = useState<number | null>(activity ? activity.folderId : defaultFolderId);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const options = flattenTree(buildFolderTree(folders));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        deadline: fromLocalInput(deadline),
        priority,
        estimatedMinutes: estimated,
        folderId,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greska");
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!onDelete || !confirm(`Obrisati aktivnost "${activity?.title}"?`)) return;
    setBusy(true);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greska");
      setBusy(false);
    }
  };

  return (
    <Modal title={activity ? "Izmjena aktivnosti" : "Nova aktivnost"} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          Naziv
          <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} autoFocus placeholder="npr. Projektni zadatak" />
        </label>
        <label>
          Opis
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={5000} />
        </label>
        <div className="form-row">
          <label>
            Krajnji rok
            <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </label>
          <label>
            Prioritet
            <select value={priority} onChange={(e) => setPriority(Number(e.target.value) as Priority)}>
              {([2, 1, 0] as Priority[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>
            Procijenjeno trajanje
            <select value={estimated ?? ""} onChange={(e) => setEstimated(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Nije određeno</option>
              {[...new Set([...DURATIONS, ...(estimated ? [estimated] : [])])]
                .sort((a, b) => a - b)
                .map((m) => (
                  <option key={m} value={m}>
                    {m < 60 ? `${m} min` : `${m / 60} h`}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Folder
            <select value={folderId ?? ""} onChange={(e) => setFolderId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Bez foldera</option>
              {options.map((f) => (
                <option key={f.id} value={f.id}>
                  {"  ".repeat(f.depth)}
                  {f.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="form-actions">
          {onDelete && (
            <button type="button" className="btn danger" onClick={remove} disabled={busy}>
              Obriši
            </button>
          )}
          <span className="spacer" />
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
