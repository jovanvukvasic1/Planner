import { useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { formatDate, formatTime, fromDateTimeInputs, toDateInput } from "../lib/dates";
import { formatWorked } from "../lib/format";
import type { ActivityDetail } from "../lib/types";
import Icon from "./Icon";

interface Props {
  activityId: number;
  onChanged: () => void;
}

/** Evidencija rada na aktivnosti: lista perioda, brisanje i rucni unos. */
export default function WorkLogList({ activityId, onChanged }: Props) {
  const [detail, setDetail] = useState<ActivityDetail | null>(null);
  const [adding, setAdding] = useState(false);
  const [date, setDate] = useState(toDateInput(new Date()));
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");

  const load = () => api.activities.get(activityId).then(setDetail);

  useEffect(() => {
    load().catch(() => {});
  }, [activityId]);

  const remove = async (id: number) => {
    if (!confirm("Obrisati ovaj period rada?")) return;
    await api.worklogs.remove(id);
    await load();
    onChanged();
  };

  // Ugnijezdena forma nije dozvoljena, pa se rucni unos salje bez <form>.
  const add = async (e?: FormEvent) => {
    e?.preventDefault();
    setError("");
    if (!from || !to) return setError("Unesi vrijeme od i do");
    try {
      await api.worklogs.create({
        activityId,
        start: fromDateTimeInputs(date, from).toISOString(),
        end: fromDateTimeInputs(date, to).toISOString(),
      });
      setAdding(false);
      setFrom("");
      setTo("");
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška");
    }
  };

  if (!detail) return null;
  const logs = detail.workLogs;

  return (
    <div className="worklog">
      <div className="worklog-header">
        <span>Evidencija rada</span>
        <span className="muted">
          {detail.timeSource === "estimated"
            ? `${formatWorked(detail.creditedSeconds)} (procijenjeno)`
            : `ukupno ${formatWorked(detail.workedSeconds)}`}
        </span>
      </div>
      {logs.length === 0 ? (
        <p className="muted small">Još nema izmjerenog rada.</p>
      ) : (
        <ul className="worklog-list">
          {logs.map((l) => {
            const start = new Date(l.start);
            const end = l.end ? new Date(l.end) : null;
            return (
              <li key={l.id}>
                <span>{formatDate(start)}</span>
                <span className="worklog-time">
                  {formatTime(start)} – {end ? formatTime(end) : "u toku"}
                </span>
                <span className="muted">{end ? formatWorked((end.getTime() - start.getTime()) / 1000) : ""}</span>
                <button type="button" className="icon-btn" onClick={() => remove(l.id)} title="Obriši" aria-label="Obriši period">
                  <Icon name="trash" size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {adding ? (
        <div className="worklog-add">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Datum" />
          <input type="time" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Od" />
          <input type="time" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Do" />
          <button type="button" className="btn small primary" onClick={() => add()}>
            Dodaj
          </button>
          <button type="button" className="btn small" onClick={() => setAdding(false)}>
            Otkaži
          </button>
        </div>
      ) : (
        <button type="button" className="link-btn small" onClick={() => setAdding(true)}>
          Ručno dodaj period rada
        </button>
      )}
      {error && <p className="error small">{error}</p>}
    </div>
  );
}
