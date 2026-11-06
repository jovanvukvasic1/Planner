import { api } from "./api";
import type { Activity, ActivityInput } from "./types";

/** Promjena naslovne slike iz forme: nova slika ili uklanjanje postojece. */
export type CoverChange = { file: Blob } | { remove: true } | null;

/** Cuva aktivnost (novu ili postojecu) i zatim njenu naslovnu sliku. */
export async function saveActivity(data: ActivityInput, cover: CoverChange, existing?: Activity): Promise<Activity> {
  let saved = existing ? await api.activities.update(existing.id, data) : await api.activities.create(data);
  if (cover && "file" in cover) saved = await api.activities.setCover(saved.id, cover.file);
  else if (cover && "remove" in cover && saved.coverImage) saved = await api.activities.removeCover(saved.id);
  return saved;
}
