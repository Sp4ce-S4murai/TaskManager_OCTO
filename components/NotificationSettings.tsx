"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { Bell, Send, Terminal, AlertTriangle, Check, Save } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import type { UserProfile } from "@/lib/types";

interface NotificationSettingsProps {
  profileUid: string;
}

export default function NotificationSettings({ profileUid }: NotificationSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Form states
  const [telegramChatId, setTelegramChatId] = useState("");
  const [allowBrowser, setAllowBrowser] = useState(false);
  const [beforeHours, setBeforeHours] = useState(2);
  const [overdueDaily, setOverdueDaily] = useState(true);

  // Diagnostic log output on UI
  const [logs, setLogs] = useState<string[]>([]);

  // Test states for simulator
  const [testAction, setTestAction] = useState("system");
  const [testActor, setTestActor] = useState("other");
  const [testTaskStatus, setTestTaskStatus] = useState("todo");

  // Hook up Firestore real-time listener to populate/sync settings
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "users", profileUid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          setTelegramChatId(data.telegram_chat_id || "");
          setAllowBrowser(data.allow_browser_notifications || false);
          setBeforeHours(data.notify_before_hours ?? 2);
          setOverdueDaily(data.notify_overdue_daily ?? true);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao escutar configurações:", err);
        setLoading(false);
        addLog(`✗ Erro ao carregar configurações: ${err.message}`);
      }
    );
    return () => unsub();
  }, [profileUid]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleBrowserNotificationToggle = async (checked: boolean) => {
    if (!checked) {
      setAllowBrowser(false);
      addLog("> Alerta do navegador desativado localmente.");
      return;
    }

    if (!("Notification" in window)) {
      alert("Este navegador não suporta notificações nativas.");
      setAllowBrowser(false);
      addLog("✗ Erro: Navegador não suporta Web Notifications API.");
      return;
    }

    addLog("> Solicitando permissões para notificações do navegador...");
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setAllowBrowser(true);
      addLog("✓ Permissão concedida pelo usuário.");
      // Trigger a direct native notification on grant
      new Notification("OCTO Terminal", {
        body: "Permissão concedida com sucesso. Notificações ativas!",
        tag: "octo-permission-grant",
      });
    } else {
      setAllowBrowser(false);
      addLog("✗ Permissão negada pelo usuário.");
      alert("Permissão de notificação negada. Ative-as nas configurações do seu navegador.");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setLogs([]);
    addLog("> Iniciando persistência de configurações no servidor...");

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Usuário não autenticado no cliente.");

      const idToken = await currentUser.getIdToken();

      addLog("> Enviando requisição de gravação para a API...");
      const response = await fetch("/api/notifications/save-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          telegram_chat_id: telegramChatId,
          allow_browser_notifications: allowBrowser,
          notify_before_hours: beforeHours,
          notify_overdue_daily: overdueDaily,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro desconhecido ao salvar.");
      }

      addLog("✓ Configurações gravadas com sucesso no Firestore.");
    } catch (error: any) {
      addLog(`✗ Falha no salvamento: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTestTrigger = async () => {
    setTesting(true);
    addLog("> Inicializando rotina de teste de alertas...");

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Usuário não autenticado no cliente.");

      const idToken = await currentUser.getIdToken();

      addLog(`> Solicitando disparo na API /api/notifications/test-trigger (evento: ${testAction})...`);
      const response = await fetch("/api/notifications/test-trigger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          action: testAction,
          simulateActor: testActor,
          taskStatus: testTaskStatus,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Falha na resposta do servidor.");
      }

      // Handle Telegram Bot output
      if (data.telegram.attempted) {
        if (data.telegram.sent) {
          addLog("✓ Telegram: Mensagem de teste transmitida com sucesso!");
        } else {
          addLog(`✗ Telegram: Falha na transmissão — ${data.telegram.error}`);
        }
      } else {
        addLog("! Telegram: Envio ignorado (Chat ID não configurado).");
      }

      // Handle Browser notification output
      if (data.browserNotification.shouldTrigger) {
        if (Notification.permission === "granted") {
          addLog("> Disparando notificação local do navegador...");
          new Notification(data.browserNotification.title, data.browserNotification.options);
          addLog("✓ Navegador: Notificação local disparada com sucesso.");
        } else {
          addLog("! Navegador: Notificação bloqueada (permissão negada no browser).");
        }
      } else {
        addLog("! Navegador: Disparo ignorado (notificações do navegador desativadas).");
      }
    } catch (error: any) {
      addLog(`✗ Falha na rotina de teste: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl p-6 border border-terminal-green bg-terminal-black text-terminal-yellow font-mono text-sm uppercase">
        &gt; Inicializando subsistema de notificações...
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-4">
      <div className="bg-[#000] border border-terminal-green p-6 shadow-[0_0_20px_rgba(0,255,65,0.05)]">
        
        {/* Header */}
        <div className="border-b border-terminal-green/30 pb-4 mb-6">
          <h2 className="text-terminal-green font-bold uppercase text-sm tracking-widest flex items-center gap-2">
            <Terminal className="w-5 h-5 shrink-0" />
            ⬡ MÓDULO DE ALERTA E SEGURANÇA ANTIPROCASTINAÇÃO
          </h2>
          <p className="text-[10px] text-terminal-green/60 uppercase mt-1">
            Configure alertas persistentes no Telegram e no navegador para evitar perdas de prazos
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Form Controls */}
          <div className="space-y-5">
            {/* Telegram Configuration */}
            <div>
              <label className="block text-xs uppercase text-terminal-green font-bold mb-2">
                &gt; Telegram Chat ID
              </label>
              <input
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="Ex: 582910482"
                className="w-full px-3 py-2 border border-terminal-green bg-[#000] text-terminal-green focus:border-terminal-yellow focus:ring-0 text-sm font-mono"
              />
              <p className="text-[9px] text-terminal-green/50 uppercase mt-1">
                Obtenha seu ID iniciando conversa com o bot do sistema no Telegram.
              </p>
            </div>

            {/* Checkboxes / Switches */}
            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allowBrowser}
                  onChange={(e) => void handleBrowserNotificationToggle(e.target.checked)}
                  className="mt-0.5 border border-terminal-green bg-[#000] checked:bg-terminal-green checked:border-terminal-green focus:ring-0 focus:ring-offset-0 text-terminal-black w-4 h-4 rounded-none"
                />
                <div className="text-xs uppercase text-terminal-green font-bold">
                  Ativar Notificações Nativas do Navegador (Web API)
                  <p className="text-[9px] text-terminal-green/50 normal-case font-normal mt-0.5">
                    Solicita permissões ao navegador para disparar banners de aviso em sua tela.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={overdueDaily}
                  onChange={(e) => setOverdueDaily(e.target.checked)}
                  className="mt-0.5 border border-terminal-green bg-[#000] checked:bg-terminal-green checked:border-terminal-green focus:ring-0 focus:ring-offset-0 text-terminal-black w-4 h-4 rounded-none"
                />
                <div className="text-xs uppercase text-terminal-green font-bold">
                  Perturbar Diariamente (Atrasos)
                  <p className="text-[9px] text-terminal-green/50 normal-case font-normal mt-0.5">
                    Dispara lembretes repetidos todos os dias caso existam tarefas com prazo expirado.
                  </p>
                </div>
              </label>
            </div>

            {/* Antecedency selection */}
            <div>
              <label className="block text-xs uppercase text-terminal-green font-bold mb-2">
                &gt; Antecedência de Alerta (Horas)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="168"
                  value={beforeHours}
                  onChange={(e) => setBeforeHours(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-24 px-3 py-2 border border-terminal-green bg-[#000] text-terminal-green focus:border-terminal-yellow focus:ring-0 text-sm font-mono"
                />
                <span className="text-xs text-terminal-green/75 uppercase font-mono">horas antes do deadline</span>
              </div>
            </div>

            {/* Seção de Testes de Notificação */}
            <div className="border border-terminal-yellow/30 bg-black/40 p-4 space-y-4">
              <h3 className="text-xs uppercase text-terminal-yellow font-bold flex items-center gap-1.5 font-mono">
                <Send className="w-3.5 h-3.5 text-terminal-yellow" />
                ⬡ Simulador de Eventos de Notificação
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Ação a ser testada */}
                <div>
                  <label className="block text-[10px] uppercase text-terminal-green/75 font-mono mb-1">
                    Tipo de Evento
                  </label>
                  <select
                    value={testAction}
                    onChange={(e) => setTestAction(e.target.value)}
                    className="w-full px-2 py-1.5 border border-terminal-green bg-black text-terminal-green text-xs font-mono select-custom uppercase font-bold"
                  >
                    <option value="system">SISTEMA: ALERTA GERAL</option>
                    <option value="create">TAREFA: CRIADA / ATRIBUÍDA</option>
                    <option value="update">TAREFA: ATUALIZADA</option>
                    <option value="delete">TAREFA: EXCLUÍDA</option>
                    <option value="status_change">TAREFA: ALTERAÇÃO DE STATUS</option>
                  </select>
                </div>

                {/* Ator simulado */}
                {testAction !== "system" && (
                  <div>
                    <label className="block text-[10px] uppercase text-terminal-green/75 font-mono mb-1">
                      Quem executou a ação?
                    </label>
                    <select
                      value={testActor}
                      onChange={(e) => setTestActor(e.target.value)}
                      className="w-full px-2 py-1.5 border border-terminal-green bg-black text-terminal-green text-xs font-mono select-custom uppercase font-bold"
                    >
                      <option value="other">OUTRO OPERADOR</option>
                      <option value="self">VOCÊ MESMO</option>
                    </select>
                  </div>
                )}

                {/* Status da tarefa (caso seja alteração de status) */}
                {testAction === "status_change" && (
                  <div>
                    <label className="block text-[10px] uppercase text-terminal-green/75 font-mono mb-1">
                      Novo Status
                    </label>
                    <select
                      value={testTaskStatus}
                      onChange={(e) => setTestTaskStatus(e.target.value)}
                      className="w-full px-2 py-1.5 border border-terminal-green bg-black text-terminal-green text-xs font-mono select-custom uppercase font-bold"
                    >
                      <option value="todo">PENDENTE (TODO)</option>
                      <option value="done">CONCLUÍDO (DONE)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-terminal-green/20">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || testing}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-[#000] transition-colors disabled:opacity-40"
              >
                <Save className="w-4 h-4" />
                {saving ? "Gravando..." : "Salvar Configurações"}
              </button>

              <button
                type="button"
                onClick={() => void handleTestTrigger()}
                disabled={saving || testing}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase border border-terminal-yellow text-terminal-yellow hover:bg-terminal-yellow hover:text-[#000] transition-colors disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
                {testing ? "Testando..." : "Enviar Notificação de Teste"}
              </button>
            </div>
          </div>

          {/* Diagnostic Log Console */}
          <div className="flex flex-col h-full min-h-[200px] lg:min-h-0">
            <label className="block text-xs uppercase text-terminal-green font-bold mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-terminal-yellow" />
              Diagnóstico do Terminal
            </label>
            <div className="flex-1 bg-[#000] border border-terminal-green/30 p-4 font-mono text-[11px] text-terminal-green/80 overflow-y-auto space-y-1 h-[220px] lg:h-[260px] select-text">
              {logs.length === 0 ? (
                <div className="text-terminal-green/35 uppercase">
                  &gt; console aguardando entrada...
                  <br />
                  &gt; clique em salvar ou enviar teste para monitorar o status do barramento.
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="whitespace-pre-wrap leading-relaxed">
                    {log}
                  </div>
                ))
              )}
            </div>
            <p className="text-[9px] text-terminal-green/35 uppercase mt-1 text-right">
              Módulo v1.0.0 · status: online
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}
