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
    { type: "system", text: "OCTO TASK TERMINAL v1.4.0-RELEASE" },
    { type: "system", text: `AUTHORIZED SESSION: ${user.email}` },
    { type: "system", text: 'Type "help" to see available terminal commands.' },
    { type: "system", text: "--------------------------------------------------------" }
  ]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyPointer, setHistoryPointer] = useState<number>(-1);

  const consoleEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll inside the logs terminal
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
    setLogs((prev) => [...prev, { type: "input", text: `octo@employee:~$ ${trimmed}` }]);

    const args = parseCommandArgs(trimmed);
    const commandName = args[0].toLowerCase();

    try {
      switch (commandName) {
        case "help":
          setLogs((prev) => [
            ...prev,
            { type: "output", text: "AVAILABLE TERMINAL COMMANDS:" },
            { type: "output", text: '  add "title" ["desc"]  -> Create a new task (use quotes for spaces)' },
            { type: "output", text: "  todo <index>          -> Mark task at <index> as TODO" },
            { type: "output", text: "  done <index>          -> Mark task at <index> as DONE" },
            { type: "output", text: "  delete <index>        -> Permanent removal of task" },
            { type: "output", text: '  comment <index> "txt" -> Add a comment to task (use quotes)' },
            { type: "output", text: "  clear                 -> Clear the console history logs" },
            { type: "output", text: "  sysinfo               -> Display brutalist terminal host info" }
          ]);
          break;

        case "clear":
          setLogs([]);
          break;

        case "sysinfo":
          setLogs((prev) => [
            ...prev,
            { type: "system", text: "--- HOST SYSTEM SPECS ---" },
            { type: "system", text: "OS: OCTO-Brutalist v2.0" },
            { type: "system", text: "KERNEL: Monospace-NextJS 14.2" },
            { type: "system", text: "DB SYNC: Cloud Firestore (Real-time WebSockets)" },
            { type: "system", text: `EMPLOYEE: ${user.email}` },
            { type: "system", text: `LOCAL TIME: ${new Date().toLocaleTimeString()}` },
            { type: "system", text: "SYSTEM STATUS: SECURE & STABLE" }
          ]);
          break;

        case "add":
        case "create": {
          if (args.length < 2) {
            setLogs((prev) => [...prev, { type: "error", text: 'Syntax Error: add "title" ["description"]' }]);
            break;
          }
          const title = args[1];
          const description = args[2] || "";

          if (title.length > 140) {
            setLogs((prev) => [...prev, { type: "error", text: "Constraint Error: Title exceeds 140 chars" }]);
            break;
          }
          if (description.length > 600) {
            setLogs((prev) => [...prev, { type: "error", text: "Constraint Error: Description exceeds 600 chars" }]);
            break;
          }

          setLogs((prev) => [...prev, { type: "output", text: "Uploading task to mainframe..." }]);
          
          await addDoc(collection(db, "tasks"), {
            title: title.trim(),
            description: description.trim(),
            status: "todo",
            authorEmail: user.email ?? "unknown",
            imageUrl: null,
            timestamp: serverTimestamp()
          });

          setLogs((prev) => [...prev, { type: "output", text: `SUCCESS: Task "${title}" created successfully.` }]);
          break;
        }

        case "todo":
        case "reopen":
        case "done":
        case "complete":
        case "delete":
        case "rm":
        case "comment":
        case "msg": {
          if (args.length < 2) {
            setLogs((prev) => [...prev, { type: "error", text: `Syntax Error: command needs task index (e.g., "${commandName} 1")` }]);
            break;
          }

          const index = parseInt(args[1], 10);
          if (isNaN(index) || index < 1 || index > tasks.length) {
            setLogs((prev) => [
              ...prev,
              { type: "error", text: `Index Error: Task index #${args[1]} is invalid. Active range: 1 to ${tasks.length}` }
            ]);
            break;
          }

          const targetTask = tasks[index - 1]; // Tasks are 0-indexed in state but 1-indexed in CLI

          if (commandName === "done" || commandName === "complete") {
            await updateDoc(doc(db, "tasks", targetTask.id), { status: "done" });
            setLogs((prev) => [...prev, { type: "output", text: `SUCCESS: Task #${index} ("${targetTask.title}") marked as DONE.` }]);
          } else if (commandName === "todo" || commandName === "reopen") {
            await updateDoc(doc(db, "tasks", targetTask.id), { status: "todo" });
            setLogs((prev) => [...prev, { type: "output", text: `SUCCESS: Task #${index} ("${targetTask.title}") marked as TODO.` }]);
          } else if (commandName === "delete" || commandName === "rm") {
            await deleteDoc(doc(db, "tasks", targetTask.id));
            setLogs((prev) => [...prev, { type: "output", text: `SUCCESS: Task #${index} ("${targetTask.title}") permanently DELETED.` }]);
          } else if (commandName === "comment" || commandName === "msg") {
            if (args.length < 3) {
              setLogs((prev) => [...prev, { type: "error", text: 'Syntax Error: comment <index> "comment text"' }]);
              break;
            }
            const textContent = args[2];
            if (textContent.length > 500) {
              setLogs((prev) => [...prev, { type: "error", text: "Constraint Error: Comment exceeds 500 chars" }]);
              break;
            }

            await addDoc(collection(db, "tasks", targetTask.id, "comments"), {
              text: textContent.trim(),
              authorEmail: user.email ?? "unknown",
              timestamp: serverTimestamp()
            });
            setLogs((prev) => [...prev, { type: "output", text: `SUCCESS: Comment added to Task #${index}.` }]);
          }
          break;
        }

        default:
          setLogs((prev) => [
            ...prev,
            { type: "error", text: `Command Not Found: "${commandName}". Type "help" for a list of valid mainframe directives.` }
          ]);
      }
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        { type: "error", text: `EXECUTION FAULT: ${err instanceof Error ? err.message : "Database connection issue"}` }
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
      className="relative mb-6 border border-terminal-green bg-terminal-black p-4 font-mono shadow-[0_0_15px_rgba(0,255,65,0.15)] cursor-text select-none group"
    >
      {/* Visual CRT Scanline Filter effect for Brutalist WOW factor */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] opacity-20"></div>

      <div className="mb-2 flex items-center justify-between border-b border-terminal-green/30 pb-2 text-xs uppercase text-terminal-green/60">
        <span className="flex items-center gap-1.5 font-bold">
          <Terminal className="h-3.5 w-3.5 animate-pulse text-terminal-green" />
          OCTO COMMAND CONSOLE
        </span>
        <span className="flex items-center gap-1">
          <Cpu className="h-3 w-3" />
          LINK STATE: ONLINE
        </span>
      </div>

      {/* Terminal Logs */}
      <div className="h-44 overflow-y-auto pr-1 text-sm space-y-1 mb-2">
        {logs.map((log, index) => {
          let color = "text-terminal-green";
          if (log.type === "error") color = "text-red-500 font-semibold";
          if (log.type === "system") color = "text-yellow-500 opacity-90";
          if (log.type === "input") color = "text-terminal-green/80";

          return (
            <div key={index} className={`${color} whitespace-pre-wrap leading-5`}>
              {log.text}
            </div>
          );
        })}
        <div ref={consoleEndRef} />
      </div>

      {/* CLI Input line */}
      <div className="flex items-center text-sm border-t border-terminal-green/20 pt-2">
        <span className="text-terminal-green mr-2 shrink-0 select-none">octo@employee:~$</span>
        <input
          ref={inputRef}
          type="text"
          className="flex-1 bg-transparent border-0 outline-none p-0 m-0 text-terminal-green focus:ring-0 w-full selection:bg-terminal-green selection:text-terminal-black"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={200}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          placeholder="type your directive..."
        />
      </div>
    </div>
  );
}
