"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import type { User } from "firebase/auth";
import { CheckSquare, Square, Trash2, UserPlus, UserMinus } from "lucide-react";
import CommentSection from "@/components/CommentSection";
import CardAnimations from "@/components/CardAnimations";
import TaskModal from "@/components/TaskModal";
import type { Task, UserProfile } from "@/lib/types";

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

function parseDate(val: any): Date | null {
  if (!val) return null;
  if (typeof val === "string") {
    const parts = val.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function getDeadlineColor(dueDateStr: string, isDone: boolean): string {
  if (isDone) return "#333333";
  const deadlineDate = parseDate(dueDateStr);
  if (!deadlineDate) return "#00FF41";

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (deadlineDate < todayStart) {
    return "#FF003C"; // Red for overdue
  } else if (deadlineDate >= todayStart && deadlineDate <= todayEnd) {
    return "#FFFF00"; // Yellow for today
  } else {
    return "#00FFFF"; // Cyan for future
  }
}

function getDeadlineEmoji(dueDateStr: string, isDone: boolean): string {
  if (isDone) return "✅";
  const deadlineDate = parseDate(dueDateStr);
  if (!deadlineDate) return "📅";

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (deadlineDate < todayStart) {
    return "🚨";
  } else if (deadlineDate >= todayStart && deadlineDate <= todayEnd) {
    return "⚠️";
  } else {
    return "📅";
  }
}

function formatDateDisplay(dueDateStr: string): string {
  const d = parseDate(dueDateStr);
  if (!d) return dueDateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function TaskCard({
  task,
  user,
  index,
  authorAnimation = "none",
  userProfiles = {},
}: {
  task: Task;
  user: User;
  index: number;
  authorAnimation?: string;
  userProfiles?: Record<string, UserProfile>;
}) {
  const isDone = task.status === "done";
  const color = getColor(task.cardColor);
  const colorHex = isDone ? "#333333" : color.hex;

  // Interactive UI states
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [hoverState, setHoverState] = useState<"idle" | "glitch" | "resting">("idle");
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const [newChecklistItem, setNewChecklistItem] = useState("");

  const addChecklistItem = async (text: string) => {
    if (!text.trim()) return;

    const newItem = {
      id: Math.random().toString(36).substring(2, 11),
      text: text.trim(),
      isDone: false,
    };

    const newChecklist = [...(task.checklist || []), newItem];

    const idToken = await user.getIdToken();
    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      body: JSON.stringify({ checklist: newChecklist }),
    });

    if (!response.ok) {
      throw new Error("Falha ao adicionar item ao checklist.");
    }
  };

  const handleInlineAddChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistItem.trim()) return;

    try {
      await addChecklistItem(newChecklistItem);
      setNewChecklistItem("");
    } catch (err) {
      console.error(err);
      alert("Erro ao adicionar item ao checklist.");
    }
  };

  // Affiliation Logic
  const isAffiliated = task.affiliates?.includes(user.uid) ?? false;

  const toggleAffiliation = async () => {
    const newAffiliates = isAffiliated
      ? (task.affiliates ?? []).filter((uid) => uid !== user.uid)
      : [...(task.affiliates ?? []), user.uid];

    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({ affiliates: newAffiliates }),
      });
      if (!response.ok) {
        throw new Error("Falha ao atualizar afiliação da tarefa.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao afiliar-se na tarefa.");
    }
  };

  const toggleStatus = async () => {
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({ status: isDone ? "todo" : "done" }),
      });
      if (!response.ok) {
        throw new Error("Falha ao atualizar status da tarefa.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao alterar o status da tarefa.");
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Deletar tarefa #${index} "${task.title}"?`)) {
      try {
        const idToken = await user.getIdToken();
        const response = await fetch(`/api/tasks/${task.id}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${idToken}`,
          },
        });
        if (!response.ok) {
          throw new Error("Falha ao excluir a tarefa.");
        }
      } catch (err) {
        console.error(err);
        alert("Erro ao excluir a tarefa.");
      }
    }
  };

  const toggleChecklistItem = async (itemIndex: number) => {
    if (!task.checklist) return;
    const newChecklist = [...task.checklist];
    newChecklist[itemIndex] = {
      ...newChecklist[itemIndex],
      isDone: !newChecklist[itemIndex].isDone,
    };
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({ checklist: newChecklist }),
      });
      if (!response.ok) {
        throw new Error("Falha ao atualizar item do checklist.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar item do checklist.");
    }
  };

  const isGlitch = hoverState === "glitch";
  const isResting = hoverState === "resting";

  const handleCardClick = () => {
    setIsClicking(true);
    setTimeout(() => {
      setIsClicking(false);
      setIsModalOpen(true);
    }, 150);
  };

  const handleMouseEnter = () => {
    setHoverState("glitch");
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHoverState("resting");
    }, 350);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoverState("idle");
  };

  return (
    <article
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden bg-[#000000] cursor-pointer ${
        isGlitch ? "card-glitch-effect" : ""
      } ${
        isResting ? "card-resting-effect" : ""
      }`}
      style={{
        border: `1px solid ${colorHex}`,
        boxShadow: isResting ? `0 0 22px ${colorHex}` : `0 0 12px ${colorHex}22`,
        transform: isResting ? "translateY(-6px) scale(1.025)" : isClicking ? "scale(0.97)" : "none",
        transition: "transform 0.22s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.22s cubic-bezier(0.25, 0.8, 0.25, 1), border-color 0.22s ease",
      }}
    >
      {/* Laser scanline sweep when resting */}
      {isResting && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-25">
          <div 
            className="absolute left-0 right-0 h-[2px] opacity-40 shadow-[0_0_8px_currentColor] animate-scanline"
            style={{ color: colorHex }}
          />
        </div>
      )}

      {/* Click flash screen overlay */}
      {isClicking && (
        <div 
          className="absolute inset-0 bg-current opacity-30 z-30 pointer-events-none transition-opacity duration-150"
          style={{ color: colorHex }}
        />
      )}

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

      {/* Card body — transparent so animation is fully visible */}
      <div className="relative z-10 p-4 bg-transparent">

        {/* Top row: author / buttons */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase" style={{ color: colorHex }}>
              autor:{" "}
              {task.authorUid ? (
                <Link
                  href={`/perfil/${task.authorUid}`}
                  className="hover:underline hover:text-white transition-colors"
                  onClick={(e) => e.stopPropagation()}
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
            <p className="text-xs uppercase opacity-60 mt-0.5" style={{ color: colorHex }}>
              privacidade: {task.privacy === "private" ? "🔒 Privado" : task.privacy === "public" ? "🌐 Público" : "👥 Corporativo"}
            </p>
            <p className="text-xs uppercase mt-0.5" style={{ color: colorHex }}>
              prioridade:{" "}
              <span className={`font-bold px-1.5 py-0.5 border text-[10px] ${
                task.priority === "high" 
                  ? "text-red-500 border-red-500 bg-red-950/20" 
                  : task.priority === "low" 
                    ? "text-blue-400 border-blue-400 bg-blue-950/20"
                    : "text-yellow-500 border-yellow-500 bg-yellow-950/20"
              }`}>
                {task.priority === "high" ? "█ ALTA" : task.priority === "low" ? "▼ BAIXA" : "◆ MÉDIA"}
              </span>
            </p>
            {task.assignedTo && (
              <p className="text-xs uppercase mt-1" style={{ color: colorHex }}>
                designado para:{" "}
                <span className="font-bold text-white bg-black px-1.5 py-0.5 border border-[#00FF41]/25 text-[10px]">
                  👤 {userProfiles[task.assignedTo]?.name || userProfiles[task.assignedTo]?.email || "desconhecido"}
                </span>
              </p>
            )}
            {task.dueDate && (
              <p className="text-xs uppercase mt-1 flex items-center gap-1 font-mono font-bold" style={{ color: getDeadlineColor(task.dueDate, isDone) }}>
                {getDeadlineEmoji(task.dueDate, isDone)} prazo: {formatDateDisplay(task.dueDate)}
              </p>
            )}
            {task.affiliates && task.affiliates.length > 0 && (
              <p className="text-xs uppercase mt-1.5" style={{ color: colorHex }}>
                afiliados:{" "}
                {task.affiliates.map((uid, idx) => {
                  const affProfile = userProfiles[uid];
                  const displayName = affProfile?.name || affProfile?.email || "desconhecido";
                  return (
                    <span key={uid}>
                      {idx > 0 && ", "}
                      <Link
                        href={`/perfil/${uid}`}
                        className="hover:underline hover:text-white transition-colors font-bold"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {displayName}
                      </Link>
                    </span>
                  );
                })}
              </p>
            )}
          </div>

          <div className="flex gap-2 shrink-0 items-center">
            {/* Affiliate Toggle */}
            {user.uid !== task.authorUid && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); void toggleAffiliation(); }}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs uppercase border font-bold transition-colors"
                style={{
                  borderColor: isAffiliated ? "#FFFF00" : colorHex,
                  color: isAffiliated ? "#FFFF00" : colorHex,
                }}
                onMouseEnter={(e) => {
                  const target = e.currentTarget as HTMLButtonElement;
                  target.style.backgroundColor = isAffiliated ? "#FFFF00" : colorHex;
                  target.style.color = "#000";
                }}
                onMouseLeave={(e) => {
                  const target = e.currentTarget as HTMLButtonElement;
                  target.style.backgroundColor = "transparent";
                  target.style.color = isAffiliated ? "#FFFF00" : colorHex;
                }}
              >
                {isAffiliated ? <UserMinus className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                {isAffiliated ? "desafiliar" : "afiliar-se"}
              </button>
            )}

            {/* Status toggle */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); void toggleStatus(); }}
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
              onClick={(e) => { e.stopPropagation(); void handleDelete(); }}
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
        <div className="mb-4 space-y-1.5">
          <h3
            className="text-xs font-bold uppercase mb-2 pb-1 opacity-50 flex items-center justify-between"
            style={{ borderBottom: `1px solid ${colorHex}`, color: colorHex }}
          >
            <span>&gt; checklist de operação</span>
          </h3>

          {/* Progress Bar */}
          {task.checklist && task.checklist.length > 0 && (() => {
            const doneCount = task.checklist.filter(item => item.isDone).length;
            const totalCount = task.checklist.length;
            const percentage = Math.round((doneCount / totalCount) * 100);
            return (
              <div className="mb-3">
                <div className="flex justify-between items-center text-[10px] uppercase font-mono tracking-wider mb-1" style={{ color: colorHex }}>
                  <span>subtarefas: {doneCount} de {totalCount} concluídas</span>
                  <span>{percentage}%</span>
                </div>
                <div className="w-full bg-zinc-950 border border-zinc-800 h-1.5 relative overflow-hidden">
                  <div 
                    className="h-full transition-all duration-300"
                    style={{ 
                      width: `${percentage}%`, 
                      backgroundColor: colorHex 
                    }} 
                  />
                </div>
              </div>
            );
          })()}

          {/* Checklist Items */}
          {task.checklist && task.checklist.map((item, itemIndex) => (
            <div key={item.id} className="flex items-start gap-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); void toggleChecklistItem(itemIndex); }}
                className="mt-0.5 shrink-0 transition-colors"
                style={{ color: item.isDone ? "#00FF41" : "#FFFF00" }}
              >
                {item.isDone ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              </button>
              <span
                className="text-sm break-all"
                style={{
                  color: item.isDone ? "#444" : "#00FF41cc",
                  textDecoration: item.isDone ? "line-through" : "none",
                }}
              >
                {item.text}
              </span>
            </div>
          ))}

          {/* Add Item Form */}
          <form onSubmit={handleInlineAddChecklistItem} className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              placeholder="Nova subtarefa..."
              value={newChecklistItem}
              onChange={(e) => setNewChecklistItem(e.target.value)}
              className="flex-1 bg-black border text-xs px-2 py-1 outline-none text-terminal-green placeholder-[#00FF41]/35 font-mono"
              style={{ borderColor: `${colorHex}55` }}
              maxLength={100}
            />
            <button
              type="submit"
              className="border px-2 py-1 text-xs uppercase font-mono font-bold transition-all hover:text-black"
              style={{ 
                borderColor: colorHex, 
                color: colorHex,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colorHex;
                e.currentTarget.style.color = "#000";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = colorHex;
              }}
            >
              +
            </button>
          </form>
        </div>
      </div>

      {/* Comment section */}
      <div className="relative z-10 bg-black/80" onClick={(e) => e.stopPropagation()}>
        <CommentSection taskId={task.id} user={user} />
      </div>

      {/* Portal-rendered Cyberpunk Modal */}
      {mounted && isModalOpen && createPortal(
        <TaskModal
          task={task}
          user={user}
          index={index}
          userProfiles={userProfiles}
          colorHex={colorHex}
          onClose={() => setIsModalOpen(false)}
          isAffiliated={isAffiliated}
          isDone={isDone}
          toggleStatus={toggleStatus}
          toggleAffiliation={toggleAffiliation}
          handleDelete={handleDelete}
          toggleChecklistItem={toggleChecklistItem}
          addChecklistItem={addChecklistItem}
        />,
        document.body
      )}
    </article>
  );
}
