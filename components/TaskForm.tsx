"use client";

import { FormEvent, useState } from "react";
import type { User } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Send } from "lucide-react";
import { db } from "@/lib/firebase";

export default function TaskForm({ user }: { user: User }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [checklistInput, setChecklistInput] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      const checklistItems = checklistInput.split(",")
        .map(item => item.trim())
        .filter(item => item.length > 0)
        .map(item => ({
          id: Math.random().toString(36).substr(2, 9),
          text: item,
          isDone: false
        }));

      await addDoc(collection(db, "tasks"), {
        title: trimmedTitle,
        description: trimmedDescription,
        status: "todo",
        authorEmail: user.email ?? "desconhecido",
        authorUid: user.uid,
        checklist: checklistItems,
        imageUrl: null,
        timestamp: serverTimestamp()
      });

      setTitle("");
      setDescription("");
      setChecklistInput("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao criar tarefa.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border border-terminal-cyan p-4 shadow-[0_0_10px_rgba(0,255,255,0.05)]">
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
        <label className="block">
          <span className="mb-2 block text-sm uppercase text-terminal-cyan">&gt; criar tarefa</span>
          <input
            className="w-full px-3 py-3 border border-terminal-cyan focus:ring-0 focus:border-terminal-cyan text-terminal-cyan bg-terminal-black"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="> nova tarefa..."
            maxLength={140}
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm uppercase text-terminal-cyan">&gt; descrição</span>
          <input
            className="w-full px-3 py-3 border border-terminal-cyan focus:ring-0 focus:border-terminal-cyan text-terminal-cyan bg-terminal-black"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="detalhes opcionais"
            maxLength={600}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm uppercase text-terminal-cyan">&gt; checklist (separado por vírgula)</span>
          <input
            className="w-full px-3 py-3 border border-terminal-cyan focus:ring-0 focus:border-terminal-cyan text-terminal-cyan bg-terminal-black"
            value={checklistInput}
            onChange={(event) => setChecklistInput(event.target.value)}
            placeholder="item 1, item 2..."
            maxLength={300}
          />
        </label>

        <div className="flex flex-col gap-2 lg:justify-end">
          <button className="inline-flex items-center justify-center gap-2 px-4 py-3 uppercase border border-terminal-magenta text-terminal-magenta hover:bg-terminal-magenta hover:text-terminal-black transition-colors" type="submit" disabled={submitting}>
            <Send aria-hidden className="h-4 w-4" />
            {submitting ? "enviando" : "adicionar"}
          </button>
        </div>
      </div>

      {error ? <p className="mt-3 border border-terminal-red text-terminal-red p-3 text-sm uppercase font-bold">erro na tarefa: {error}</p> : null}
    </form>
  );
}
