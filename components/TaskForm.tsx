"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import { Send } from "lucide-react";
import type { TaskPrivacy, UserProfile } from "@/lib/types";

export default function TaskForm({
  user,
  userProfiles = {},
}: {
  user: User;
  userProfiles?: Record<string, UserProfile>;
}) {
  const router = useRouter();
  const [showSuccess, setShowSuccess] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [checklistInput, setChecklistInput] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [cardColor, setCardColor] = useState("terminal-green");
  const [privacy, setPrivacy] = useState<TaskPrivacy>("corporate");
  const [priority, setPriority] = useState("medium");

  const colors = [
    { id: "terminal-green", hex: "bg-terminal-green" },
    { id: "terminal-cyan", hex: "bg-terminal-cyan" },
    { id: "terminal-yellow", hex: "bg-terminal-yellow" },
    { id: "terminal-magenta", hex: "bg-terminal-magenta" },
    { id: "terminal-red", hex: "bg-terminal-red" }
  ];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle) {
      setError("Título da tarefa é obrigatório.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const checklistItems = checklistInput
        .split(",")
        .map(item => item.trim())
        .filter(item => item.length > 0)
        .map(item => ({
          id: Math.random().toString(36).substring(2, 11),
          text: item,
          isDone: false
        }));

      const idToken = await user.getIdToken();
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          title: trimmedTitle,
          description: trimmedDescription,
          checklist: checklistItems,
          cardColor: cardColor,
          privacy: privacy,
          assignedTo: assignedTo || null,
          dueDate: dueDate || null,
          authorEmail: user.email ?? "desconhecido",
          priority: priority,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Falha ao criar tarefa no servidor.");
      }

      setTitle("");
      setDescription("");
      setChecklistInput("");
      setAssignedTo("");
      setDueDate("");
      setPrivacy("corporate");
      setPriority("medium");
      setShowSuccess(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao criar tarefa.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border border-terminal-green p-5 bg-[#0a0a0a] shadow-[0_0_15px_rgba(0,255,65,0.1)]">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Title */}
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-widest text-terminal-green font-mono font-bold">&gt; criar tarefa *</span>
          <input
            className="w-full px-3 py-2 border border-terminal-green focus:outline-none focus:ring-1 focus:ring-terminal-green focus:border-terminal-green text-terminal-green bg-black font-mono text-sm placeholder-[#00FF41]/40"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Nova tarefa..."
            maxLength={140}
            required
          />
        </label>

        {/* Description */}
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-widest text-terminal-green font-mono font-bold">&gt; descrição</span>
          <input
            className="w-full px-3 py-2 border border-terminal-green focus:outline-none focus:ring-1 focus:ring-terminal-green focus:border-terminal-green text-terminal-green bg-black font-mono text-sm placeholder-[#00FF41]/40"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Detalhes opcionais..."
            maxLength={600}
          />
        </label>

        {/* Checklist */}
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-widest text-terminal-green font-mono font-bold">&gt; checklist (separado por vírgula)</span>
          <input
            className="w-full px-3 py-2 border border-terminal-green focus:outline-none focus:ring-1 focus:ring-terminal-green focus:border-terminal-green text-terminal-green bg-black font-mono text-sm placeholder-[#00FF41]/40"
            value={checklistInput}
            onChange={(event) => setChecklistInput(event.target.value)}
            placeholder="item 1, item 2..."
            maxLength={300}
          />
        </label>

        {/* Assignee */}
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-widest text-terminal-green font-mono font-bold">&gt; designar para</span>
          <select
            className="w-full px-3 py-2 border border-terminal-green focus:outline-none focus:ring-1 focus:ring-terminal-green focus:border-terminal-green text-terminal-green bg-black font-mono text-sm uppercase font-bold select-custom"
            value={assignedTo}
            onChange={(event) => setAssignedTo(event.target.value)}
          >
            <option value="" className="bg-black text-[#00FF41]/50">👤 Sem designação</option>
            {Object.values(userProfiles).map((prof) => (
              <option key={prof.uid} value={prof.uid} className="bg-black text-terminal-green">
                👤 {prof.name || prof.email}
              </option>
            ))}
          </select>
        </label>

        {/* Due Date */}
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-widest text-terminal-green font-mono font-bold">&gt; data limite (deadline)</span>
          <input
            type="date"
            className="w-full px-3 py-2 border border-terminal-green focus:outline-none focus:ring-1 focus:ring-terminal-green focus:border-terminal-green text-terminal-green bg-black font-mono text-sm cursor-pointer uppercase"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </label>

        {/* Privacy */}
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-widest text-terminal-green font-mono font-bold">&gt; privacidade</span>
          <select
            className="w-full px-3 py-2 border border-terminal-green focus:outline-none focus:ring-1 focus:ring-terminal-green focus:border-terminal-green text-terminal-green bg-black font-mono text-sm uppercase font-bold select-custom"
            value={privacy}
            onChange={(event) => setPrivacy(event.target.value as TaskPrivacy)}
          >
            <option value="corporate" className="bg-black text-terminal-green">👥 Corporativo</option>
            <option value="public" className="bg-black text-terminal-green">🌐 Público</option>
            <option value="private" className="bg-black text-terminal-green">🔒 Privado</option>
          </select>
        </label>

        {/* Priority */}
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-widest text-terminal-green font-mono font-bold">&gt; prioridade</span>
          <select
            className="w-full px-3 py-2 border border-terminal-green focus:outline-none focus:ring-1 focus:ring-terminal-green focus:border-terminal-green text-terminal-green bg-black font-mono text-sm uppercase font-bold select-custom"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          >
            <option value="low" className="bg-black text-terminal-green">▼ Baixa</option>
            <option value="medium" className="bg-black text-terminal-green">◆ Média</option>
            <option value="high" className="bg-black text-terminal-green">█ Alta</option>
          </select>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[#00FF41]/25 pt-4">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-widest text-terminal-green font-mono font-bold">&gt; cor do card</span>
          <div className="flex gap-2">
            {colors.map(c => (
              <button
                key={c.id}
                type="button"
                className={`w-6 h-6 ${c.hex} border-2 ${cardColor === c.id ? 'border-white' : 'border-transparent'} transition-all hover:scale-110`}
                onClick={() => setCardColor(c.id)}
                aria-label={`Selecionar cor ${c.id}`}
              />
            ))}
          </div>
        </div>

        <button 
          className="inline-flex items-center justify-center gap-2 px-6 py-2 border border-terminal-green text-terminal-green bg-black hover:bg-terminal-green hover:text-terminal-black transition-colors uppercase font-mono text-sm font-bold" 
          type="submit" 
          disabled={submitting}
        >
          <Send aria-hidden className="h-4 w-4" />
          {submitting ? "enviando..." : "adicionar"}
        </button>
      </div>

      {error ? <p className="mt-3 border border-terminal-red text-terminal-red p-3 text-xs font-mono uppercase font-bold bg-black">erro na tarefa: {error}</p> : null}

      {showSuccess && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[200] flex flex-col items-center justify-center font-mono select-none p-4">
          <div 
            className="border bg-black p-8 max-w-md w-full text-center relative shadow-[0_0_30px_rgba(0,255,65,0.15)] flex flex-col items-center"
            style={{ borderColor: "#00FF41" }}
          >
            {/* Scanline overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px] z-30" />
            
            <div className="mb-4 text-5xl text-terminal-green">
              ⚡
            </div>
            
            <h2 className="text-xl font-extrabold uppercase tracking-widest text-terminal-green mb-2">
              [TAREFA ADICIONADA]
            </h2>
            
            <p className="text-xs text-[#00FF41]/75 uppercase tracking-wide mb-8">
              A DIRETRIZ FOI REGISTRADA COM SUCESSO NO SISTEMA OCTO.
            </p>
            
            <div className="flex flex-col gap-3 w-full">
              <button
                type="button"
                onClick={() => setShowSuccess(false)}
                className="w-full py-2.5 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-black font-bold uppercase transition-colors text-xs"
              >
                &gt; ADICIONAR OUTRA TAREFA
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="w-full py-2.5 border border-terminal-yellow text-terminal-yellow hover:bg-terminal-yellow hover:text-black font-bold uppercase transition-colors text-xs"
              >
                &gt; VOLTAR AO PAINEL
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

