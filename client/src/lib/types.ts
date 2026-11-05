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

/** 0 = nizak, 1 = srednji, 2 = visok */
export type Priority = 0 | 1 | 2;

export interface Activity {
  id: number;
  title: string;
  description: string | null;
  deadline: string | null;
  priority: Priority;
  estimatedMinutes: number | null;
  completed: boolean;
  completedAt: string | null;
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
    folder: FolderRef | null;
  };
}

export interface SessionInput {
  activityId: number;
  start: string;
  end: string;
}
