import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { MINUTE, nextFullHour, shiftDate, startOfDay, viewRange, viewTitle, type View } from "../../lib/dates";
import type { Activity, Session } from "../../lib/types";
import Icon from "../Icon";
import Backlog from "./Backlog";
import MonthGrid from "./MonthGrid";
import SessionForm, { type SessionFormData } from "./SessionForm";
import TimeGrid from "./TimeGrid";
import type { DragPayload } from "./dnd";

const VIEW_KEY = "planer_view";
const VIEWS: [View, string][] = [
  ["day", "Dan"],
  ["week", "Sedmica"],
  ["month", "Mjesec"],
];

function initialView(): View {
  try {
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved === "day" || saved === "week" || saved === "month") return saved;
  } catch {
    /* nedostupno */
  }
  return window.innerWidth < 760 ? "day" : "week";
}

type Dialog =
  | { kind: "create"; start: Date; activityId?: number }
  | { kind: "edit"; session: Session }
  | null;

export default function PlannerPage() {
  const [view, setView] = useState<View>(initialView);
  const [date, setDate] = useState(() => startOfDay(new Date()));
  const [sessions, setSessions] = useState<Session[]>([]);
  const [deadlines, setDeadlines] = useState<Activity[]>([]);
  const [backlog, setBacklog] = useState<Activity[]>([]);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [backlogOpen, setBacklogOpen] = useState(false);
  const [error, setError] = useState("");

  const range = useMemo(() => viewRange(view, date), [view, date]);

  const loadRange = useCallback(async () => {
    const [s, d] = await Promise.all([
      api.sessions.list(range.from, range.to),
      api.activities.list({ deadlineFrom: range.from, deadlineTo: range.to }),
    ]);
    setSessions(s);
    setDeadlines(d);
  }, [range]);

  const loadBacklog = useCallback(() => api.activities.list({ completed: false }).then(setBacklog), []);

  const run = useCallback(async (fn: () => Promise<unknown>) => {
    try {
      setError("");
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška");
    }
  }, []);

  useEffect(() => {
    run(loadRange);
  }, [run, loadRange]);

  useEffect(() => {
    run(loadBacklog);
  }, [run, loadBacklog]);

  const reload = () => Promise.all([loadRange(), loadBacklog()]);

  const changeView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* nedostupno */
    }
  };

  const openDay = (day: Date) => {
    setDate(startOfDay(day));
    changeView("day");
  };

  const durationOf = (activityId: number) => (backlog.find((a) => a.id === activityId)?.estimatedMinutes ?? 60) * MINUTE;

  // Prevlacenje u dnevni/sedmicni prikaz: odmah kreira ili pomjera termin.
  const dropOnTime = (payload: DragPayload, start: Date) =>
    run(async () => {
      if (payload.type === "activity") {
        await api.sessions.create({
          activityId: payload.id,
          start: start.toISOString(),
          end: new Date(start.getTime() + durationOf(payload.id)).toISOString(),
        });
      } else {
        const s = sessions.find((x) => x.id === payload.id);
        if (!s) return;
        const duration = new Date(s.end).getTime() - new Date(s.start).getTime();
        await api.sessions.update(s.id, {
          start: start.toISOString(),
          end: new Date(start.getTime() + duration).toISOString(),
        });
      }
      await reload();
    });

  // Prevlacenje u mjesecni prikaz: zadrzava vrijeme termina, mijenja dan.
  const dropOnDay = (payload: DragPayload, day: Date) => {
    if (payload.type === "activity") {
      setDialog({ kind: "create", start: nextFullHour(day), activityId: payload.id });
      return;
    }
    const s = sessions.find((x) => x.id === payload.id);
    if (!s) return;
    const oldStart = new Date(s.start);
    const start = new Date(day);
    start.setHours(oldStart.getHours(), oldStart.getMinutes());
    dropOnTime(payload, start);
  };

  const scheduleActivity = (a: Activity) => {
    setBacklogOpen(false);
    setDialog({ kind: "create", start: nextFullHour(view === "day" ? date : new Date()), activityId: a.id });
  };

  const save = async (data: SessionFormData) => {
    if (dialog?.kind === "edit") {
      await api.sessions.update(dialog.session.id, {
        start: data.start.toISOString(),
        end: data.end.toISOString(),
        done: data.done,
      });
    } else {
      await api.sessions.create({ activityId: data.activityId, start: data.start.toISOString(), end: data.end.toISOString() });
    }
    await reload();
  };

  return (
    <div className="planner-page">
      <section className="planner-main">
        <div className="planner-toolbar">
          <div className="planner-nav">
            <button className="btn" onClick={() => setDate(startOfDay(new Date()))}>
              Danas
            </button>
            <button className="icon-btn bordered" onClick={() => setDate(shiftDate(view, date, -1))} aria-label="Prethodno">
              <Icon name="left" />
            </button>
            <button className="icon-btn bordered" onClick={() => setDate(shiftDate(view, date, 1))} aria-label="Sljedeće">
              <Icon name="right" />
            </button>
            <h2 className="planner-title">{viewTitle(view, date)}</h2>
          </div>
          <div className="planner-controls">
            <div className="segmented">
              {VIEWS.map(([v, label]) => (
                <button key={v} className={view === v ? "active" : ""} onClick={() => changeView(v)}>
                  {label}
                </button>
              ))}
            </div>
            <button className="btn mobile-only" onClick={() => setBacklogOpen(true)}>
              Za planiranje
            </button>
            <button className="btn primary" onClick={() => setDialog({ kind: "create", start: nextFullHour(date) })}>
              <Icon name="plus" /> Zakaži
            </button>
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        {view === "month" ? (
          <MonthGrid
            days={range.days}
            month={date.getMonth()}
            sessions={sessions}
            deadlines={deadlines}
            onDayClick={openDay}
            onSessionClick={(session) => setDialog({ kind: "edit", session })}
            onDeadlineClick={(a) => !a.completed && scheduleActivity(a)}
            onDrop={dropOnDay}
          />
        ) : (
          <TimeGrid
            key={view}
            days={range.days}
            sessions={sessions}
            deadlines={deadlines}
            onSlotClick={(start) => setDialog({ kind: "create", start })}
            onSessionClick={(session) => setDialog({ kind: "edit", session })}
            onDeadlineClick={(a) => !a.completed && scheduleActivity(a)}
            onDrop={dropOnTime}
          />
        )}
      </section>

      <aside className={`planner-side${backlogOpen ? " open" : ""}`}>
        <button className="icon-btn side-close mobile-only" onClick={() => setBacklogOpen(false)} aria-label="Zatvori">
          <Icon name="close" />
        </button>
        <Backlog activities={backlog} onPick={scheduleActivity} />
      </aside>
      {backlogOpen && <div className="sidebar-backdrop" onClick={() => setBacklogOpen(false)} />}

      {dialog?.kind === "create" && (
        <SessionForm
          mode="create"
          activities={backlog}
          defaultActivityId={dialog.activityId}
          defaultStart={dialog.start}
          onSave={save}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "edit" && (
        <SessionForm
          mode="edit"
          session={dialog.session}
          onSave={save}
          onDelete={async () => {
            await api.sessions.remove(dialog.session.id);
            await reload();
          }}
          onToggleActivity={async () => {
            await api.activities.update(dialog.session.activityId, { completed: !dialog.session.activity.completed });
            await reload();
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
