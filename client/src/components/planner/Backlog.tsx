import { useMemo, useState } from "react";
import { deadlineUrgency, formatDuration, relativeDeadline } from "../../lib/format";
import type { Activity } from "../../lib/types";
import { setDragPayload } from "./dnd";

interface Props {
  activities: Activity[];
  onPick: (activity: Activity) => void;
}

/** Bocni panel s nezavrsenim aktivnostima: prvo one s rokom (najhitnije), zatim ostale. */
export default function Backlog({ activities, onPick }: Props) {
  const [search, setSearch] = useState("");

  const [withDeadline, withoutDeadline] = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q ? activities.filter((a) => a.title.toLowerCase().includes(q)) : activities;
    return [filtered.filter((a) => a.deadline), filtered.filter((a) => !a.deadline)];
  }, [activities, search]);

  const renderItem = (a: Activity) => {
    const urgency = deadlineUrgency(a.deadline);
    const planned = a._count?.sessions ?? 0;
    return (
      <li key={a.id}>
        <button
          className={`backlog-item urgency-${urgency}`}
          draggable
          onDragStart={(e) => setDragPayload(e, { type: "activity", id: a.id })}
          onClick={() => onPick(a)}
          title="Prevuci u planer ili klikni za zakazivanje"
        >
          <span className="backlog-title">
            {a.folder && <span className="folder-dot" style={{ background: a.folder.color }} />}
            {a.title}
          </span>
          <span className="backlog-meta">
            {a.deadline && <span className={`deadline-text ${urgency}`}>{relativeDeadline(a.deadline)}</span>}
            {a.priority === 2 && <span className="priority-text">visok prioritet</span>}
            {a.estimatedMinutes && <span>{formatDuration(a.estimatedMinutes)}</span>}
            {planned > 0 && <span>zakazano {planned}×</span>}
          </span>
        </button>
      </li>
    );
  };

  return (
    <div className="backlog">
      <div className="backlog-header">
        <h3>Za planiranje</h3>
        <input type="search" className="search small" placeholder="Pretraga" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="backlog-scroll">
        <section>
          <h4>Sa rokom</h4>
          {withDeadline.length ? <ul>{withDeadline.map(renderItem)}</ul> : <p className="muted small">Nema aktivnosti s rokom.</p>}
        </section>
        <section>
          <h4>Bez roka</h4>
          {withoutDeadline.length ? <ul>{withoutDeadline.map(renderItem)}</ul> : <p className="muted small">Nema.</p>}
        </section>
      </div>
      <p className="backlog-hint muted small">Prevuci aktivnost u kalendar ili je klikni za zakazivanje.</p>
    </div>
  );
}
