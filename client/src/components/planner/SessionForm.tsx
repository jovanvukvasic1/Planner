import { useState, type FormEvent } from "react";
import Modal from "../Modal";
import { MINUTE, fromDateTimeInputs, toDateInput, toTimeInput } from "../../lib/dates";
import { formatDateTime } from "../../lib/format";
import type { Activity, Session } from "../../lib/types";

export interface SessionFormData {
  activityId: number;
  start: Date;
  end: Date;
  done?: boolean;
}

type Props = {
  onSave: (data: SessionFormData) => Promise<void>;
  onClose: () => void;
} & (
  | { mode: "create"; activities: Activity[]; defaultActivityId?: number; defaultStart: Date }
  | {
      mode: "edit";
      session: Session;
      onDelete: () => Promise<void>;
      onToggleActivity: () => Promise<void>;
    }
);

const DEFAULT_DURATION = 60;

export default function SessionForm(props: Props) {
  const isEdit = props.mode === "edit";
  const activities = props.mode === "create" ? props.activities : [];
  const estimateOf = (id: number | undefined) =>
    activities.find((a) => a.id === id)?.estimatedMinutes ?? DEFAULT_DURATION;

  const initialStart = isEdit ? new Date(props.session.start) : props.defaultStart;
  const initialActivity = isEdit ? props.session.activityId : props.defaultActivityId ?? activities[0]?.id;
  const initialEnd = isEdit
    ? new Date(props.session.end)
    : new Date(initialStart.getTime() + estimateOf(initialActivity) * MINUTE);

  const [activityId, setActivityId] = useState<number | undefined>(initialActivity);
  const [date, setDate] = useState(toDateInput(initialStart));
  const [startTime, setStartTime] = useState(toTimeInput(initialStart));
  const [endTime, setEndTime] = useState(toTimeInput(initialEnd));
  const [done, setDone] = useState(isEdit ? props.session.done : false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const changeActivity = (id: number) => {
    setActivityId(id);
    if (date && startTime) {
      const start = fromDateTimeInputs(date, startTime);
      setEndTime(toTimeInput(new Date(start.getTime() + estimateOf(id) * MINUTE)));
    }
  };

  const changeStart = (value: string) => {
    // Pomjeranje pocetka zadrzava trajanje termina.
    if (value && startTime && endTime && date) {
      const oldStart = fromDateTimeInputs(date, startTime);
      const oldEnd = fromDateTimeInputs(date, endTime);
      const duration = oldEnd.getTime() - oldStart.getTime();
      if (duration > 0) setEndTime(toTimeInput(new Date(fromDateTimeInputs(date, value).getTime() + duration)));
    }
    setStartTime(value);
  };

  const wrap = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      props.onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška");
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!activityId) return setError("Izaberi aktivnost");
    const start = fromDateTimeInputs(date, startTime);
    const end = fromDateTimeInputs(date, endTime);
    if (end <= start) return setError("Kraj termina mora biti poslije početka");
    wrap(() => props.onSave({ activityId, start, end, done }));
  };

  const selected = isEdit ? null : activities.find((a) => a.id === activityId);
  const activity = isEdit ? props.session.activity : selected;

  return (
    <Modal title={isEdit ? "Termin" : "Zakaži aktivnost"} onClose={props.onClose}>
      <form className="form" onSubmit={submit}>
        {isEdit ? (
          <div className="session-summary">
            <div className="session-summary-title">
              {props.session.activity.folder && (
                <span className="folder-dot" style={{ background: props.session.activity.folder.color }} />
              )}
              {props.session.activity.title}
            </div>
            {props.session.activity.folder && <div className="muted small">{props.session.activity.folder.name}</div>}
          </div>
        ) : (
          <label>
            Aktivnost
            <select value={activityId ?? ""} onChange={(e) => changeActivity(Number(e.target.value))} required>
              {activities.length === 0 && <option value="">Nema nezavršenih aktivnosti</option>}
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                  {a.folder ? ` (${a.folder.name})` : ""}
                </option>
              ))}
            </select>
          </label>
        )}

        {activity?.deadline && (
          <p className="muted small form-note">
            Rok: {formatDateTime(activity.deadline)}
          </p>
        )}

        <div className="form-row">
          <label>
            Datum
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label>
            Od
            <input type="time" value={startTime} onChange={(e) => changeStart(e.target.value)} required step={300} />
          </label>
          <label>
            Do
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required step={300} />
          </label>
        </div>

        {isEdit && (
          <label className="checkbox">
            <input type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} />
            Termin je odrađen
          </label>
        )}

        {error && <p className="error">{error}</p>}

        <div className="form-actions">
          {props.mode === "edit" && (
            <>
              <button
                type="button"
                className="btn danger"
                disabled={busy}
                onClick={() => {
                  if (confirm("Obrisati ovaj termin iz planera?")) wrap(props.onDelete);
                }}
              >
                Obriši
              </button>
              <button type="button" className="btn" disabled={busy} onClick={() => wrap(props.onToggleActivity)}>
                {props.session.activity.completed ? "Vrati aktivnost u nezavršene" : "Aktivnost je završena"}
              </button>
            </>
          )}
          <span className="spacer" />
          <button type="button" className="btn" onClick={props.onClose}>
            Otkaži
          </button>
          <button className="btn primary" disabled={busy || (!isEdit && !activities.length)}>
            {isEdit ? "Sačuvaj" : "Zakaži"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

