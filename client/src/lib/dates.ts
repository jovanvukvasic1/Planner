export const MINUTE = 60 * 1000;
export const DAY = 24 * 60 * MINUTE;

export const MONTHS = [
  "januar", "februar", "mart", "april", "maj", "jun",
  "jul", "avgust", "septembar", "oktobar", "novembar", "decembar",
];
export const WEEKDAYS_SHORT = ["Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"];
export const WEEKDAYS = ["Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota", "Nedjelja"];

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/** Indeks dana u sedmici, ponedjeljak = 0. */
export function weekdayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function startOfWeek(d: Date): Date {
  return addDays(startOfDay(d), -weekdayIndex(d));
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Minute od ponoci. */
export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function atMinutes(day: Date, minutes: number): Date {
  const d = startOfDay(day);
  d.setMinutes(minutes);
  return d;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function formatTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDate(d: Date): string {
  return `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}.`;
}

/** Vrijednost za <input type="date">. */
export function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Vrijednost za <input type="time">. */
export function toTimeInput(d: Date): string {
  return formatTime(d);
}

export function fromDateTimeInputs(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return new Date(y, m - 1, d, h, min);
}

export type View = "day" | "week" | "month";

/** Interval [from, to) koji se prikazuje za dati pogled. */
export function viewRange(view: View, date: Date): { from: Date; to: Date; days: Date[] } {
  if (view === "day") {
    const from = startOfDay(date);
    return { from, to: addDays(from, 1), days: [from] };
  }
  if (view === "week") {
    const from = startOfWeek(date);
    return { from, to: addDays(from, 7), days: Array.from({ length: 7 }, (_, i) => addDays(from, i)) };
  }
  // Mjesec: puna mreza od 6 sedmica, od ponedjeljka.
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const from = startOfWeek(first);
  return { from, to: addDays(from, 42), days: Array.from({ length: 42 }, (_, i) => addDays(from, i)) };
}

export function viewTitle(view: View, date: Date): string {
  if (view === "day") return `${WEEKDAYS[weekdayIndex(date)]}, ${formatDate(date)}`;
  if (view === "month") return `${MONTHS[date.getMonth()]} ${date.getFullYear()}.`;
  const from = startOfWeek(date);
  const to = addDays(from, 6);
  if (from.getMonth() === to.getMonth()) {
    return `${from.getDate()}. – ${to.getDate()}. ${MONTHS[to.getMonth()]} ${to.getFullYear()}.`;
  }
  if (from.getFullYear() === to.getFullYear()) {
    return `${from.getDate()}. ${MONTHS[from.getMonth()]} – ${to.getDate()}. ${MONTHS[to.getMonth()]} ${to.getFullYear()}.`;
  }
  return `${formatDate(from)} – ${formatDate(to)}`;
}

export function shiftDate(view: View, date: Date, dir: 1 | -1): Date {
  if (view === "day") return addDays(date, dir);
  if (view === "week") return addDays(date, 7 * dir);
  return addMonths(date, dir);
}

/** Sljedeci pun sat od sada (za podrazumijevano vrijeme zakazivanja). */
export function nextFullHour(day: Date): Date {
  const now = new Date();
  if (sameDay(day, now)) {
    const d = new Date(now);
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d;
  }
  return atMinutes(day, 9 * 60);
}
