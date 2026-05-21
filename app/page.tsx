"use client";

import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth-context";

const TaskMural = dynamic(() => import("@/components/TaskMural"), {
  ssr: false,
  loading: () => <p className="mx-auto max-w-7xl p-4 uppercase text-terminal-yellow">carregando módulo do mural...</p>
});

export default function HomePage() {
  const { user } = useAuth();
  
  if (!user) return null; // AuthGate handles the loading/login states
  
  return <TaskMural user={user} />;
}
