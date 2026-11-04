import { PRIORITY_LABELS, deadlineUrgency, formatDateTime, formatDuration, relativeDeadline } from "../lib/format";
import type { Activity } from "../lib/types";

interface Props {
  activity: Activity;
  showFolder: boolean;
  onToggle: () => void;
  onOpen: () => void;
}

export default function ActivityItem({ activity: a, showFolder, onToggle, onOpen }: Props) {
  const urgency = deadlineUrgency(a.deadline, a.completed);
  return (
    <li className={`activity urgency-${urgency}${a.completed ? " completed" : ""}`}>
      <input
        type="checkbox"
        className="activity-check"
        checked={a.completed}
        onChange={onToggle}
        aria-label={a.completed ? "Označi kao neurađeno" : "Označi kao urađeno"}
      />
      <button className="activity-body" onClick={onOpen}>
        <span className="activity-title">{a.title}</span>
        {a.description && <span className="activity-desc">{a.description}</span>}
        <span className="activity-meta">
          {a.deadline && (
            <span className={`badge deadline ${urgency}`} title={formatDateTime(a.deadline)}>
              ⏰ {formatDateTime(a.deadline)}
              {!a.completed && <> · {relativeDeadline(a.deadline)}</>}
            </span>
          )}
          {a.priority !== 1 && <span className={`badge priority-${a.priority}`}>{PRIORITY_LABELS[a.priority]} prioritet</span>}
          {a.estimatedMinutes && <span className="badge">⏱ {formatDuration(a.estimatedMinutes)}</span>}
          {showFolder && a.folder && (
            <span className="badge folder" style={{ borderColor: a.folder.color }}>
              <span className="folder-dot" style={{ background: a.folder.color }} />
              {a.folder.name}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
