"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { collection, onSnapshot, or, orderBy, query, QueryDocumentSnapshot, where } from "firebase/firestore";
import TaskCard from "@/components/TaskCard";
import TaskForm from "@/components/TaskForm";
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
    affiliates: Array.isArray(data.affiliates) ? data.affiliates : []
  };
}

export default function TaskMural({ user, filterUid }: { user: User, filterUid?: string }) {
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
        if (filterUid) {
          mapped.sort((a, b) => {
            const tA = a.timestamp?.toMillis() ?? 0;
            const tB = b.timestamp?.toMillis() ?? 0;
            return tB - tA;
          });
        }
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

  return (
    <section className="mx-auto max-w-7xl px-4 py-5">
      {!filterUid && (
        <div className="mb-6">
          <TaskForm user={user} />
        </div>
      )}

      <div className="mb-4 mt-6 flex items-center justify-between border-y border-terminal-green py-2 text-sm uppercase text-terminal-green shadow-[0_0_10px_rgba(0,255,65,0.05)]">
        <span>&gt; fluxo do mural</span>
        <span className="text-terminal-green font-bold">{tasks.length} tarefas</span>
      </div>

      {loading ? <p className="border border-terminal-yellow p-4 uppercase text-terminal-yellow">carregando feed de tarefas...</p> : null}
      {error ? <p className="border border-terminal-red p-4 uppercase text-terminal-red">erro firestore: {error}</p> : null}
      {!loading && !error && tasks.length === 0 ? (
        <p className="border border-terminal-yellow p-4 uppercase text-terminal-yellow">nenhuma tarefa encontrada no mainframe.</p>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tasks.map((task, index) => {
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
