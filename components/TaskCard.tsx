"use client";

import Image from "next/image";
import type { User } from "firebase/auth";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { CheckSquare, Square, Trash2 } from "lucide-react";
import CommentSection from "@/components/CommentSection";
import { db } from "@/lib/firebase";
import type { Task } from "@/lib/types";

function formatTimestamp(task: Task) {
  if (!task.timestamp) {
    return "pending timestamp";
  }

  return task.timestamp.toDate().toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short"
  });
}

export default function TaskCard({ task, user, index }: { task: Task; user: User; index: number }) {
  const isDone = task.status === "done";

  const toggleStatus = async () => {
    await updateDoc(doc(db, "tasks", task.id), {
      status: isDone ? "todo" : "done"
    });
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to permanently delete task #${index} ("${task.title}")?`)) {
      await deleteDoc(doc(db, "tasks", task.id));
    }
  };

  return (
    <article className="border border-terminal-green bg-terminal-black shadow-[0_0_10px_rgba(0,255,65,0.05)] hover:shadow-[0_0_15px_rgba(0,255,65,0.1)] transition-shadow">
      {task.imageUrl ? (
        <div className="relative aspect-[16/10] border-b border-terminal-green">
          <Image src={task.imageUrl} alt={task.title} fill className="object-cover opacity-80 grayscale" sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw" />
        </div>
      ) : null}

      <div className="p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase">author: {task.authorEmail}</p>
            <p className="text-xs uppercase">time: {formatTimestamp(task)}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs uppercase"
              type="button"
              onClick={() => void toggleStatus()}
            >
              {isDone ? <CheckSquare aria-hidden className="h-3.5 w-3.5" /> : <Square aria-hidden className="h-3.5 w-3.5" />}
              {task.status}
            </button>
            <button
              className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs uppercase border border-red-500 text-red-500 hover:bg-red-500 hover:text-black transition-colors"
              type="button"
              onClick={() => void handleDelete()}
              aria-label={`Delete task ${task.title}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <h2 className={isDone ? "mb-2 text-xl font-bold uppercase line-through flex items-start gap-2" : "mb-2 text-xl font-bold uppercase flex items-start gap-2"}>
          <span className="text-terminal-green/40 select-none">#{String(index).padStart(2, "0")}</span>
          <span className="break-all">{task.title}</span>
        </h2>
        {task.description ? <p className="mb-4 whitespace-pre-wrap text-sm leading-6 text-terminal-green/80">{task.description}</p> : null}
      </div>

      <CommentSection taskId={task.id} user={user} />
    </article>
  );
}
