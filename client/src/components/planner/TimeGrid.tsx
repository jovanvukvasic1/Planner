import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DAY, WEEKDAYS_SHORT, atMinutes, formatTime, minutesOfDay, sameDay, weekdayIndex } from "../../lib/dates";
import type { Activity, Session } from "../../lib/types";
import Icon from "../Icon";
import { getDragPayload, hasDragPayload, setDragPayload, type DragPayload } from "./dnd";

const HOUR_HEIGHT = 48;
const SNAP = 15;

interface Props {
  days: Date[];
  sessions: Session[];
  deadlines: Activity[];
  onSlotClick: (start: Date) => void;
  onSessionClick: (session: Session) => void;
  onDeadlineClick: (activity: Activity) => void;
  onDrop: (payload: DragPayload, start: Date) => void;
}

interface Placed {
  session: Session;
  top: number;
  height: number;
  col: number;
  cols: number;
  startsBefore: boolean;
}

/** Rasporedjuje termine koji se preklapaju u kolone. */
function layoutDay(day: Date, sessions: Session[]): Placed[] {
  const dayStart = day.getTime();
  const dayEnd = dayStart + DAY;
  const items = sessions
    .map((s) => ({ s, start: new Date(s.start).getTime(), end: new Date(s.end).getTime() }))
    .filter((x) => x.start < dayEnd && x.end > dayStart)
    .map((x) => ({
      ...x,
      startMin: Math.max(0, (x.start - dayStart) / 60000),
      endMin: Math.min(24 * 60, (x.end - dayStart) / 60000),
    }))
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  const result: Placed[] = [];
  let cluster: Placed[] = [];
  let columns: number[] = [];
  let clusterEnd = -1;
  const flush = () => {
    for (const p of cluster) p.cols = columns.length;
    cluster = [];
    columns = [];
  };
  for (const it of items) {
    if (it.startMin >= clusterEnd) flush();
    let col = columns.findIndex((end) => end <= it.startMin);
    if (col === -1) {
      col = columns.length;
      columns.push(it.endMin);
    } else columns[col] = it.endMin;
    clusterEnd = Math.max(clusterEnd, it.endMin);
    const placed: Placed = {
      session: it.s,
      top: (it.startMin / 60) * HOUR_HEIGHT,
      height: Math.max(((it.endMin - it.startMin) / 60) * HOUR_HEIGHT, 18),
      col,
      cols: 1,
      startsBefore: it.start < dayStart,
    };
    cluster.push(placed);
    result.push(placed);
  }
  flush();
  return result;
}

function minutesFromEvent(e: React.MouseEvent, el: HTMLElement): number {
  const y = e.clientY - el.getBoundingClientRect().top;
  const min = Math.floor(((y / HOUR_HEIGHT) * 60) / SNAP) * SNAP;
  return Math.max(0, Math.min(24 * 60 - SNAP, min));
}

export default function TimeGrid({ days, sessions, deadlines, onSlotClick, onSessionClick, onDeadlineClick, onDrop }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(new Date());
  const [dropTarget, setDropTarget] = useState<{ day: number; minutes: number } | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // Pocetni skrol na 7:00.
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_HEIGHT;
  }, []);

  const single = days.length === 1;

  return (
    <div className={`time-grid${single ? " single" : ""}`} style={{ ["--days" as string]: days.length }}>
      <div className="tg-head">
        <div className="tg-gutter" />
        {days.map((d) => (
          <div key={d.getTime()} className={`tg-day-head${sameDay(d, now) ? " today" : ""}`}>
            <span className="tg-weekday">{WEEKDAYS_SHORT[weekdayIndex(d)]}</span>
            <span className="tg-date">{d.getDate()}</span>
          </div>
        ))}
      </div>

      <div className="tg-allday">
        <div className="tg-gutter tg-allday-label">Rok</div>
        {days.map((d) => {
          const items = deadlines.filter((a) => a.deadline && sameDay(new Date(a.deadline), d));
          return (
            <div key={d.getTime()} className="tg-allday-cell">
              {items.map((a) => (
                <button
                  key={a.id}
                  className={`deadline-chip${a.completed ? " done" : ""}`}
                  onClick={() => onDeadlineClick(a)}
                  title={`Rok: ${a.title} (${formatTime(new Date(a.deadline!))})`}
                >
                  {a.title}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      <div className="tg-body" ref={scrollRef}>
        <div className="tg-inner" style={{ height: 24 * HOUR_HEIGHT }}>
          <div className="tg-gutter tg-hours">
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} className="tg-hour" style={{ top: h * HOUR_HEIGHT }}>
                {h > 0 && `${String(h).padStart(2, "0")}:00`}
              </span>
            ))}
          </div>
          {days.map((day, di) => {
            const placed = layoutDay(day, sessions);
            const isToday = sameDay(day, now);
            return (
              <div
                key={day.getTime()}
                className="tg-col"
                onClick={(e) => {
                  if (e.target === e.currentTarget) onSlotClick(atMinutes(day, minutesFromEvent(e, e.currentTarget)));
                }}
                onDragOver={(e) => {
                  if (!hasDragPayload(e)) return;
                  e.preventDefault();
                  setDropTarget({ day: di, minutes: minutesFromEvent(e, e.currentTarget) });
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDropTarget(null);
                  const payload = getDragPayload(e);
                  if (!payload) return;
                  let minutes = minutesFromEvent(e, e.currentTarget);
                  if (payload.type === "session") {
                    minutes = Math.max(0, Math.round((minutes - payload.grabOffset) / SNAP) * SNAP);
                  }
                  onDrop(payload, atMinutes(day, minutes));
                }}
              >
                {placed.map(({ session: s, top, height, col, cols, startsBefore }) => {
                  const start = new Date(s.start);
                  const end = new Date(s.end);
                  const color = s.activity.folder?.color ?? "#737373";
                  return (
                    <div
                      key={s.id}
                      className={`tg-session${s.done ? " done" : ""}${height < 36 ? " compact" : ""}`}
                      style={{
                        top,
                        height,
                        left: `calc(${(col / cols) * 100}% + 2px)`,
                        width: `calc(${100 / cols}% - 4px)`,
                        ["--c" as string]: color,
                      }}
                      draggable
                      onDragStart={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const grabOffset = startsBefore ? 0 : ((e.clientY - rect.top) / HOUR_HEIGHT) * 60;
                        setDragPayload(e, { type: "session", id: s.id, grabOffset });
                      }}
                      onClick={() => onSessionClick(s)}
                      title={`${s.activity.title}\n${formatTime(start)} – ${formatTime(end)}`}
                    >
                      <span className="tg-session-title">
                        {s.done && <Icon name="check" size={12} />}
                        {s.activity.title}
                      </span>
                      <span className="tg-session-time">
                        {formatTime(start)} – {formatTime(end)}
                      </span>
                    </div>
                  );
                })}
                {dropTarget?.day === di && (
                  <div className="tg-drop" style={{ top: (dropTarget.minutes / 60) * HOUR_HEIGHT }}>
                    {formatTime(atMinutes(day, dropTarget.minutes))}
                  </div>
                )}
                {isToday && <div className="tg-now" style={{ top: (minutesOfDay(now) / 60) * HOUR_HEIGHT }} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

