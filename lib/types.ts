import type { Timestamp } from "firebase/firestore";

export type TaskStatus = "todo" | "done";

export interface UserProfile {
  uid: string;
  email: string;
  name?: string;
  bio?: string;
  avatar?: string;
  cardAnimation?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  isDone: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  authorEmail: string;
  authorUid: string;
  checklist?: ChecklistItem[];
  imageUrl?: string;
  cardColor?: string;
  timestamp: Timestamp | null;
}

export interface Comment {
  id: string;
  text: string;
  authorEmail: string;
  authorUid: string;
  timestamp: Timestamp | null;
}
