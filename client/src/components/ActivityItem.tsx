import { PRIORITY_LABELS, deadlineUrgency, formatClock, formatDateTime, formatDuration, formatWorked, liveWorkedSeconds, relativeDeadline } from "../lib/format";
import { useNow } from "../lib/useNow";
import type { Activity } from "../lib/types";
import Icon from "./Icon";

interface Props {
  activity: Activity;
  showFolder: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onStart: () => void;
  onPause: () => void;
}

export default function ActivityItem({ activity: a, showFolder, onToggle, onOpen, onStart, onPause }: Props) {
  const running = !!a.runningSince;
  const now = useNow(1000, running);
  const urgency = deadlineUrgency(a.deadline, a.completed);
  const worked = liveWorkedSeconds(a, now);

  return (
    <li className={`activity urgency-${urgency}${a.completed ? " completed" : ""}${running ? " running" : ""}`}>
      <input
        type="checkbox"
        className="activity-check"
        checked={a.completed}
        onChange={onToggle}
        aria-label={a.completed ? "Vrati u nezavršene" : "Označi kao završeno"}
      />
      <button className="activity-body" onClick={onOpen}>
        <span className="activity-title">{a.title}</span>
        {a.description && <span className="activity-desc">{a.description}</span>}
        <span className="activity-meta">
          {running && <span className="status-text running">U radu</span>}
          {!running && a.status === "in_progress" && <span className="status-text paused">Pauzirano</span>}
          {a.deadline && (
            <span className={`badge deadline ${urgency}`}>
              Rok {formatDateTime(a.deadline)}
              {!a.completed && <> · {relativeDeadline(a.deadline)}</>}
            </span>
          )}
          {a.priority !== 1 && <span className={`badge priority-${a.priority}`}>{PRIORITY_LABELS[a.priority]} prioritet</span>}
          {a.timeSource === "tracked" || running ? (
            <span className="badge">
              Rad {running ? formatClock(worked) : formatWorked(worked)}
              {a.estimatedMinutes ? ` / ${formatDuration(a.estimatedMinutes)}` : ""}
            </span>
          ) : a.timeSource === "estimated" ? (
            <span className="badge" title="Aktivnost je završena bez mjerenja, računa se procijenjeno vrijeme">
              Rad {formatWorked(a.creditedSeconds)} (procijenjeno)
            </span>
          ) : (
            a.estimatedMinutes && <span className="badge">Procjena {formatDuration(a.estimatedMinutes)}</span>
          )}
          {showFolder && a.folder && (
            <span className="badge folder">
              <span className="folder-dot" style={{ background: a.folder.color }} />
              {a.folder.name}
            </span>
          )}
        </span>
      </button>
      {!a.completed && (
        <button
          className={`icon-btn bordered timer-btn${running ? " active" : ""}`}
          onClick={running ? onPause : onStart}
          title={running ? "Pauziraj" : a.status === "in_progress" ? "Nastavi rad" : "Započni rad"}
          aria-label={running ? "Pauziraj" : "Započni rad"}
        >
          <Icon name={running ? "pause" : "play"} size={14} />
        </button>
      )}
    </li>
  );
}
