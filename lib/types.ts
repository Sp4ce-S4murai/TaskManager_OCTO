import type { Timestamp } from "firebase/firestore";

export type TaskStatus = "todo" | "done";

export interface UserProfile {
  uid: string;
  email: string;
  name?: string;
  bio?: string;
  avatar?: string;
  cardAnimation?: string;
  telegram_chat_id?: string | null;
  allow_browser_notifications?: boolean;
  notify_before_hours?: number;
  notify_overdue_daily?: boolean;
}

export interface ChecklistItem {
  id: string;
  text: string;
  isDone: boolean;
}

export type TaskPrivacy = "private" | "corporate" | "public";

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
  affiliates?: string[];
  privacy?: TaskPrivacy;
}

export interface Comment {
  id: string;
  text: string;
  authorEmail: string;
  authorUid: string;
  timestamp: Timestamp | null;
}
