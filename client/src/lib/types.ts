export interface User {
  id: number;
  username: string;
}

export interface Folder {
  id: number;
  name: string;
  color: string;
  parentId: number | null;
  _count?: { activities: number };
}

export interface FolderRef {
  id: number;
  name: string;
  color: string;
}

/** "todo" = za uraditi, "in_progress" = u radu ili pauzirano, "done" = zavrseno */
export type ActivityStatus = "todo" | "in_progress" | "done";

/** Odakle dolazi vrijeme rada: izmjereno tajmerom, procijenjeno (zavrseno bez mjerenja) ili nema */
export type TimeSource = "tracked" | "estimated" | "none";

/** 0 = nizak, 1 = srednji, 2 = visok */
export type Priority = 0 | 1 | 2;

export interface Activity {
  id: number;
  title: string;
  description: string | null;
  deadline: string | null;
  priority: Priority;
  estimatedMinutes: number | null;
  /** Naziv fajla naslovne slike (vidi coverUrl) */
  coverImage: string | null;
  status: ActivityStatus;
  completed: boolean;
  completedAt: string | null;
  /** Izmjereno vrijeme rada u zavrsenim periodima (sekunde) */
  workedSeconds: number;
  /** Pocetak tekuceg perioda rada ako tajmer trenutno radi */
  runningSince: string | null;
  timeSource: TimeSource;
  /** Vrijeme koje se racuna kao odradjeno (izmjereno ili procijenjeno) */
  creditedSeconds: number;
  folderId: number | null;
  folder: FolderRef | null;
  createdAt: string;
  _count?: { sessions: number };
}

export interface ActivityInput {
  title: string;
  description?: string | null;
  deadline?: string | null;
  priority?: Priority;
  estimatedMinutes?: number | null;
  folderId?: number | null;
  completed?: boolean;
  status?: ActivityStatus;
}

export interface WorkLog {
  id: number;
  start: string;
  end: string | null;
}

export interface ActivityDetail extends Activity {
  workLogs: WorkLog[];
}

export interface RunningTimer {
  id: number;
  start: string;
  activity: Activity;
}

export interface FolderInput {
  name: string;
  color?: string;
  parentId?: number | null;
}

export interface Session {
  id: number;
  start: string;
  end: string;
  done: boolean;
  activityId: number;
  activity: {
    id: number;
    title: string;
    deadline: string | null;
    priority: Priority;
    completed: boolean;
    status: ActivityStatus;
    folder: FolderRef | null;
  };
}

export interface SessionInput {
  activityId: number;
  start: string;
  end: string;
}
