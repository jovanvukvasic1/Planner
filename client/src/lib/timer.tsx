import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";
import type { RunningTimer } from "./types";

interface TimerState {
  current: RunningTimer | null;
  /** Povecava se pri svakoj promjeni (start/pauza/zavrsetak) da bi stranice osvjezile podatke. */
  version: number;
  start: (activityId: number) => Promise<void>;
  pause: (activityId: number) => Promise<void>;
  finish: (activityId: number) => Promise<void>;
  /** Poziva se kad se aktivnosti promijene na drugi nacin (npr. kvacica, brisanje). */
  changed: () => void;
}

const TimerContext = createContext<TimerState | null>(null);

export function TimerProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<RunningTimer | null>(null);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => api.worklogs.current().then(setCurrent).catch(() => {}), []);

  useEffect(() => {
    refresh();
    // Osvjezi kad se korisnik vrati na tab (npr. tajmer pokrenut s drugog uredjaja).
    const onFocus = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [refresh]);

  const changed = useCallback(() => {
    setVersion((v) => v + 1);
    refresh();
  }, [refresh]);

  const wrap = (fn: (id: number) => Promise<unknown>) => async (id: number) => {
    await fn(id);
    changed();
  };

  return (
    <TimerContext.Provider
      value={{
        current,
        version,
        start: wrap(api.activities.start),
        pause: wrap(api.activities.pause),
        finish: wrap(api.activities.finish),
        changed,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer(): TimerState {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer mora biti unutar TimerProvider");
  return ctx;
}
