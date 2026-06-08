"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { collection, onSnapshot, or, orderBy, query, QueryDocumentSnapshot, where } from "firebase/firestore";
import TaskCard from "@/components/TaskCard";
import { db } from "@/lib/firebase";
import type { Task, UserProfile } from "@/lib/types";

function mapTaskDocument(document: QueryDocumentSnapshot): Task {
  const data = document.data();

  return {
    id: document.id,
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    status: data.status === "done" ? "done" : "todo",
    authorEmail: String(data.authorEmail ?? "desconhecido"),
    authorUid: String(data.authorUid ?? ""),
    checklist: Array.isArray(data.checklist) ? data.checklist : undefined,
    imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : undefined,
    cardColor: typeof data.cardColor === "string" ? data.cardColor : undefined,
    timestamp: data.timestamp ?? null,
    affiliates: Array.isArray(data.affiliates) ? data.affiliates : [],
    privacy: (data.privacy === "private" || data.privacy === "public") ? data.privacy : "corporate",
    priority: (data.priority === "high" || data.priority === "low" || data.priority === "medium") ? data.priority : "medium",
  };
}

interface TaskMuralProps {
  user: User;
  filterUid?: string;
  searchQuery?: string;
  statusFilter?: string; // "all" | "todo" | "done"
  sortBy?: string; // "newest" | "oldest" | "priority"
}

export default function TaskMural({
  user,
  filterUid,
  searchQuery = "",
  statusFilter = "all",
  sortBy = "newest",
}: TaskMuralProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let tasksQuery;
    
    if (filterUid) {
      tasksQuery = query(
        collection(db, "tasks"),
        or(
          where("authorUid", "==", filterUid),
          where("affiliates", "array-contains", filterUid)
        )
      );
    } else {
      tasksQuery = query(collection(db, "tasks"), orderBy("timestamp", "desc"));
    }

    return onSnapshot(
      tasksQuery,
      (snapshot) => {
        const mapped = snapshot.docs.map(mapTaskDocument);
        setTasks(mapped);
        setLoading(false);
        setError("");
      },
      (snapshotError) => {
        setError(snapshotError.message);
        setLoading(false);
      }
    );
  }, [filterUid]);

  useEffect(() => {
    // Fetch users collection to map uid -> UserProfile
    const usersQuery = collection(db, "users");
    return onSnapshot(usersQuery, (snapshot) => {
      const profilesMap: Record<string, UserProfile> = {};
      snapshot.forEach(doc => {
        profilesMap[doc.id] = doc.data() as UserProfile;
      });
      setUserProfiles(profilesMap);
    });
  }, []);

  // Filter tasks
  let processedTasks = tasks.filter((task) => {
    // 1. Privacy filtering
    if (filterUid) {
      // Profile view: Hide if private and current logged-in user is not the author
      if (task.privacy === "private" && task.authorUid !== user.uid) {
        return false;
      }
    } else {
      // Main feed view
      if (task.privacy === "corporate") {
        // ok
      } else if (task.privacy === "private") {
        if (task.authorUid !== user.uid) return false;
      } else {
        // public is hidden in feed
        return false;
      }
    }

    // 2. Search query filtering (case-insensitive string search in title/description)
    if (searchQuery && searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = (task.title || "").toLowerCase().includes(q);
      const matchDesc = (task.description || "").toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }

    // 3. Status filtering
    if (statusFilter && statusFilter !== "all") {
      if (task.status !== statusFilter) return false;
    }

    return true;
  });

  // Sort tasks
  processedTasks = [...processedTasks]; // avoid mutating state directly
  if (sortBy === "oldest") {
    processedTasks.sort((a, b) => {
      const tA = a.timestamp?.toMillis() ?? 0;
      const tB = b.timestamp?.toMillis() ?? 0;
      return tA - tB;
    });
  } else if (sortBy === "priority") {
    const priorityWeight: Record<string, number> = {
      high: 3,
      medium: 2,
      low: 1,
    };
    processedTasks.sort((a, b) => {
      const wA = priorityWeight[a.priority || "medium"] || 2;
      const wB = priorityWeight[b.priority || "medium"] || 2;
      if (wB !== wA) {
        return wB - wA; // higher priority first
      }
      // If priority is equal, sort by newest
      const tA = a.timestamp?.toMillis() ?? 0;
      const tB = b.timestamp?.toMillis() ?? 0;
      return tB - tA;
    });
  } else {
    // Default: newest
    processedTasks.sort((a, b) => {
      const tA = a.timestamp?.toMillis() ?? 0;
      const tB = b.timestamp?.toMillis() ?? 0;
      return tB - tA;
    });
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-5 w-full">
      <div className="mb-4 flex items-center justify-between border-y border-terminal-green py-2 text-sm uppercase text-terminal-green shadow-[0_0_10px_rgba(0,255,65,0.05)] font-mono">
        <span>&gt; fluxo do mural</span>
        <span className="text-terminal-green font-bold">{processedTasks.length} tarefas</span>
      </div>

      {loading ? <p className="border border-terminal-yellow p-4 uppercase text-terminal-yellow font-mono">carregando feed de tarefas...</p> : null}
      {error ? <p className="border border-terminal-red p-4 uppercase text-terminal-red font-mono font-bold">erro firestore: {error}</p> : null}
      {!loading && !error && processedTasks.length === 0 ? (
        <p className="border border-terminal-yellow p-4 uppercase text-terminal-yellow font-mono">nenhuma tarefa encontrada no mainframe.</p>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {processedTasks.map((task, index) => {
          const animation = task.authorUid ? (userProfiles[task.authorUid]?.cardAnimation || "none") : "none";
          return (
            <TaskCard 
              key={task.id} 
              task={task} 
              user={user} 
              index={index + 1} 
              authorAnimation={animation} 
              userProfiles={userProfiles}
            />
          );
        })}
      </div>
    </section>
  );
}
