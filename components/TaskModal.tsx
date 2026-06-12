"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type { User } from "firebase/auth";
import { CheckSquare, Square, Trash2, UserPlus, UserMinus, X, Terminal, Clock, Shield, AlertOctagon } from "lucide-react";
import CommentSection from "@/components/CommentSection";
import type { Task, UserProfile } from "@/lib/types";

// Helper functions for dates & styling
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
    return "#FF003C";
  } else if (deadlineDate >= todayStart && deadlineDate <= todayEnd) {
    return "#FFFF00";
  } else {
    return "#00FFFF";
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

function formatTimestamp(task: Task) {
  if (!task.timestamp) return "aguardando timestamp";
  return task.timestamp.toDate().toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

interface TaskModalProps {
  task: Task;
  user: User;
  index: number;
  userProfiles: Record<string, UserProfile>;
  colorHex: string;
  onClose: () => void;
  // Shared actions
  isAffiliated: boolean;
  isDone: boolean;
  toggleStatus: () => Promise<void>;
  toggleAffiliation: () => Promise<void>;
  handleDelete: () => Promise<void>;
  toggleChecklistItem: (itemIndex: number) => Promise<void>;
  addChecklistItem: (text: string) => Promise<void>;
}

export default function TaskModal({
  task,
  user,
  index,
  userProfiles,
  colorHex,
  onClose,
  isAffiliated,
  isDone,
  toggleStatus,
  toggleAffiliation,
  handleDelete,
  toggleChecklistItem,
  addChecklistItem,
}: TaskModalProps) {
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [submittingChecklist, setSubmittingChecklist] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close modal on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    // Lock body scroll when modal is open
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // Click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistItem.trim() || submittingChecklist) return;

    setSubmittingChecklist(true);
    try {
      await addChecklistItem(newChecklistItem.trim());
      setNewChecklistItem("");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingChecklist(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        handleBackdropClick(e);
      }}
      className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-3 md:p-6 overflow-y-auto font-mono select-none"
    >
      {/* CRT Scanline & Grid Effect overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] z-30" />

      {/* Dynamic Laser Scanline sweep */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
        <div 
          className="absolute left-0 right-0 h-[2px] opacity-20 shadow-[0_0_8px_currentColor]"
          style={{ color: colorHex }}
        />
      </div>

      {/* Main modal container */}
      <div
        ref={modalRef}
        className="relative w-full max-w-5xl bg-black border shadow-[0_0_30px_rgba(0,0,0,0.95)] max-h-[92vh] md:max-h-[85vh] flex flex-col overflow-hidden text-left"
        style={{
          borderColor: colorHex,
          color: colorHex,
          boxShadow: `0 0 25px ${colorHex}33`,
        }}
      >
        {/* Terminal Header */}
        <header
          className="flex items-center justify-between border-b px-4 py-2 text-xs md:text-sm uppercase font-bold tracking-wider shrink-0 bg-black"
          style={{ borderColor: colorHex }}
        >
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            <span>[DIRETRIZ_DECIFRADA_v1.3] // ID #{String(index).padStart(2, "0")}</span>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-2 py-1 text-xs border bg-transparent font-bold uppercase transition-all duration-150 shrink-0"
            style={{
              borderColor: "#FF003C",
              color: "#FF003C",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#FF003C";
              e.currentTarget.style.color = "#000";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#FF003C";
            }}
          >
            <X className="h-3.5 w-3.5" />
            <span>[FECHAR]</span>
          </button>
        </header>

        {/* Scrollable Layout grid */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 bg-black/90 select-text">
          
          {/* LEFT SECTION (Col Span 7 on Desktop): Task details & checklist */}
          <div className="md:col-span-7 space-y-6 flex flex-col">
            
            {/* Quick Actions Row */}
            <div className="flex flex-wrap gap-3 border-b border-dashed pb-4" style={{ borderColor: `${colorHex}44` }}>
              
              {/* Status toggler */}
              <button
                type="button"
                onClick={() => void toggleStatus()}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs uppercase border font-bold transition-all duration-150"
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
                {isDone ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                <span>{isDone ? "status: concluído" : "status: pendente"}</span>
              </button>

              {/* Affiliation button */}
              {user.uid !== task.authorUid && (
                <button
                  type="button"
                  onClick={() => void toggleAffiliation()}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs uppercase border font-bold transition-all duration-150"
                  style={{
                    borderColor: isAffiliated ? "#FFFF00" : colorHex,
                    color: isAffiliated ? "#FFFF00" : colorHex,
                  }}
                  onMouseEnter={(e) => {
                    const bg = isAffiliated ? "#FFFF00" : colorHex;
                    e.currentTarget.style.backgroundColor = bg;
                    e.currentTarget.style.color = "#000";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = isAffiliated ? "#FFFF00" : colorHex;
                  }}
                >
                  {isAffiliated ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                  <span>{isAffiliated ? "remover afiliação" : "afiliar-se"}</span>
                </button>
              )}

              {/* Delete button */}
              <button
                type="button"
                onClick={() => {
                  void handleDelete().then(() => onClose());
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs uppercase border border-[#FF003C] text-[#FF003C] hover:bg-[#FF003C] hover:text-black transition-all duration-150 ml-auto"
              >
                <Trash2 className="h-4 w-4" />
                <span>excluir</span>
              </button>
            </div>

            {/* Task Title */}
            <div>
              <h1 
                className="text-2xl md:text-3xl font-extrabold uppercase break-words leading-tight"
                style={{
                  color: isDone ? "#333333" : colorHex,
                  textDecoration: isDone ? "line-through" : "none",
                }}
              >
                #{String(index).padStart(2, "0")} {task.title}
              </h1>
            </div>

            {/* Metadata Grid panel */}
            <div 
              className="grid grid-cols-2 gap-4 p-4 border bg-zinc-950/40 text-xs md:text-sm uppercase tracking-wide"
              style={{ borderColor: `${colorHex}33` }}
            >
              <div>
                <p className="opacity-45">Autor:</p>
                <p className="font-bold text-white truncate">
                  {task.authorUid ? (
                    <Link
                      href={`/perfil/${task.authorUid}`}
                      onClick={onClose}
                      className="hover:underline transition-colors"
                      style={{ color: colorHex }}
                    >
                      {task.authorEmail}
                    </Link>
                  ) : (
                    task.authorEmail
                  )}
                </p>
              </div>

              <div>
                <p className="opacity-45">Registro:</p>
                <p className="font-bold text-white flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 opacity-60" /> {formatTimestamp(task)}
                </p>
              </div>

              <div>
                <p className="opacity-45">Prioridade:</p>
                <div className="mt-0.5">
                  <span className={`font-bold px-2 py-0.5 border text-[11px] inline-block ${
                    task.priority === "high"
                      ? "text-red-500 border-red-500 bg-red-950/20"
                      : task.priority === "low"
                        ? "text-blue-400 border-blue-400 bg-blue-950/20"
                        : "text-yellow-500 border-yellow-500 bg-yellow-950/20"
                  }`}>
                    {task.priority === "high" ? "█ ALTA" : task.priority === "low" ? "▼ BAIXA" : "◆ MÉDIA"}
                  </span>
                </div>
              </div>

              <div>
                <p className="opacity-45">Privacidade:</p>
                <p className="font-bold text-white flex items-center gap-1 mt-0.5">
                  <Shield className="w-3.5 h-3.5 opacity-60" />
                  {task.privacy === "private" ? "🔒 Privado" : task.privacy === "public" ? "🌐 Público" : "👥 Corporativo"}
                </p>
              </div>

              {task.assignedTo && (
                <div className="col-span-2 sm:col-span-1">
                  <p className="opacity-45">Atribuído a:</p>
                  <p className="font-bold text-white mt-1 text-xs">
                    <span className="border px-2 py-0.5 bg-black" style={{ borderColor: `${colorHex}44` }}>
                      👤 {userProfiles[task.assignedTo]?.name || userProfiles[task.assignedTo]?.email || "desconhecido"}
                    </span>
                  </p>
                </div>
              )}

              {task.dueDate && (
                <div className="col-span-2 sm:col-span-1">
                  <p className="opacity-45">Prazo final:</p>
                  <p 
                    className="font-bold font-mono text-xs mt-1 flex items-center gap-1.5"
                    style={{ color: getDeadlineColor(task.dueDate, isDone) }}
                  >
                    <span>{getDeadlineEmoji(task.dueDate, isDone)}</span>
                    <span className="border px-2 py-0.5 bg-black" style={{ borderColor: `${getDeadlineColor(task.dueDate, isDone)}55` }}>
                      {formatDateDisplay(task.dueDate)}
                    </span>
                  </p>
                </div>
              )}

              {task.affiliates && task.affiliates.length > 0 && (
                <div className="col-span-2">
                  <p className="opacity-45">Afiliados Operantes:</p>
                  <p className="text-white text-xs mt-1 flex flex-wrap gap-x-2 gap-y-1">
                    {task.affiliates.map((uid, idx) => {
                      const affProfile = userProfiles[uid];
                      const displayName = affProfile?.name || affProfile?.email || "desconhecido";
                      return (
                        <span key={uid} className="inline-block">
                          {idx > 0 && <span className="opacity-40 mr-2">,</span>}
                          <Link
                            href={`/perfil/${uid}`}
                            onClick={onClose}
                            className="hover:underline transition-colors font-bold"
                            style={{ color: colorHex }}
                          >
                            {displayName}
                          </Link>
                        </span>
                      );
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* Description Text block */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase opacity-50 flex items-center gap-1">
                <span>&gt; DESCRIÇÃO DA DIRETRIZ:</span>
              </h3>
              <div 
                className="p-4 border bg-zinc-950/20 text-sm leading-relaxed whitespace-pre-wrap min-h-[80px]"
                style={{ borderColor: `${colorHex}22`, color: isDone ? "#666" : "#00FF41cc" }}
              >
                {task.description ? task.description : <span className="italic opacity-30">Sem descrição arquivada.</span>}
              </div>
            </div>

            {/* Checklist items list */}
            <div className="space-y-3">
              <h3
                className="text-xs font-bold uppercase pb-1 flex items-center justify-between border-b"
                style={{ borderColor: `${colorHex}44` }}
              >
                <span>&gt; CHECKLIST DE OPERAÇÃO</span>
              </h3>

              {/* Progress bar */}
              {task.checklist && task.checklist.length > 0 && (() => {
                const doneCount = task.checklist.filter(item => item.isDone).length;
                const totalCount = task.checklist.length;
                const percentage = Math.round((doneCount / totalCount) * 100);
                return (
                  <div>
                    <div className="flex justify-between items-center text-[10px] uppercase font-mono tracking-wider mb-1">
                      <span>subtarefas: {doneCount} de {totalCount} concluídas</span>
                      <span>{percentage}%</span>
                    </div>
                    <div className="w-full bg-zinc-950 border border-zinc-800 h-2 relative overflow-hidden">
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: colorHex,
                        }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Item listing */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {task.checklist && task.checklist.map((item, itemIndex) => (
                  <div key={item.id} className="flex items-start gap-2.5 p-1.5 border border-transparent hover:bg-zinc-950/30 hover:border-zinc-900 transition-all">
                    <button
                      type="button"
                      onClick={() => void toggleChecklistItem(itemIndex)}
                      className="mt-0.5 shrink-0 transition-colors"
                      style={{ color: item.isDone ? "#00FF41" : "#FFFF00" }}
                    >
                      {item.isDone ? <CheckSquare className="w-4.5 h-4.5" /> : <Square className="w-4.5 h-4.5" />}
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

                {(!task.checklist || task.checklist.length === 0) && (
                  <p className="text-xs uppercase italic opacity-40 py-2">Nenhuma subtarefa registrada.</p>
                )}
              </div>

              {/* Add item form */}
              <form onSubmit={handleAddChecklist} className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Nova subtarefa..."
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  disabled={submittingChecklist}
                  className="flex-1 bg-black border text-xs px-3 py-2 outline-none placeholder-[#00FF41]/35 font-mono"
                  style={{ borderColor: `${colorHex}44` }}
                  maxLength={100}
                />
                <button
                  type="submit"
                  disabled={submittingChecklist || !newChecklistItem.trim()}
                  className="border px-4 py-2 text-xs uppercase font-mono font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    borderColor: colorHex,
                    color: colorHex,
                  }}
                  onMouseEnter={(e) => {
                    if (newChecklistItem.trim() && !submittingChecklist) {
                      e.currentTarget.style.backgroundColor = colorHex;
                      e.currentTarget.style.color = "#000";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = colorHex;
                  }}
                >
                  {submittingChecklist ? "..." : "+"}
                </button>
              </form>
            </div>

          </div>

          {/* RIGHT SECTION (Col Span 5 on Desktop): Visuals & Comments */}
          <div className="md:col-span-5 space-y-6 flex flex-col justify-between">
            
            {/* Task Image (with cyberpunk grid frame) */}
            {task.imageUrl && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase opacity-50">&gt; ESTRUTURA VISUAL:</h3>
                <div
                  className="relative w-full aspect-[16/10] bg-black border"
                  style={{ borderColor: colorHex }}
                >
                  <Image
                    src={task.imageUrl}
                    alt={task.title}
                    fill
                    className="object-cover opacity-80 grayscale hover:grayscale-0 transition-all duration-300"
                    sizes="(min-width: 1024px) 33vw, 100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                </div>
              </div>
            )}

            {/* Comments box (fills remaining space) */}
            <div className="flex-1 flex flex-col min-h-[300px]">
              <CommentSection taskId={task.id} user={user} />
            </div>

          </div>

        </div>

        {/* Modal Footer statusbar */}
        <footer
          className="px-4 py-2 text-[10px] uppercase border-t flex flex-col sm:flex-row justify-between gap-1.5 shrink-0 bg-black/95 opacity-80"
          style={{ borderColor: `${colorHex}44` }}
        >
          <span>SYS.CONNECTION: SECURE_CHANNEL_OCTO_NET</span>
          <span>OPERADOR: {user.email}</span>
        </footer>
      </div>
    </div>
  );
}
