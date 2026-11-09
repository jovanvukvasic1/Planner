import { useState } from "react";

export interface Series {
  key: string;
  name: string;
  /** CSS boja (varijabla) serije */
  color: string;
}

export interface Column {
  label: string;
  title: string;
  values: Record<string, number>;
}

interface Props {
  columns: Column[];
  series: Series[];
  /** vrijednost -> tekst (tooltip, tabela) */
  format: (v: number) => string;
  /** vrijednost -> broj na osi (npr. sekunde -> sati) */
  toAxis?: (v: number) => number;
  axisUnit?: string;
  /** cijeli brojevi na osi (npr. broj aktivnosti) */
  integer?: boolean;
  height?: number;
  ariaLabel: string;
}

/** "Lijepi" korak ose: 1, 2, 5 x 10^n. */
function niceStep(max: number, ticks = 4): number {
  if (max <= 0) return 1;
  const raw = max / ticks;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

/** Stubicasti grafikon (stubici jedan na drugom) s osom, legendom, tooltipom i tabelom. */
export default function ColumnChart({ columns, series, format, toAxis = (v) => v, axisUnit = "", integer = false, height = 180, ariaLabel }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const totals = columns.map((c) => series.reduce((t, s) => t + (c.values[s.key] ?? 0), 0));
  const maxAxis = Math.max(...totals.map(toAxis), 0);
  const step = integer ? Math.max(1, Math.round(niceStep(maxAxis))) : niceStep(maxAxis);
  const top = Math.max(step, Math.ceil(maxAxis / step) * step);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const labelEvery = columns.length > 16 ? 5 : 1;
  const fmtTick = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

  return (
    <div className="column-chart">
      {series.length > 1 && (
        <div className="chart-legend">
          {series.map((s) => (
            <span key={s.key} className="legend-item">
              <span className="legend-swatch" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}

      {!showTable && axisUnit && <span className="cc-unit">{axisUnit}</span>}
      {showTable ? (
        <table className="chart-table">
          <thead>
            <tr>
              <th>Period</th>
              {series.map((s) => (
                <th key={s.key}>{s.name}</th>
              ))}
              {series.length > 1 && <th>Ukupno</th>}
            </tr>
          </thead>
          <tbody>
            {columns.map((c, i) => (
              <tr key={i}>
                <td>{c.title}</td>
                {series.map((s) => (
                  <td key={s.key}>{format(c.values[s.key] ?? 0)}</td>
                ))}
                {series.length > 1 && <td>{format(totals[i])}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="cc-plot" style={{ height: height + 22 }} role="img" aria-label={ariaLabel}>
          <div className="cc-axis" style={{ height }}>
            {ticks.map((t) => (
              <span key={t} style={{ bottom: `${(t / top) * 100}%` }}>
                {fmtTick(t)}
              </span>
            ))}
          </div>
          <div className="cc-area">
            <div className="cc-grid" style={{ height }}>
              {ticks.map((t) => (
                <span key={t} style={{ bottom: `${(t / top) * 100}%` }} />
              ))}
            </div>
            <div className="cc-cols" style={{ height }}>
              {columns.map((c, i) => (
                <div
                  key={i}
                  className={`cc-col${hover === i ? " hover" : ""}`}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => setHover(hover === i ? null : i)}
                >
                  <div className="cc-stack">
                    {series.map((s) => {
                      const v = toAxis(c.values[s.key] ?? 0);
                      return v > 0 ? <div key={s.key} className="cc-seg" style={{ height: `${(v / top) * 100}%`, background: s.color }} /> : null;
                    })}
                  </div>
                  {hover === i && (
                    <div className={`chart-tip${i < columns.length / 4 ? " start" : i >= (columns.length * 3) / 4 ? " end" : ""}`}>
                      <strong>{c.title}</strong>
                      {series.map((s) => (
                        <span key={s.key}>
                          <span className="legend-swatch" style={{ background: s.color }} />
                          {s.name}: {format(c.values[s.key] ?? 0)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="cc-labels">
              {columns.map((c, i) => (
                <span key={i}>{i % labelEvery === 0 || i === columns.length - 1 ? c.label : ""}</span>
              ))}
            </div>
          </div>
        </div>
      )}
      <button className="link-btn small chart-toggle" onClick={() => setShowTable(!showTable)}>
        {showTable ? "Prikaži grafikon" : "Prikaži tabelu"}
      </button>
    </div>
  );
}
