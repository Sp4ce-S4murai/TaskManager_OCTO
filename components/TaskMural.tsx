"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { collection, onSnapshot, orderBy, query, QueryDocumentSnapshot } from "firebase/firestore";
import TaskCard from "@/components/TaskCard";
import TaskForm from "@/components/TaskForm";
import TerminalConsole from "@/components/TerminalConsole";
import { db } from "@/lib/firebase";
import type { Task } from "@/lib/types";

function mapTaskDocument(document: QueryDocumentSnapshot): Task {
  const data = document.data();

  return {
    id: document.id,
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    status: data.status === "done" ? "done" : "todo",
    authorEmail: String(data.authorEmail ?? "unknown"),
    imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : undefined,
    timestamp: data.timestamp ?? null
  };
}

export default function TaskMural({ user }: { user: User }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const tasksQuery = query(collection(db, "tasks"), orderBy("timestamp", "desc"));

    return onSnapshot(
      tasksQuery,
      (snapshot) => {
        setTasks(snapshot.docs.map(mapTaskDocument));
        setLoading(false);
        setError("");
      },
      (snapshotError) => {
        setError(snapshotError.message);
        setLoading(false);
      }
    );
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 py-5">
      <TerminalConsole user={user} tasks={tasks} />
      
      <TaskForm user={user} />

      <div className="mb-4 mt-6 flex items-center justify-between border-y border-terminal-green py-2 text-sm uppercase">
        <span>&gt; mural stream</span>
        <span>{tasks.length} tasks</span>
      </div>

      {loading ? <p className="border border-terminal-green p-4 uppercase">loading task feed...</p> : null}
      {error ? <p className="border border-terminal-green p-4 uppercase">firestore error: {error}</p> : null}
      {!loading && !error && tasks.length === 0 ? (
        <p className="border border-terminal-green p-4 uppercase">no tasks found. create the first command.</p>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tasks.map((task, index) => (
          <TaskCard key={task.id} task={task} user={user} index={index + 1} />
        ))}
      </div>
    </section>
  );
}
