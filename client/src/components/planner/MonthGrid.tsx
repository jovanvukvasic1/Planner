import { WEEKDAYS_SHORT, formatTime, sameDay } from "../../lib/dates";
import type { Activity, Session } from "../../lib/types";
import { getDragPayload, hasDragPayload, type DragPayload } from "./dnd";

const MAX_ITEMS = 3;

interface Props {
  days: Date[];
  month: number;
  sessions: Session[];
  deadlines: Activity[];
  onDayClick: (day: Date) => void;
  onSessionClick: (session: Session) => void;
  onDeadlineClick: (activity: Activity) => void;
  onDrop: (payload: DragPayload, day: Date) => void;
}

export default function MonthGrid({ days, month, sessions, deadlines, onDayClick, onSessionClick, onDeadlineClick, onDrop }: Props) {
  const today = new Date();
  return (
    <div className="month-grid">
      {WEEKDAYS_SHORT.map((w) => (
        <div key={w} className="mg-weekday">
          {w}
        </div>
      ))}
      {days.map((day) => {
        const dayDeadlines = deadlines.filter((a) => a.deadline && sameDay(new Date(a.deadline), day));
        const daySessions = sessions.filter((s) => sameDay(new Date(s.start), day));
        const shownDeadlines = dayDeadlines.slice(0, MAX_ITEMS);
        const shownSessions = daySessions.slice(0, MAX_ITEMS - shownDeadlines.length);
        const hidden = dayDeadlines.length + daySessions.length - shownDeadlines.length - shownSessions.length;
        return (
          <div
            key={day.getTime()}
            className={`mg-day${day.getMonth() !== month ? " other" : ""}${sameDay(day, today) ? " today" : ""}`}
            onClick={(e) => {
              if (e.target === e.currentTarget) onDayClick(day);
            }}
            onDragOver={(e) => {
              if (!hasDragPayload(e)) return;
              e.preventDefault();
              e.currentTarget.classList.add("drop");
            }}
            onDragLeave={(e) => e.currentTarget.classList.remove("drop")}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove("drop");
              const payload = getDragPayload(e);
              if (payload) onDrop(payload, day);
            }}
          >
            <button className="mg-date" onClick={() => onDayClick(day)}>
              {day.getDate()}
            </button>
            {shownDeadlines.map((a) => (
              <button key={`d${a.id}`} className={`deadline-chip${a.completed ? " done" : ""}`} onClick={() => onDeadlineClick(a)}>
                {a.title}
              </button>
            ))}
            {shownSessions.map((s) => (
              <button
                key={s.id}
                className={`mg-session${s.done ? " done" : ""}`}
                style={{ ["--c" as string]: s.activity.folder?.color ?? "#737373" }}
                onClick={() => onSessionClick(s)}
              >
                <span className="mg-time">{formatTime(new Date(s.start))}</span> {s.activity.title}
              </button>
            ))}
            {hidden > 0 && (
              <button className="mg-more" onClick={() => onDayClick(day)}>
                još {hidden}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
