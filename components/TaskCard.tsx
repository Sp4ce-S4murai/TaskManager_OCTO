"use client";

import Image from "next/image";
import Link from "next/link";
import type { User } from "firebase/auth";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { CheckSquare, Square, Trash2 } from "lucide-react";
import CommentSection from "@/components/CommentSection";
import { db } from "@/lib/firebase";
import type { Task } from "@/lib/types";

function formatTimestamp(task: Task) {
  if (!task.timestamp) {
    return "aguardando timestamp";
  }

  return task.timestamp.toDate().toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

export default function TaskCard({ task, user, index }: { task: Task; user: User; index: number }) {
  const isDone = task.status === "done";
  const statusText = isDone ? "feito" : "pendente";
  const statusColor = isDone ? "text-terminal-green border-terminal-green hover:bg-terminal-green" : "text-terminal-yellow border-terminal-yellow hover:bg-terminal-yellow";

  const toggleStatus = async () => {
    await updateDoc(doc(db, "tasks", task.id), {
      status: isDone ? "todo" : "done"
    });
  };

  const handleDelete = async () => {
    if (window.confirm(`Tem certeza que deseja deletar a tarefa #${index} ("${task.title}")?`)) {
      await deleteDoc(doc(db, "tasks", task.id));
    }
  };

  const toggleChecklistItem = async (itemIndex: number) => {
    if (!task.checklist) return;
    const newChecklist = [...task.checklist];
    newChecklist[itemIndex].isDone = !newChecklist[itemIndex].isDone;
    
    await updateDoc(doc(db, "tasks", task.id), {
      checklist: newChecklist
    });
  };

  return (
    <article className="border border-terminal-cyan bg-terminal-black shadow-[0_0_10px_rgba(0,255,255,0.05)] hover:shadow-[0_0_15px_rgba(0,255,255,0.15)] transition-shadow">
      {task.imageUrl ? (
        <div className="relative aspect-[16/10] border-b border-terminal-cyan">
          <Image src={task.imageUrl} alt={task.title} fill className="object-cover opacity-80 grayscale" sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw" />
        </div>
      ) : null}

      <div className="p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase text-terminal-cyan">
              autor: {task.authorUid ? (
                <Link href={`/perfil/${task.authorUid}`} className="hover:underline hover:text-terminal-magenta transition-colors">
                  {task.authorEmail}
                </Link>
              ) : (
                task.authorEmail
              )}
            </p>
            <p className="text-xs uppercase text-terminal-cyan">hora: {formatTimestamp(task)}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs uppercase border hover:text-terminal-black transition-colors ${statusColor}`}
              type="button"
              onClick={() => void toggleStatus()}
            >
              {isDone ? <CheckSquare aria-hidden className="h-3.5 w-3.5" /> : <Square aria-hidden className="h-3.5 w-3.5" />}
              {statusText}
            </button>
            <button
              className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs uppercase border border-terminal-red text-terminal-red hover:bg-terminal-red hover:text-terminal-black transition-colors"
              type="button"
              onClick={() => void handleDelete()}
              aria-label={`Deletar tarefa ${task.title}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <h2 className={isDone ? "mb-2 text-xl font-bold uppercase line-through flex items-start gap-2 text-terminal-gray" : "mb-2 text-xl font-bold uppercase flex items-start gap-2 text-terminal-cyan"}>
          <span className="opacity-50 select-none">#{String(index).padStart(2, "0")}</span>
          <span className="break-all">{task.title}</span>
        </h2>
        {task.description ? <p className="mb-4 whitespace-pre-wrap text-sm leading-6 text-terminal-green/90">{task.description}</p> : null}
        
        {task.checklist && task.checklist.length > 0 && (
          <div className="mb-4 space-y-1.5">
            <h3 className="text-xs font-bold uppercase text-terminal-cyan mb-2 border-b border-terminal-cyan/30 pb-1">
              &gt; checklist de operação
            </h3>
            {task.checklist.map((item, itemIndex) => (
              <div key={item.id} className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => toggleChecklistItem(itemIndex)}
                  className={`mt-0.5 shrink-0 ${item.isDone ? 'text-terminal-green' : 'text-terminal-yellow hover:text-terminal-cyan'}`}
                >
                  {item.isDone ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>
                <span className={`text-sm ${item.isDone ? 'line-through text-terminal-gray' : 'text-terminal-green/90'}`}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <CommentSection taskId={task.id} user={user} />
    </article>
  );
}
