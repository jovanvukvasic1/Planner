import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { formatDate } from "../../lib/dates";
import { buildFolderTree, flattenTree, formatDuration, formatWorked } from "../../lib/format";
import { computeStats, periodRange, periodTitle, shiftPeriod, type Period, type StatsRaw } from "../../lib/stats";
import { useTimer } from "../../lib/timer";
import Icon from "../Icon";
import ColumnChart from "./ColumnChart";

const PERIODS: [Period, string][] = [
  ["week", "Sedmica"],
  ["month", "Mjesec"],
  ["year", "Godina"],
];
/** "u odnosu na ..." */
const PREV_ACC: Record<Period, string> = { week: "prošlu sedmicu", month: "prošli mjesec", year: "prošlu godinu" };
/** "Prošle sedmice: 3" */
const PREV_GEN: Record<Period, string> = { week: "Prošle sedmice", month: "Prošlog mjeseca", year: "Prošle godine" };

/** Sekunde -> "12h 30min" (zaokruzeno na minute). */
const hours = (s: number) => (s < 60 ? "0h" : formatDuration(Math.round(s / 60)));
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export default function StatsPage() {
  const timer = useTimer();
  const [period, setPeriod] = useState<Period>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [folderId, setFolderId] = useState<number | null>(null);
  const [raw, setRaw] = useState<StatsRaw | null>(null);
  const [error, setError] = useState("");

  const range = useMemo(() => periodRange(period, anchor), [period, anchor]);
  const prev = useMemo(() => periodRange(period, shiftPeriod(period, anchor, -1)), [period, anchor]);

  // Jedan zahtjev pokriva i prethodni period (za poredjenje).
  // timer.version: osvjezi kad se tajmer promijeni.
  const load = useCallback(() => {
    setError("");
    return api
      .stats(prev.from, range.to)
      .then(setRaw)
      .catch((err) => setError(err instanceof Error ? err.message : "Greška"));
  }, [prev.from, range.to, timer.version]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => (raw ? computeStats(raw, range.from, range.to, range.buckets, folderId) : null), [raw, range, folderId]);
  const prevStats = useMemo(
    () => (raw ? computeStats(raw, prev.from, prev.to, [{ start: prev.from, end: prev.to, label: "", title: "" }], folderId) : null),
    [raw, prev, folderId]
  );

  const folderOptions = raw ? flattenTree(buildFolderTree(raw.folders)) : [];

  const toolbar = (
    <div className="stats-toolbar">
      <div className="planner-nav">
        <button className="icon-btn bordered" onClick={() => setAnchor(shiftPeriod(period, anchor, -1))} aria-label="Prethodni period">
          <Icon name="left" />
        </button>
        <button className="icon-btn bordered" onClick={() => setAnchor(shiftPeriod(period, anchor, 1))} aria-label="Sljedeći period">
          <Icon name="right" />
        </button>
        <h2 className="planner-title">{periodTitle(period, anchor)}</h2>
      </div>
      <div className="stats-controls">
        <div className="segmented">
          {PERIODS.map(([p, label]) => (
            <button key={p} className={period === p ? "active" : ""} onClick={() => setPeriod(p)}>
              {label}
            </button>
          ))}
        </div>
        <select className="board-filter" value={folderId ?? ""} onChange={(e) => setFolderId(e.target.value ? Number(e.target.value) : null)}>
          <option value="">Svi folderi</option>
          {folderOptions.map((f) => (
            <option key={f.id} value={f.id}>
              {"  ".repeat(f.depth)}
              {f.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  if (!stats || !prevStats) {
    return (
      <div className="stats-page">
        {toolbar}
        {error ? <p className="error">{error}</p> : <p className="muted">Učitavanje...</p>}
      </div>
    );
  }

  const t = stats.totals;
  const worked = t.tracked + t.estimated;
  const prevWorked = prevStats.totals.tracked + prevStats.totals.estimated;
  const diff = worked - prevWorked;
  const d = stats.deadlines;
  const dueTotal = d.onTime.length + d.late.length + d.missed.length;
  const maxFolder = Math.max(...stats.folders.map((f) => f.seconds), 1);

  return (
    <div className="stats-page">
      {toolbar}
      {error && <p className="error">{error}</p>}

      <div className="stat-tiles">
        <div className="stat-tile">
          <span className="stat-label">Vrijeme rada</span>
          <span className="stat-value">{hours(worked)}</span>
          <span className="stat-sub">
            {Math.abs(diff) < 60 ? (
              <>isto kao {PREV_GEN[period].toLowerCase()}</>
            ) : (
              <>
                <span className={diff > 0 ? "delta-up" : "delta-down"}>
                  {diff > 0 ? "+" : "−"}
                  {hours(Math.abs(diff))}
                </span>{" "}
                u odnosu na {PREV_ACC[period]}
              </>
            )}
          </span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Završene aktivnosti</span>
          <span className="stat-value">{t.completed}</span>
          <span className="stat-sub">{PREV_GEN[period]}: {prevStats.totals.completed}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Ispoštovani rokovi</span>
          <span className="stat-value">{dueTotal ? `${pct(d.onTime.length, dueTotal)}%` : "–"}</span>
          <span className="stat-sub">
            {dueTotal ? `${d.onTime.length} od ${dueTotal} rokova` : "nema rokova u periodu"}
            {d.upcoming > 0 && ` · još ${d.upcoming} predstoji`}
          </span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Planirano u kalendaru</span>
          <span className="stat-value">{hours(t.planned)}</span>
          <span className="stat-sub">
            {t.planned >= 60 ? `odrađeno ${pct(t.plannedDone, t.planned)}% termina` : "nema zakazanih termina"}
          </span>
        </div>
      </div>

      <div className="stats-grid">
        <section className="stats-card wide">
          <header>
            <h3>Vrijeme rada</h3>
            <p className="muted small">
              Izmjereno tajmerom ({hours(t.tracked)}) i procijenjeno za aktivnosti završene bez mjerenja ({hours(t.estimated)}).
            </p>
          </header>
          <ColumnChart
            ariaLabel="Vrijeme rada po periodima"
            columns={stats.buckets.map((b) => ({ label: b.label, title: b.title, values: { tracked: b.tracked, estimated: b.estimated } }))}
            series={[
              { key: "tracked", name: "Izmjereno", color: "var(--series-1)" },
              { key: "estimated", name: "Procijenjeno", color: "var(--series-2)" },
            ]}
            format={(s) => formatWorked(s)}
            toAxis={(s) => s / 3600}
            axisUnit="h"
          />
        </section>

        <section className="stats-card">
          <header>
            <h3>Završene aktivnosti</h3>
          </header>
          <ColumnChart
            ariaLabel="Broj završenih aktivnosti po periodima"
            columns={stats.buckets.map((b) => ({ label: b.label, title: b.title, values: { completed: b.completed } }))}
            series={[{ key: "completed", name: "Završeno", color: "var(--series-1)" }]}
            format={(n) => String(n)}
            integer
            height={140}
          />
        </section>

        <section className="stats-card">
          <header>
            <h3>Rokovi</h3>
            <p className="muted small">Aktivnosti čiji je rok bio u ovom periodu.</p>
          </header>
          {dueTotal === 0 ? (
            <p className="muted small">Nema isteklih rokova u ovom periodu.</p>
          ) : (
            <>
              <div className="seg-bar" role="img" aria-label={`Na vrijeme ${d.onTime.length}, sa zakašnjenjem ${d.late.length}, propušteno ${d.missed.length}`}>
                {[
                  ["good", d.onTime.length],
                  ["serious", d.late.length],
                  ["critical", d.missed.length],
                ].map(([k, n]) =>
                  (n as number) > 0 ? (
                    <span key={k} className={`seg seg-${k}`} style={{ flexGrow: n as number }} title={String(n)}>
                      {pct(n as number, dueTotal) >= 12 ? `${pct(n as number, dueTotal)}%` : ""}
                    </span>
                  ) : null
                )}
              </div>
              <ul className="seg-legend">
                <li>
                  <span className="status-dot good"><Icon name="check" size={10} /></span> Na vrijeme <strong>{d.onTime.length}</strong>
                </li>
                <li>
                  <span className="status-dot serious"><Icon name="clock" size={10} /></span> Sa zakašnjenjem <strong>{d.late.length}</strong>
                </li>
                <li>
                  <span className="status-dot critical"><Icon name="close" size={10} /></span> Propušteno <strong>{d.missed.length}</strong>
                </li>
              </ul>
              {d.missed.length + d.late.length > 0 && (
                <ul className="deadline-list">
                  {[...d.missed, ...d.late].map((x) => (
                    <li key={x.id}>
                      <span className="deadline-list-title">{x.title}</span>
                      <span className="muted small">
                        rok {formatDate(x.deadline)}
                        {x.completedAt ? ` · završeno ${formatDate(x.completedAt)}` : " · nije završeno"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>

        <section className="stats-card">
          <header>
            <h3>Po folderima</h3>
            <p className="muted small">Vrijeme rada (izmjereno i procijenjeno).</p>
          </header>
          {stats.folders.length === 0 ? (
            <p className="muted small">Nema rada u ovom periodu.</p>
          ) : (
            <ul className="bar-list">
              {stats.folders.map((f) => (
                <li key={f.id ?? "none"}>
                  <span className="bar-label">
                    <span className="folder-dot" style={{ background: f.color }} />
                    {f.name}
                  </span>
                  <span className="bar-track">
                    <span className="bar-fill" style={{ width: `${(f.seconds / maxFolder) * 100}%` }} />
                  </span>
                  <span className="bar-value">
                    {hours(f.seconds)} <span className="muted">· {pct(f.seconds, worked)}%</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="stats-card">
          <header>
            <h3>Najviše rada</h3>
            <p className="muted small">Odrađeno u periodu u odnosu na procjenu aktivnosti.</p>
          </header>
          {stats.top.length === 0 ? (
            <p className="muted small">Nema rada u ovom periodu.</p>
          ) : (
            <table className="top-table">
              <thead>
                <tr>
                  <th>Aktivnost</th>
                  <th>Rad</th>
                  <th>Procjena</th>
                </tr>
              </thead>
              <tbody>
                {stats.top.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <span className="top-title">
                        {a.folder && <span className="folder-dot" style={{ background: a.folder.color }} />}
                        {a.title}
                      </span>
                    </td>
                    <td>
                      {formatWorked(a.seconds)}
                      {a.estimatedOnly && <span className="muted"> (proc.)</span>}
                    </td>
                    <td className="muted">{a.estimatedMinutes ? formatDuration(a.estimatedMinutes) : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
