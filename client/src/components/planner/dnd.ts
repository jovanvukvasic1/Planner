/** Podaci koji se prenose prilikom prevlacenja (drag & drop) u planeru. */
export type DragPayload =
  | { type: "activity"; id: number }
  | { type: "session"; id: number; grabOffset: number };

export const DND_TYPE = "application/x-planer";

export function setDragPayload(e: React.DragEvent, payload: DragPayload) {
  e.dataTransfer.setData(DND_TYPE, JSON.stringify(payload));
  e.dataTransfer.effectAllowed = "move";
}

export function getDragPayload(e: React.DragEvent): DragPayload | null {
  try {
    const raw = e.dataTransfer.getData(DND_TYPE);
    return raw ? (JSON.parse(raw) as DragPayload) : null;
  } catch {
    return null;
  }
}

export function hasDragPayload(e: React.DragEvent): boolean {
  return e.dataTransfer.types.includes(DND_TYPE);
}
