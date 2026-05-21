"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { ImagePlus, Send, X } from "lucide-react";
import { db, storage } from "@/lib/firebase";

export default function TaskForm({ user }: { user: User }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null);
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle) {
      setError("Task title is required.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      let imageUrl: string | undefined;

      if (file) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const imageRef = ref(storage, `task-images/${user.uid}/${Date.now()}-${safeName}`);
        await uploadBytes(imageRef, file, { contentType: file.type });
        imageUrl = await getDownloadURL(imageRef);
      }

      await addDoc(collection(db, "tasks"), {
        title: trimmedTitle,
        description: trimmedDescription,
        status: "todo",
        authorEmail: user.email ?? "unknown",
        imageUrl: imageUrl ?? null,
        timestamp: serverTimestamp()
      });

      setTitle("");
      setDescription("");
      clearFile();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create task.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border border-terminal-green p-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
        <label className="block">
          <span className="mb-2 block text-sm uppercase">&gt; create task</span>
          <input
            className="w-full px-3 py-3"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="> create task..."
            maxLength={140}
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm uppercase">&gt; description</span>
          <input
            className="w-full px-3 py-3"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="optional details"
            maxLength={600}
          />
        </label>

        <div className="flex flex-col gap-2 lg:justify-end">
          <input ref={fileInputRef} className="hidden" type="file" accept="image/*" onChange={handleFileChange} />
          <label
            role="button"
            tabIndex={0}
            className="inline-flex cursor-pointer items-center justify-center gap-2 px-4 py-3 uppercase"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <ImagePlus aria-hidden className="h-4 w-4" />
            image
          </label>
          <button className="inline-flex items-center justify-center gap-2 px-4 py-3 uppercase" type="submit" disabled={submitting}>
            <Send aria-hidden className="h-4 w-4" />
            {submitting ? "sending" : "add"}
          </button>
        </div>
      </div>

      <div className="mt-3 min-h-6 text-sm uppercase">
        {file ? (
          <span className="inline-flex items-center gap-2 border border-terminal-green px-2 py-1">
            attachment: {file.name}
            <button className="border-0 p-0" type="button" onClick={clearFile} aria-label="Remove selected image">
              <X aria-hidden className="h-4 w-4" />
            </button>
          </span>
        ) : (
          <span>attachment: none</span>
        )}
      </div>
      {error ? <p className="mt-3 border border-terminal-green p-3 text-sm uppercase">task error: {error}</p> : null}
    </form>
  );
}
