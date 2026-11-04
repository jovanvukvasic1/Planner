import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { buildFolderTree } from "../lib/format";
import type { Activity, ActivityInput, Folder, FolderInput } from "../lib/types";
import FolderTree, { type Selection } from "./FolderTree";
import FolderForm from "./FolderForm";
import ActivityForm from "./ActivityForm";
import ActivityItem from "./ActivityItem";

type StatusFilter = "active" | "completed" | "all";

type Dialog =
  | { kind: "folder"; folder?: Folder; parentId?: number | null }
  | { kind: "activity"; activity?: Activity }
  | null;

export default function ActivitiesPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selection, setSelection] = useState<Selection>({ kind: "all" });
  const [status, setStatus] = useState<StatusFilter>("active");
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState("");

  const tree = useMemo(() => buildFolderTree(folders), [folders]);
  const selectedFolder = selection.kind === "folder" ? folders.find((f) => f.id === selection.id) : undefined;

  const loadFolders = useCallback(() => api.folders.list().then(setFolders), []);

  const loadActivities = useCallback(() => {
    const folderId = selection.kind === "folder" ? selection.id : selection.kind === "none" ? "none" : undefined;
    return api.activities
      .list({
        folderId,
        recursive: selection.kind === "folder",
        completed: status === "all" ? undefined : status === "completed",
        search: search.trim() || undefined,
      })
      .then(setActivities);
  }, [selection, status, search]);

  const run = useCallback(async (fn: () => Promise<unknown>) => {
    try {
      setError("");
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greska");
    }
  }, []);

  useEffect(() => {
    run(loadFolders);
  }, [run, loadFolders]);

  useEffect(() => {
    const t = setTimeout(() => run(loadActivities), search ? 250 : 0);
    return () => clearTimeout(t);
  }, [run, loadActivities, search]);

  // Ako je izabrani folder obrisan, vrati se na "Sve aktivnosti".
  useEffect(() => {
    if (selection.kind === "folder" && folders.length && !selectedFolder) setSelection({ kind: "all" });
  }, [folders, selection, selectedFolder]);

  const refresh = () => Promise.all([loadFolders(), loadActivities()]);

  const saveFolder = async (data: FolderInput, folder?: Folder) => {
    if (folder) await api.folders.update(folder.id, data);
    else await api.folders.create(data);
    await refresh();
  };

  const deleteFolder = (folder: Folder) =>
    run(async () => {
      if (!confirm(`Obrisati folder "${folder.name}" i sve njegove podfoldere?\nAktivnosti će ostati, ali bez foldera.`)) return;
      await api.folders.remove(folder.id);
      await refresh();
    });

  const saveActivity = async (data: ActivityInput, activity?: Activity) => {
    if (activity) await api.activities.update(activity.id, data);
    else await api.activities.create(data);
    await refresh();
  };

  const toggleActivity = (a: Activity) =>
    run(async () => {
      await api.activities.update(a.id, { completed: !a.completed });
      await loadActivities();
    });

  const select = (s: Selection) => {
    setSelection(s);
    setSidebarOpen(false);
  };

  const heading =
    selection.kind === "all" ? "Sve aktivnosti" : selection.kind === "none" ? "Bez foldera" : selectedFolder?.name ?? "";

  return (
    <div className="activities-page">
      <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
        <FolderTree
          tree={tree}
          selection={selection}
          onSelect={select}
          onAdd={(parentId) => setDialog({ kind: "folder", parentId })}
          onEdit={(folder) => setDialog({ kind: "folder", folder })}
          onDelete={deleteFolder}
        />
      </aside>
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      <section className="content">
        <div className="content-header">
          <button className="btn mobile-only" onClick={() => setSidebarOpen(true)}>
            ☰ Folderi
          </button>
          <h2>
            {selectedFolder && <span className="folder-dot large" style={{ background: selectedFolder.color }} />}
            {heading}
          </h2>
          <button className="btn primary" onClick={() => setDialog({ kind: "activity" })}>
            + Nova aktivnost
          </button>
        </div>

        <div className="toolbar">
          <div className="segmented">
            {(
              [
                ["active", "Aktivne"],
                ["completed", "Urađene"],
                ["all", "Sve"],
              ] as [StatusFilter, string][]
            ).map(([value, label]) => (
              <button key={value} className={status === value ? "active" : ""} onClick={() => setStatus(value)}>
                {label}
              </button>
            ))}
          </div>
          <input className="search" type="search" placeholder="Pretraga..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {error && <p className="error">{error}</p>}

        {activities.length === 0 ? (
          <div className="empty">
            <p>{status === "completed" ? "Nema urađenih aktivnosti." : "Nema aktivnosti."}</p>
            {status !== "completed" && (
              <button className="btn" onClick={() => setDialog({ kind: "activity" })}>
                Dodaj aktivnost
              </button>
            )}
          </div>
        ) : (
          <ul className="activity-list">
            {activities.map((a) => (
              <ActivityItem
                key={a.id}
                activity={a}
                showFolder={selection.kind !== "folder" || a.folderId !== selection.id}
                onToggle={() => toggleActivity(a)}
                onOpen={() => setDialog({ kind: "activity", activity: a })}
              />
            ))}
          </ul>
        )}
      </section>

      {dialog?.kind === "folder" && (
        <FolderForm
          folders={folders}
          folder={dialog.folder}
          defaultParentId={dialog.parentId}
          onSave={(data) => saveFolder(data, dialog.folder)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "activity" && (
        <ActivityForm
          folders={folders}
          activity={dialog.activity}
          defaultFolderId={selection.kind === "folder" ? selection.id : null}
          onSave={(data) => saveActivity(data, dialog.activity)}
          onDelete={
            dialog.activity
              ? async () => {
                  await api.activities.remove(dialog.activity!.id);
                  await refresh();
                }
              : undefined
          }
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
