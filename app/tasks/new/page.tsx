"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import TaskForm from "@/components/TaskForm";
import type { UserProfile } from "@/lib/types";
import { ArrowLeft, Terminal } from "lucide-react";

export default function NewTaskPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});

  useEffect(() => {
    if (!user) return;
    const usersQuery = collection(db, "users");
    return onSnapshot(usersQuery, (snapshot) => {
      const profilesMap: Record<string, UserProfile> = {};
      snapshot.forEach((doc) => {
        profilesMap[doc.id] = doc.data() as UserProfile;
      });
      setUserProfiles(profilesMap);
    });
  }, [user]);

  if (!user) return null;

  return (
    <main className="min-h-screen bg-terminal-black text-terminal-green p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl border border-terminal-green bg-black p-6 shadow-[0_0_20px_rgba(0,255,65,0.05)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-terminal-green/30 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-terminal-green" />
            <h1 className="text-sm uppercase font-bold tracking-widest text-terminal-green font-mono">
              &gt; Criar Nova Diretriz (Tarefa)
            </h1>
          </div>
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase border border-terminal-yellow text-terminal-yellow hover:bg-terminal-yellow hover:text-black transition-colors font-mono"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar
          </button>
        </div>

        {/* Task form */}
        <TaskForm user={user} userProfiles={userProfiles} />
      </div>
    </main>
  );
}
