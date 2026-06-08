"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { ArrowLeft, LogOut } from "lucide-react";
import ProfileHeader from "@/components/ProfileHeader";
import NotificationSettings from "@/components/NotificationSettings";

const TaskMural = dynamic(() => import("@/components/TaskMural"), {
  ssr: false,
  loading: () => <p className="mx-auto max-w-7xl p-4 uppercase text-terminal-yellow font-mono">carregando módulo do mural...</p>
});

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const params = useParams();
  const profileUid = params.uid as string;

  if (!user) return null;

  const isCurrentUser = user.uid === profileUid;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 flex flex-col gap-6">
      {/* Control bar */}
      <div className="flex items-center justify-between border-b border-terminal-green/30 pb-4">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-black transition-colors font-mono"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar ao Mural
        </Link>
        
        <button
          onClick={() => void logout()}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase border border-terminal-red text-terminal-red hover:bg-terminal-red hover:text-black transition-colors font-mono"
          type="button"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </button>
      </div>

      <ProfileHeader profileUid={profileUid} isCurrentUser={isCurrentUser} />
      {isCurrentUser && <NotificationSettings profileUid={profileUid} />}
      <TaskMural user={user} filterUid={profileUid} />
    </div>
  );
}
