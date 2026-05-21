"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { addDoc, collection, onSnapshot, orderBy, query, QueryDocumentSnapshot, serverTimestamp } from "firebase/firestore";
import { MessageSquare, Send } from "lucide-react";
import { db } from "@/lib/firebase";
import type { Comment } from "@/lib/types";

function mapCommentDocument(document: QueryDocumentSnapshot): Comment {
  const data = document.data();

  return {
    id: document.id,
    text: String(data.text ?? ""),
    authorEmail: String(data.authorEmail ?? "desconhecido"),
    authorUid: String(data.authorUid ?? ""),
    timestamp: data.timestamp ?? null
  };
}

function formatCommentTime(comment: Comment) {
  if (!comment.timestamp) {
    return "aguardando";
  }

  return comment.timestamp.toDate().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function CommentSection({ taskId, user }: { taskId: string; user: User }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const commentsQuery = query(collection(db, "tasks", taskId, "comments"), orderBy("timestamp", "asc"));

    return onSnapshot(
      commentsQuery,
      (snapshot) => {
        setComments(snapshot.docs.map(mapCommentDocument));
        setLoading(false);
        setError("");
      },
      (snapshotError) => {
        setError(snapshotError.message);
        setLoading(false);
      }
    );
  }, [taskId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedText = text.trim();

    if (!trimmedText) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await addDoc(collection(db, "tasks", taskId, "comments"), {
        text: trimmedText,
        authorEmail: user.email ?? "desconhecido",
        authorUid: user.uid,
        timestamp: serverTimestamp()
      });
      setText("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao adicionar comentário.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="border-t border-terminal-cyan p-4 bg-terminal-black">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold uppercase text-terminal-cyan">
        <MessageSquare aria-hidden className="h-4 w-4" />
        comentários [{comments.length}]
      </div>

      <div className="mb-3 max-h-48 space-y-2 overflow-y-auto pr-1">
        {loading ? <p className="text-xs uppercase text-terminal-yellow">carregando comentários...</p> : null}
        {!loading && comments.length === 0 ? <p className="text-xs uppercase text-terminal-gray">sem comentários</p> : null}
        {comments.map((comment) => (
          <div key={comment.id} className="border border-terminal-gray p-2 text-xs">
            <div className="mb-1 flex justify-between gap-2 uppercase text-terminal-cyan">
              <span>
                {comment.authorUid ? (
                  <Link href={`/perfil/${comment.authorUid}`} className="hover:underline hover:text-terminal-magenta transition-colors">
                    {comment.authorEmail}
                  </Link>
                ) : (
                  comment.authorEmail
                )}
              </span>
              <span>{formatCommentTime(comment)}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-terminal-green/90">{comment.text}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          className="min-w-0 flex-1 px-2 py-2 text-sm border border-terminal-gray focus:border-terminal-cyan text-terminal-cyan bg-terminal-black focus:ring-0 outline-none transition-colors"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="> comentário..."
          maxLength={500}
        />
        <button className="inline-flex w-12 items-center justify-center border border-terminal-gray text-terminal-gray hover:bg-terminal-cyan hover:text-terminal-black hover:border-terminal-cyan transition-colors disabled:opacity-50" type="submit" disabled={submitting || !text.trim()} aria-label="Adicionar comentário">
          <Send aria-hidden className="h-4 w-4" />
        </button>
      </form>

      {error ? <p className="mt-2 border border-terminal-red p-2 text-xs uppercase text-terminal-red font-bold">erro de comentário: {error}</p> : null}
    </section>
  );
}
