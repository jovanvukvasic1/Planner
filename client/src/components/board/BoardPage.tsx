import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { buildFolderTree, descendantIds, flattenTree } from "../../lib/format";
import { useTimer } from "../../lib/timer";
import type { Activity, ActivityInput, ActivityStatus, Folder } from "../../lib/types";
import ActivityForm from "../ActivityForm";
import Icon from "../Icon";
import BoardCard, { CARD_DND_TYPE } from "./BoardCard";

const COLUMNS: { status: ActivityStatus; title: string; empty: string }[] = [
  { status: "todo", title: "Za uraditi", empty: "Nema aktivnosti." },
  { status: "in_progress", title: "U radu", empty: "Prevuci aktivnost ovdje da započneš rad." },
  { status: "done", title: "Završeno", empty: "Ovdje idu završene aktivnosti." },
];

const DONE_PAGE = 15;
const FOLDER_KEY = "planer_board_folder";

function initialFolder(): number | null {
  try {
    const v = Number(localStorage.getItem(FOLDER_KEY));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}

type Dialog = { activity?: Activity } | null;

export default function BoardPage() {
  const timer = useTimer();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [folderId, setFolderId] = useState<number | null>(initialFolder);
  const [search, setSearch] = useState("");
  const [doneLimit, setDoneLimit] = useState(DONE_PAGE);
  const [dropTarget, setDropTarget] = useState<ActivityStatus | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState("");

  const run = useCallback(async (fn: () => Promise<unknown>) => {
    try {
      setError("");
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška");
    }
  }, []);

  const load = useCallback(
    () =>
      Promise.all([api.folders.list(), api.activities.list(folderId ? { folderId, recursive: true } : {})]).then(
        ([f, a]) => {
          setFolders(f);
          setActivities(a);
        }
      ),
    // timer.version: osvjezi tablu kad se tajmer promijeni (npr. iz gornje trake)
    [folderId, timer.version]
  );

  useEffect(() => {
    run(load);
  }, [run, load]);

  // Ako je izabrani folder obrisan, prikazi sve.
  useEffect(() => {
    if (folderId && folders.length && !folders.some((f) => f.id === folderId)) changeFolder(null);
  }, [folders, folderId]);

  const changeFolder = (id: number | null) => {
    setFolderId(id);
    try {
      if (id) localStorage.setItem(FOLDER_KEY, String(id));
      else localStorage.removeItem(FOLDER_KEY);
    } catch {
      /* nedostupno */
    }
  };

  const columns = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? activities.filter((a) => a.title.toLowerCase().includes(q)) : activities;
    const by = (s: ActivityStatus) => list.filter((a) => a.status === s);
    const inProgress = by("in_progress").sort((a, b) => Number(!!b.runningSince) - Number(!!a.runningSince));
    const done = by("done").sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
    return { todo: by("todo"), in_progress: inProgress, done } as Record<ActivityStatus, Activity[]>;
  }, [activities, search]);

  /** Prelazak u drugu kolonu: U radu pokrece tajmer, Zavrseno zavrsava aktivnost. */
  const move = (a: Activity, to: ActivityStatus) =>
    run(async () => {
      if (a.status === to) return;
      if (to === "in_progress") await timer.start(a.id);
      else if (to === "done") await timer.finish(a.id);
      else {
        await api.activities.update(a.id, { status: "todo" });
        timer.changed();
      }
    });

  const saveActivity = async (data: ActivityInput, activity?: Activity) => {
    if (activity) await api.activities.update(activity.id, data);
    else await api.activities.create(data);
    timer.changed();
  };

  const folderOptions = flattenTree(buildFolderTree(folders));
  const selectedIds = folderId ? descendantIds(folders, folderId) : null;

  return (
    <div className="board-page">
      <div className="board-toolbar">
        <h2>Tabla</h2>
        <select className="board-filter" value={folderId ?? ""} onChange={(e) => changeFolder(e.target.value ? Number(e.target.value) : null)}>
          <option value="">Svi folderi</option>
          {folderOptions.map((f) => (
            <option key={f.id} value={f.id}>
              {"  ".repeat(f.depth)}
              {f.name}
            </option>
          ))}
        </select>
        <input className="search" type="search" placeholder="Pretraga..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn primary" onClick={() => setDialog({})}>
          <Icon name="plus" /> Nova aktivnost
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="board">
        {COLUMNS.map((col) => {
          const items = columns[col.status];
          const shown = col.status === "done" ? items.slice(0, doneLimit) : items;
          return (
            <section
              key={col.status}
              className={`board-col col-${col.status}${dropTarget === col.status ? " drop" : ""}`}
              onDragOver={(e) => {
                if (!e.dataTransfer.types.includes(CARD_DND_TYPE)) return;
                e.preventDefault();
                setDropTarget(col.status);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDropTarget(null);
                const id = Number(e.dataTransfer.getData(CARD_DND_TYPE));
                const a = activities.find((x) => x.id === id);
                if (a) move(a, col.status);
              }}
            >
              <header className="board-col-header">
                <h3>{col.title}</h3>
                <span className="board-count">{items.length}</span>
              </header>
              <div className="board-cards">
                {shown.length === 0 && <p className="board-empty muted small">{col.empty}</p>}
                {shown.map((a) => (
                  <BoardCard
                    key={a.id}
                    activity={a}
                    showFolder={!selectedIds || a.folderId !== folderId}
                    onOpen={() => setDialog({ activity: a })}
                    onMove={(to) => move(a, to)}
                    onStart={() => move(a, "in_progress")}
                    onPause={() => run(() => timer.pause(a.id))}
                  />
                ))}
                {col.status === "done" && items.length > shown.length && (
                  <button className="btn small board-more" onClick={() => setDoneLimit((n) => n + DONE_PAGE)}>
                    Prikaži još ({items.length - shown.length})
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {dialog && (
        <ActivityForm
          folders={folders}
          activity={dialog.activity}
          defaultFolderId={folderId}
          onSave={(data) => saveActivity(data, dialog.activity)}
          onDelete={
            dialog.activity
              ? async () => {
                  await api.activities.remove(dialog.activity!.id);
                  timer.changed();
                }
              : undefined
          }
          onWorkChanged={timer.changed}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
