"use client";

import Image from "next/image";
import Link from "next/link";
import type { User } from "firebase/auth";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { CheckSquare, Square, Trash2 } from "lucide-react";
import CommentSection from "@/components/CommentSection";
import CardAnimations from "@/components/CardAnimations";
import { db } from "@/lib/firebase";
import type { Task } from "@/lib/types";

// Color definitions using inline styles so Tailwind purge is irrelevant
const COLOR_MAP: Record<string, { hex: string; name: string }> = {
  "terminal-green":   { hex: "#00FF41", name: "Verde" },
  "terminal-red":     { hex: "#FF003C", name: "Vermelho" },
  "terminal-yellow":  { hex: "#FFFF00", name: "Amarelo" },
  "terminal-cyan":    { hex: "#00FFFF", name: "Ciano" },
  "terminal-magenta": { hex: "#FF00FF", name: "Magenta" },
};

const DEFAULT_COLOR = COLOR_MAP["terminal-green"];

function getColor(cardColor?: string) {
  if (!cardColor) return DEFAULT_COLOR;
  return COLOR_MAP[cardColor] ?? DEFAULT_COLOR;
}

function formatTimestamp(task: Task) {
  if (!task.timestamp) return "aguardando timestamp";
  return task.timestamp.toDate().toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function TaskCard({
  task,
  user,
  index,
  authorAnimation = "none",
}: {
  task: Task;
  user: User;
  index: number;
  authorAnimation?: string;
}) {
  const isDone = task.status === "done";
  const color = getColor(task.cardColor);
  const colorHex = isDone ? "#333333" : color.hex;

  const toggleStatus = async () => {
    await updateDoc(doc(db, "tasks", task.id), {
      status: isDone ? "todo" : "done",
    });
  };

  const handleDelete = async () => {
    if (window.confirm(`Deletar tarefa #${index} "${task.title}"?`)) {
      await deleteDoc(doc(db, "tasks", task.id));
    }
  };

  const toggleChecklistItem = async (itemIndex: number) => {
    if (!task.checklist) return;
    const newChecklist = [...task.checklist];
    newChecklist[itemIndex] = {
      ...newChecklist[itemIndex],
      isDone: !newChecklist[itemIndex].isDone,
    };
    await updateDoc(doc(db, "tasks", task.id), { checklist: newChecklist });
  };

  return (
    <article
      className="relative overflow-hidden bg-[#000000] transition-shadow"
      style={{
        border: `1px solid ${colorHex}`,
        boxShadow: `0 0 12px ${colorHex}22`,
      }}
    >
      {/* Background animation — rendered below everything */}
      <CardAnimations type={authorAnimation} />

      {/* Task image */}
      {task.imageUrl && (
        <div
          className="relative aspect-[16/10] z-10"
          style={{ borderBottom: `1px solid ${colorHex}` }}
        >
          <Image
            src={task.imageUrl}
            alt={task.title}
            fill
            className="object-cover opacity-80 grayscale"
            sizes="(min-width:1280px) 33vw,(min-width:768px) 50vw,100vw"
          />
        </div>
      )}

      {/* Card body — semi-transparent so animation peeks through */}
      <div className="relative z-10 p-4 bg-black/65 backdrop-blur-[1px]">

        {/* Top row: author / buttons */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase" style={{ color: colorHex }}>
              autor:{" "}
              {task.authorUid ? (
                <Link
                  href={`/perfil/${task.authorUid}`}
                  className="hover:underline hover:text-white transition-colors"
                >
                  {task.authorEmail}
                </Link>
              ) : (
                task.authorEmail
              )}
            </p>
            <p className="text-xs uppercase opacity-60" style={{ color: colorHex }}>
              hora: {formatTimestamp(task)}
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            {/* Status toggle */}
            <button
              type="button"
              onClick={() => void toggleStatus()}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs uppercase border font-bold transition-colors hover:bg-opacity-90"
              style={{
                borderColor: colorHex,
                color: colorHex,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = colorHex;
                (e.currentTarget as HTMLButtonElement).style.color = "#000";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = colorHex;
              }}
            >
              {isDone ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
              {isDone ? "feito" : "pendente"}
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={() => void handleDelete()}
              aria-label={`Deletar tarefa ${task.title}`}
              className="inline-flex items-center justify-center px-2.5 py-1.5 text-xs uppercase border border-[#FF003C] text-[#FF003C] hover:bg-[#FF003C] hover:text-black transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Title */}
        <h2
          className="mb-2 text-xl font-bold uppercase flex items-start gap-2"
          style={{ color: isDone ? "#444" : colorHex, textDecoration: isDone ? "line-through" : "none" }}
        >
          <span className="opacity-40 select-none">#{String(index).padStart(2, "0")}</span>
          <span className="break-all">{task.title}</span>
        </h2>

        {/* Description */}
        {task.description && (
          <p className="mb-4 whitespace-pre-wrap text-sm leading-6 text-[#00FF41]/80">
            {task.description}
          </p>
        )}

        {/* Checklist */}
        {task.checklist && task.checklist.length > 0 && (
          <div className="mb-4 space-y-1.5">
            <h3
              className="text-xs font-bold uppercase mb-2 pb-1 opacity-50"
              style={{ borderBottom: `1px solid ${colorHex}`, color: colorHex }}
            >
              &gt; checklist de operação
            </h3>
            {task.checklist.map((item, itemIndex) => (
              <div key={item.id} className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => void toggleChecklistItem(itemIndex)}
                  className="mt-0.5 shrink-0 transition-colors"
                  style={{ color: item.isDone ? "#00FF41" : "#FFFF00" }}
                >
                  {item.isDone ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>
                <span
                  className="text-sm"
                  style={{
                    color: item.isDone ? "#444" : "#00FF41cc",
                    textDecoration: item.isDone ? "line-through" : "none",
                  }}
                >
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comment section */}
      <div className="relative z-10 bg-black/80">
        <CommentSection taskId={task.id} user={user} />
      </div>
    </article>
  );
}
