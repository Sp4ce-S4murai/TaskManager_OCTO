"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { LogOut, UserCircle, Search, Filter, PlusSquare, SlidersHorizontal, ClipboardList } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import TaskMural from "@/components/TaskMural";
import type { UserProfile, Task } from "@/lib/types";
import Image from "next/image";

export default function HomePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Profile data of logged-in user
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // User's tasks metrics for progress indicators
  const [userTasks, setUserTasks] = useState<Task[]>([]);

  // Search and Filter states
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "all");
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "newest");

  // Sync state to URL Query Params
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (status !== "all") params.set("status", status);
    if (sortBy !== "newest") params.set("sortBy", sortBy);
    
    const queryStr = params.toString();
    router.replace(queryStr ? `?${queryStr}` : pathname);
  }, [search, status, sortBy, router, pathname]);

  // Real-time listener for user profile settings
  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
      }
    });
  }, [user]);

  // Real-time listener for current user's tasks metrics
  useEffect(() => {
    if (!user) return;
    // Listen to tasks assigned to this user
    const q = query(collection(db, "tasks"), where("assignedTo", "==", user.uid));
    return onSnapshot(q, (snap) => {
      const list: Task[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          status: data.status === "done" ? "done" : "todo",
          checklist: data.checklist || [],
        } as any);
      });
      setUserTasks(list);
    });
  }, [user]);

  if (!user) return null;

  // Calculate metrics
  const totalTasks = userTasks.length;
  const doneTasks = userTasks.filter((t) => t.status === "done").length;
  const tasksPercentage = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Checklist items metrics
  let totalSubtasks = 0;
  let doneSubtasks = 0;
  userTasks.forEach((t) => {
    if (t.checklist) {
      totalSubtasks += t.checklist.length;
      doneSubtasks += t.checklist.filter((c) => c.isDone).length;
    }
  });
  const subtasksPercentage = totalSubtasks > 0 ? Math.round((doneSubtasks / totalSubtasks) * 100) : 0;

  return (
    <div className="mx-auto max-w-[1600px] min-h-screen grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6 p-4 md:p-6 bg-terminal-black text-terminal-green">
      
      {/* LEFT COLUMN: Feed & Filters */}
      <section className="flex flex-col gap-6">
        
        {/* Filters Top Bar */}
        <div className="border border-terminal-green/30 bg-black/60 p-4 shadow-[0_0_15px_rgba(0,255,65,0.02)]">
          <div className="flex items-center gap-2 mb-4 border-b border-terminal-green/20 pb-2">
            <SlidersHorizontal className="w-4 h-4 text-terminal-green" />
            <h2 className="text-xs uppercase font-bold tracking-widest font-mono">
              &gt; FILTROS & BUSCA DE MAINFRAME
            </h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Search string */}
            <div className="relative flex items-center">
              <span className="absolute left-3 text-terminal-green/50">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Buscar tarefa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-terminal-green bg-black text-sm text-terminal-green placeholder-[#00FF41]/35 font-mono outline-none focus:border-terminal-yellow"
              />
            </div>

            {/* Status Filter */}
            <div className="relative flex items-center">
              <span className="absolute left-3 text-terminal-green/50">
                <Filter className="w-4 h-4" />
              </span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-terminal-green bg-black text-sm text-terminal-green font-mono outline-none select-custom uppercase font-bold"
              >
                <option value="all">👥 TODOS STATUS</option>
                <option value="todo">○ PENDENTE (TODO)</option>
                <option value="done">● CONCLUÍDO (DONE)</option>
              </select>
            </div>

            {/* Sorting */}
            <div className="relative flex items-center">
              <span className="absolute left-3 text-terminal-green/50">
                <SlidersHorizontal className="w-4 h-4" />
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-terminal-green bg-black text-sm text-terminal-green font-mono outline-none select-custom uppercase font-bold"
              >
                <option value="newest">▲ MAIS RECENTES</option>
                <option value="oldest">▼ MAIS ANTIGAS</option>
                <option value="priority">█ PRIORIDADE</option>
              </select>
            </div>

          </div>
        </div>

        {/* Task Mural list */}
        <div className="flex-1 border border-terminal-green/30 bg-black/30">
          <TaskMural
            user={user}
            searchQuery={search}
            statusFilter={status}
            sortBy={sortBy}
          />
        </div>

      </section>

      {/* RIGHT COLUMN: Sidebar de Controle Fixa */}
      <aside className="flex flex-col gap-6">
        
        {/* 1. Card do Usuário (Topo) */}
        <div className="border border-terminal-green bg-black p-5 flex flex-col items-center text-center shadow-[0_0_15px_rgba(0,255,65,0.05)] relative overflow-hidden">
          
          {/* Decorative Corner Borders */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-terminal-green" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-terminal-green" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-terminal-green" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-terminal-green" />

          {/* Avatar round */}
          <div className="relative w-20 h-20 overflow-hidden mb-3 border border-terminal-green rounded-full shrink-0">
            {profile?.avatar ? (
              <Image
                src={`/avatars/${profile.avatar}`}
                alt="Avatar"
                fill
                className="object-cover"
                sizes="80px"
                unoptimized
              />
            ) : (
              <UserCircle className="w-full h-full text-terminal-green opacity-40 p-1" />
            )}
          </div>

          <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-terminal-green">
            {profile?.name || "Operador Desconhecido"}
          </h2>
          
          <p className="text-[10px] uppercase font-mono text-terminal-green/50 tracking-wider mb-4 max-w-full truncate">
            {user.email}
          </p>

          <div className="flex flex-col gap-2 w-full pt-3 border-t border-terminal-green/20">
            <Link
              href={`/perfil/${user.uid}`}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold uppercase border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-black transition-colors font-mono"
            >
              Acessar Perfil
            </Link>
            
            <button
              onClick={() => void logout()}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold uppercase border border-terminal-red text-terminal-red hover:bg-terminal-red hover:text-black transition-colors font-mono"
              type="button"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>

        </div>

        {/* 2. Ações do Sistema */}
        <div className="border border-terminal-green/30 bg-black/40 p-4 shadow-[0_0_15px_rgba(0,255,65,0.02)]">
          <h3 className="text-xs uppercase text-terminal-green/60 font-bold font-mono tracking-wider mb-3">
            &gt; DIRETRIZES DO SISTEMA
          </h3>
          <button
            onClick={() => router.push("/tasks/new")}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold uppercase border border-terminal-yellow text-terminal-yellow hover:bg-terminal-yellow hover:text-black transition-colors font-mono shadow-[0_0_10px_rgba(255,255,0,0.1)]"
          >
            <PlusSquare className="w-4 h-4" />
            Nova Tarefa
          </button>
        </div>

        {/* 3. Gerenciador de Subtarefas Integrado (Painel de Progresso do Operador) */}
        <div className="border border-terminal-green/30 bg-black/40 p-4 space-y-4">
          <h3 className="text-xs uppercase text-terminal-green/60 font-bold font-mono tracking-wider border-b border-terminal-green/20 pb-2 flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4 text-terminal-green" />
            DIAGNÓSTICO DE PRODUTIVIDADE
          </h3>

          {/* User Tasks completion */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] uppercase font-mono tracking-wider text-terminal-green">
              <span>Diretrizes concluintes</span>
              <span className="font-bold">{doneTasks} / {totalTasks}</span>
            </div>
            <div className="w-full bg-zinc-950 border border-zinc-800 h-2 relative overflow-hidden">
              <div 
                className="h-full bg-terminal-green transition-all duration-500"
                style={{ width: `${tasksPercentage}%` }} 
              />
            </div>
          </div>

          {/* User Subtasks (checklists) completion */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] uppercase font-mono tracking-wider text-terminal-green">
              <span>Subtarefas concluídas</span>
              <span className="font-bold">{doneSubtasks} / {totalSubtasks}</span>
            </div>
            <div className="w-full bg-zinc-950 border border-zinc-800 h-2 relative overflow-hidden">
              <div 
                className="h-full bg-terminal-green transition-all duration-500"
                style={{ 
                  width: `${subtasksPercentage}%`,
                  backgroundColor: "#FFFF00" // yellow for subtasks bar
                }} 
              />
            </div>
          </div>

          <div className="text-[9px] uppercase font-mono text-terminal-green/45 pt-1 text-center">
            {totalTasks === 0 ? "Aguardando atribuição de diretrizes." : `Status da operação: ${tasksPercentage}% de eficiência.`}
          </div>

        </div>

      </aside>

    </div>
  );
}
