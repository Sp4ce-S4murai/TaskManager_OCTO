"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import ProfileHeader from "@/components/ProfileHeader";

const TaskMural = dynamic(() => import("@/components/TaskMural"), {
  ssr: false,
  loading: () => <p className="mx-auto max-w-7xl p-4 uppercase text-terminal-yellow">carregando módulo do mural...</p>
});

export default function ProfilePage() {
  const { user } = useAuth();
  const params = useParams();
  const profileUid = params.uid as string;

  if (!user) return null;

  return (
    <div className="flex flex-col">
      <ProfileHeader profileUid={profileUid} isCurrentUser={user.uid === profileUid} />
      <TaskMural user={user} filterUid={profileUid} />
    </div>
  );
}
