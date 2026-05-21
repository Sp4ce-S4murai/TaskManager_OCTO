"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";
import type { User } from "firebase/auth";
import { doc, addDoc, updateDoc, deleteDoc, collection, serverTimestamp } from "firebase/firestore";
import { Terminal, Cpu } from "lucide-react";
import { db } from "@/lib/firebase";
import type { Task } from "@/lib/types";

interface LogEntry {
  type: "input" | "output" | "error" | "system";
  text: string;
}

interface TerminalConsoleProps {
  user: User;
  tasks: Task[];
}

export default function TerminalConsole({ user, tasks }: TerminalConsoleProps) {
  const [inputValue, setInputValue] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([
    { type: "system", text: "OCTO TASK TERMINAL v1.5.0-BR" },
    { type: "system", text: `SESSÃO AUTORIZADA: ${user.email}` },
    { type: "system", text: 'Digite "ajuda" para ver os comandos disponíveis do terminal.' },
    { type: "system", text: "--------------------------------------------------------" }
  ]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyPointer, setHistoryPointer] = useState<number>(-1);

  const consoleContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll inside the logs terminal
  useEffect(() => {
    if (consoleContainerRef.current) {
      consoleContainerRef.current.scrollTop = consoleContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Focus terminal input when clicking anywhere inside the terminal box
  const focusInput = () => {
    inputRef.current?.focus();
  };

  // Helper to parse arguments, preserving quoted strings
  const parseCommandArgs = (input: string): string[] => {
    const args: string[] = [];
    const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
    let match;
    while ((match = regex.exec(input)) !== null) {
      args.push(match[1] || match[2] || match[0]);
    }
    return args;
  };

  const handleCommandSubmit = async (cmdStr: string) => {
    const trimmed = cmdStr.trim();
    if (!trimmed) {
      return;
    }

    // Add to history
    const newHistory = [...commandHistory, trimmed];
    setCommandHistory(newHistory);
    setHistoryPointer(-1);

    // Print command input in logs
    setLogs((prev) => [...prev, { type: "input", text: `octo@funcionario:~$ ${trimmed}` }]);

    const args = parseCommandArgs(trimmed);
    const commandName = args[0].toLowerCase();

    try {
      switch (commandName) {
        case "ajuda":
          setLogs((prev) => [
            ...prev,
            { type: "output", text: "COMANDOS DISPONÍVEIS NO TERMINAL:" },
            { type: "output", text: '  add "título" ["desc"]  -> Criar uma nova tarefa (use aspas para espaços)' },
            { type: "output", text: "  pendente <índice>      -> Marcar tarefa no <índice> como PENDENTE" },
            { type: "output", text: "  feito <índice>         -> Marcar tarefa no <índice> como FEITO" },
            { type: "output", text: "  check <tarefa> <item>  -> Marcar item da checklist como feito/pendente" },
            { type: "output", text: "  rm <índice>            -> Remoção permanente da tarefa" },
            { type: "output", text: '  msg <índice> "txt"     -> Adicionar um comentário (use aspas)' },
            { type: "output", text: "  limpar                 -> Limpar o histórico do console" },
            { type: "output", text: "  sistema                -> Exibir informações do host do terminal" }
          ]);
          break;

        case "limpar":
        case "clear":
          setLogs([]);
          break;

        case "sistema":
        case "sysinfo":
          setLogs((prev) => [
            ...prev,
            { type: "system", text: "--- ESPECIFICAÇÕES DO SISTEMA HOST ---" },
            { type: "system", text: "SO: OCTO-Brutalist v2.0" },
            { type: "system", text: "KERNEL: Monospace-NextJS 14.2" },
            { type: "system", text: "DB SYNC: Cloud Firestore (WebSockets em Tempo Real)" },
            { type: "system", text: `FUNCIONÁRIO: ${user.email}` },
            { type: "system", text: `HORA LOCAL: ${new Date().toLocaleTimeString('pt-BR')}` },
            { type: "system", text: "STATUS DO SISTEMA: SEGURO & ESTÁVEL" }
          ]);
          break;

        case "add":
        case "criar": {
          if (args.length < 2) {
            setLogs((prev) => [...prev, { type: "error", text: 'Erro de Sintaxe: add "título" ["descrição"]' }]);
            break;
          }
          const title = args[1];
          const description = args[2] || "";

          if (title.length > 140) {
            setLogs((prev) => [...prev, { type: "error", text: "Erro de Restrição: Título excede 140 caracteres" }]);
            break;
          }
          if (description.length > 600) {
            setLogs((prev) => [...prev, { type: "error", text: "Erro de Restrição: Descrição excede 600 caracteres" }]);
            break;
          }

          setLogs((prev) => [...prev, { type: "output", text: "Enviando tarefa para o mainframe..." }]);
          
          await addDoc(collection(db, "tasks"), {
            title: title.trim(),
            description: description.trim(),
            status: "todo",
            authorEmail: user.email ?? "desconhecido",
            imageUrl: null,
            timestamp: serverTimestamp()
          });

          setLogs((prev) => [...prev, { type: "output", text: `SUCESSO: Tarefa "${title}" criada com sucesso.` }]);
          break;
        }

        case "pendente":
        case "todo":
        case "reabrir":
        case "feito":
        case "done":
        case "concluir":
        case "remover":
        case "delete":
        case "rm":
        case "comentar":
        case "msg":
        case "check": {
          if (args.length < 2) {
            setLogs((prev) => [...prev, { type: "error", text: `Erro de Sintaxe: comando requer o índice da tarefa (ex: "${commandName} 1")` }]);
            break;
          }

          const index = parseInt(args[1], 10);
          if (isNaN(index) || index < 1 || index > tasks.length) {
            setLogs((prev) => [
              ...prev,
              { type: "error", text: `Erro de Índice: O índice de tarefa #${args[1]} é inválido. Intervalo ativo: 1 até ${tasks.length}` }
            ]);
            break;
          }

          const targetTask = tasks[index - 1]; // Tasks are 0-indexed in state but 1-indexed in CLI

          if (commandName === "feito" || commandName === "done" || commandName === "concluir") {
            await updateDoc(doc(db, "tasks", targetTask.id), { status: "done" });
            setLogs((prev) => [...prev, { type: "output", text: `SUCESSO: Tarefa #${index} ("${targetTask.title}") marcada como FEITO.` }]);
          } else if (commandName === "pendente" || commandName === "todo" || commandName === "reabrir") {
            await updateDoc(doc(db, "tasks", targetTask.id), { status: "todo" });
            setLogs((prev) => [...prev, { type: "output", text: `SUCESSO: Tarefa #${index} ("${targetTask.title}") marcada como PENDENTE.` }]);
          } else if (commandName === "remover" || commandName === "delete" || commandName === "rm") {
            await deleteDoc(doc(db, "tasks", targetTask.id));
            setLogs((prev) => [...prev, { type: "output", text: `SUCESSO: Tarefa #${index} ("${targetTask.title}") permanentemente REMOVIDA.` }]);
          } else if (commandName === "comentar" || commandName === "msg") {
            if (args.length < 3) {
              setLogs((prev) => [...prev, { type: "error", text: 'Erro de Sintaxe: msg <índice> "texto do comentário"' }]);
              break;
            }
            const textContent = args[2];
            if (textContent.length > 500) {
              setLogs((prev) => [...prev, { type: "error", text: "Erro de Restrição: Comentário excede 500 caracteres" }]);
              break;
            }

            await addDoc(collection(db, "tasks", targetTask.id, "comments"), {
              text: textContent.trim(),
              authorEmail: user.email ?? "desconhecido",
              authorUid: user.uid,
              timestamp: serverTimestamp()
            });
            setLogs((prev) => [...prev, { type: "output", text: `SUCESSO: Comentário adicionado à Tarefa #${index}.` }]);
          } else if (commandName === "check") {
            if (args.length < 3) {
              setLogs((prev) => [...prev, { type: "error", text: 'Erro de Sintaxe: check <índice_tarefa> <índice_item>' }]);
              break;
            }
            const itemIndex = parseInt(args[2], 10) - 1; // 1-indexed to 0-indexed
            
            if (!targetTask.checklist || isNaN(itemIndex) || itemIndex < 0 || itemIndex >= targetTask.checklist.length) {
              setLogs((prev) => [...prev, { type: "error", text: `Erro: Item #${args[2]} não encontrado na checklist da tarefa #${index}` }]);
              break;
            }

            const newChecklist = [...targetTask.checklist];
            newChecklist[itemIndex].isDone = !newChecklist[itemIndex].isDone;
            
            await updateDoc(doc(db, "tasks", targetTask.id), { checklist: newChecklist });
            setLogs((prev) => [...prev, { type: "output", text: `SUCESSO: Item #${args[2]} da Tarefa #${index} alterado para ${newChecklist[itemIndex].isDone ? "FEITO" : "PENDENTE"}.` }]);
          }
          break;
        }

        default:
          setLogs((prev) => [
            ...prev,
            { type: "error", text: `Comando Não Encontrado: "${commandName}". Digite "ajuda" para ver a lista de diretrizes válidas do mainframe.` }
          ]);
      }
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        { type: "error", text: `FALHA DE EXECUÇÃO: ${err instanceof Error ? err.message : "Problema de conexão com banco de dados"}` }
      ]);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      void handleCommandSubmit(inputValue);
      setInputValue("");
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (commandHistory.length === 0) return;
      
      const newPointer = historyPointer === -1 ? commandHistory.length - 1 : Math.max(0, historyPointer - 1);
      setHistoryPointer(newPointer);
      setInputValue(commandHistory[newPointer]);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (commandHistory.length === 0 || historyPointer === -1) return;

      if (historyPointer === commandHistory.length - 1) {
        setHistoryPointer(-1);
        setInputValue("");
      } else {
        const newPointer = historyPointer + 1;
        setHistoryPointer(newPointer);
        setInputValue(commandHistory[newPointer]);
      }
    }
  };

  return (
    <div 
      onClick={focusInput}
      className="relative mb-6 border border-terminal-cyan bg-terminal-black p-4 font-mono shadow-[0_0_20px_rgba(0,255,255,0.15)] cursor-text select-none group"
    >
      {/* Visual CRT Scanline Filter effect for Brutalist WOW factor */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] opacity-20 z-0"></div>

      <div className="relative mb-2 flex items-center justify-between border-b border-terminal-cyan/30 pb-2 text-xs uppercase text-terminal-cyan z-10">
        <span className="flex items-center gap-1.5 font-bold">
          <Terminal className="h-3.5 w-3.5 animate-pulse text-terminal-magenta" />
          CONSOLE DE COMANDOS OCTO
        </span>
        <span className="flex items-center gap-1 text-terminal-cyan">
          <Cpu className="h-3 w-3" />
          ESTADO DO LINK: ONLINE
        </span>
      </div>

      {/* Terminal Logs */}
      <div ref={consoleContainerRef} className="relative h-44 overflow-y-auto pr-1 text-sm space-y-1 mb-2 z-10">
        {logs.map((log, index) => {
          let color = "text-terminal-green";
          if (log.type === "error") color = "text-terminal-red font-bold";
          if (log.type === "system") color = "text-terminal-yellow font-bold opacity-90";
          if (log.type === "input") color = "text-terminal-cyan font-bold";

          return (
            <div key={index} className={`${color} whitespace-pre-wrap leading-5`}>
              {log.text}
            </div>
          );
        })}
      </div>

      {/* CLI Input line */}
      <div className="relative flex items-center text-sm border-t border-terminal-cyan/20 pt-2 z-10">
        <span className="text-terminal-magenta mr-2 shrink-0 select-none font-bold">octo@funcionario:~$</span>
        <input
          ref={inputRef}
          type="text"
          className="flex-1 bg-transparent border-0 outline-none p-0 m-0 text-terminal-green font-bold focus:ring-0 w-full selection:bg-terminal-cyan selection:text-terminal-black"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={200}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          placeholder="digite sua diretriz..."
        />
      </div>
    </div>
  );
}
