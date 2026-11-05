import { useState } from "react";
import { formatClock, liveWorkedSeconds } from "../lib/format";
import { useTimer } from "../lib/timer";
import { useNow } from "../lib/useNow";
import Icon from "./Icon";

/** Traka ispod zaglavlja koja se prikazuje dok tajmer radi. */
export default function TimerBar() {
  const { current, pause, finish } = useTimer();
  const now = useNow(1000, !!current);
  const [busy, setBusy] = useState(false);

  if (!current) return null;
  const a = current.activity;
  const total = liveWorkedSeconds(a, now);

  const act = async (fn: (id: number) => Promise<void>) => {
    setBusy(true);
    try {
      await fn(a.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="timer-bar" role="status">
      <span className="timer-indicator" aria-hidden="true" />
      <span className="timer-label">U radu</span>
      <span className="timer-title">
        {a.folder && <span className="folder-dot" style={{ background: a.folder.color }} />}
        {a.title}
      </span>
      <span className="timer-clock" title="Ukupno vrijeme rada na aktivnosti">
        {formatClock(total)}
      </span>
      <span className="timer-actions">
        <button className="btn small" onClick={() => act(pause)} disabled={busy}>
          <Icon name="pause" size={14} /> Pauza
        </button>
        <button className="btn small" onClick={() => act(finish)} disabled={busy}>
          <Icon name="stop" size={14} /> Završi
        </button>
      </span>
    </div>
  );
}
