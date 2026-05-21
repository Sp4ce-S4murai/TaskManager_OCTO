"use client";

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
    authorEmail: String(data.authorEmail ?? "unknown"),
    timestamp: data.timestamp ?? null
  };
}

function formatCommentTime(comment: Comment) {
  if (!comment.timestamp) {
    return "pending";
  }

  return comment.timestamp.toDate().toLocaleTimeString(undefined, {
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
        authorEmail: user.email ?? "unknown",
        timestamp: serverTimestamp()
      });
      setText("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to add comment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="border-t border-terminal-green p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold uppercase">
        <MessageSquare aria-hidden className="h-4 w-4" />
        comments [{comments.length}]
      </div>

      <div className="mb-3 max-h-48 space-y-2 overflow-y-auto pr-1">
        {loading ? <p className="text-xs uppercase">loading comments...</p> : null}
        {!loading && comments.length === 0 ? <p className="text-xs uppercase">no comments</p> : null}
        {comments.map((comment) => (
          <div key={comment.id} className="border border-terminal-green p-2 text-xs">
            <div className="mb-1 flex justify-between gap-2 uppercase">
              <span>{comment.authorEmail}</span>
              <span>{formatCommentTime(comment)}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm">{comment.text}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          className="min-w-0 flex-1 px-2 py-2 text-sm"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="> comment..."
          maxLength={500}
        />
        <button className="inline-flex w-12 items-center justify-center" type="submit" disabled={submitting || !text.trim()} aria-label="Add comment">
          <Send aria-hidden className="h-4 w-4" />
        </button>
      </form>

      {error ? <p className="mt-2 border border-terminal-green p-2 text-xs uppercase">comment error: {error}</p> : null}
    </section>
  );
}
