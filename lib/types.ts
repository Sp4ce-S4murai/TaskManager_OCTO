import type { Timestamp } from "firebase/firestore";

export type TaskStatus = "todo" | "done";

export interface UserProfile {
  uid: string;
  email: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  authorEmail: string;
  imageUrl?: string;
  timestamp: Timestamp | null;
}

export interface Comment {
  id: string;
  text: string;
  authorEmail: string;
  timestamp: Timestamp | null;
}
