import {
  PRIORITY_LABELS,
  coverUrl,
  deadlineUrgency,
  formatClock,
  formatDuration,
  formatWorked,
  liveWorkedSeconds,
  relativeDeadline,
} from "../../lib/format";
import type { Activity, ActivityStatus } from "../../lib/types";
import { useNow } from "../../lib/useNow";
import Icon from "../Icon";

export const CARD_DND_TYPE = "application/x-planer-card";

interface Props {
  activity: Activity;
  showFolder: boolean;
  onOpen: () => void;
  onMove: (to: ActivityStatus) => void;
  onStart: () => void;
  onPause: () => void;
}

export default function BoardCard({ activity: a, showFolder, onOpen, onMove, onStart, onPause }: Props) {
  const running = !!a.runningSince;
  const now = useNow(1000, running);
  const urgency = deadlineUrgency(a.deadline, a.completed);
  const worked = liveWorkedSeconds(a, now);

  let time: string | null = null;
  if (running) time = formatClock(worked);
  else if (a.timeSource === "tracked") time = formatWorked(worked);
  else if (a.timeSource === "estimated") time = `${formatWorked(a.creditedSeconds)} (procijenjeno)`;

  return (
    <article
      className={`card urgency-${urgency}${running ? " running" : ""}${a.completed ? " done" : ""}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(CARD_DND_TYPE, String(a.id));
        e.dataTransfer.effectAllowed = "move";
        e.currentTarget.classList.add("dragging");
      }}
      onDragEnd={(e) => e.currentTarget.classList.remove("dragging")}
    >
      {a.coverImage && (
        <button className="card-cover" onClick={onOpen} tabIndex={-1} aria-hidden="true">
          <img src={coverUrl(a.coverImage)} alt="" loading="lazy" draggable={false} />
        </button>
      )}
      <button className="card-body" onClick={onOpen}>
        {showFolder && a.folder && (
          <span className="card-folder">
            <span className="folder-dot" style={{ background: a.folder.color }} />
            {a.folder.name}
          </span>
        )}
        <span className="card-title">{a.title}</span>
        <span className="card-meta">
          {running && <span className="status-text running">U radu</span>}
          {!running && a.status === "in_progress" && <span className="status-text paused">Pauzirano</span>}
          {a.deadline && !a.completed && <span className={`deadline-text ${urgency}`}>{relativeDeadline(a.deadline)}</span>}
          {a.priority === 2 && !a.completed && <span className="priority-text">{PRIORITY_LABELS[2].toLowerCase()} prioritet</span>}
          {time ? (
            <span className="card-time">
              {time}
              {a.estimatedMinutes && a.timeSource !== "estimated" ? ` / ${formatDuration(a.estimatedMinutes)}` : ""}
            </span>
          ) : (
            a.estimatedMinutes && <span>procjena {formatDuration(a.estimatedMinutes)}</span>
          )}
        </span>
      </button>

      <div className="card-actions">
        {a.status === "todo" && (
          <button className="btn small" onClick={onStart}>
            <Icon name="play" size={13} /> Započni
          </button>
        )}
        {a.status === "in_progress" &&
          (running ? (
            <button className="btn small" onClick={onPause}>
              <Icon name="pause" size={13} /> Pauza
            </button>
          ) : (
            <button className="btn small" onClick={onStart}>
              <Icon name="play" size={13} /> Nastavi
            </button>
          ))}
        {a.status !== "done" && (
          <button className="btn small" onClick={() => onMove("done")}>
            <Icon name="check" size={13} /> Završi
          </button>
        )}
        {a.status === "done" && (
          <button className="btn small" onClick={() => onMove("todo")}>
            Vrati
          </button>
        )}
      </div>
    </article>
  );
}
