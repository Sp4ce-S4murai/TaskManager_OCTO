import { getAdminDb } from "@/lib/firebase-admin";

/**
 * Escapes characters that are reserved by Telegram's MarkdownV2 formatting.
 */
export function escapeMarkdownV2(text: string): string {
  if (!text) return "";
  return text.replace(/[_*\[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

/**
 * Dispatches a message to a Telegram chat via the Telegram Bot API.
 */
export async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error("[Telegram] TELEGRAM_BOT_TOKEN não está configurado no ambiente.");
    return false;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "MarkdownV2",
      }),
    });

    const data = await response.json();
    if (response.ok && data.ok) {
      console.log(`[Telegram] Notificação disparada com sucesso para o chat ID: ${chatId}`);
      return true;
    } else {
      console.error(`[Telegram] Falha no disparo do payload para o chat ID: ${chatId}. Detalhes: ${data.description || "Erro desconhecido da API"}`);
      return false;
    }
  } catch (err: any) {
    console.error(`[Telegram] Erro ao enviar requisição HTTP para o chat ID ${chatId}:`, err.message);
    return false;
  }
}

/**
 * Evaluates a task mutation event, identifies the impacted assignee,
 * and triggers a Telegram notification when appropriate.
 */
export async function notifyTaskEvent(
  action: "create" | "update" | "delete" | "status_change",
  task: any,
  actorUserId: string
): Promise<boolean> {
  // 1. Identify the assigned user
  const assigneeId = task.assignedTo || task.user;
  if (!assigneeId) {
    console.log(`[Notification] Evento ignorado: Tarefa "${task.title}" não possui usuário atribuído.`);
    return false;
  }

  // 2. Rules regarding the actor vs assignee
  const isActorAssignee = actorUserId === assigneeId;

  // 3. Resolve the assignee's profile to check if they have a Telegram Chat ID configured
  let telegramChatId: string | null = null;
  try {
    const docSnap = await getAdminDb().collection("users").doc(assigneeId).get();
    if (docSnap.exists) {
      const profile = docSnap.data();
      telegramChatId = profile?.telegram_chat_id ?? null;
    } else {
      console.warn(`[Notification] Usuário atribuído "${assigneeId}" não possui documento de configurações.`);
    }
  } catch (err: any) {
    console.error(`[Notification] Erro ao carregar configurações do usuário atribuído (${assigneeId}):`, err.message);
  }

  if (!telegramChatId) {
    console.log(`[Notification] O destinatário "${assigneeId}" não possui um chat ID do Telegram configurado. Pulando.`);
    return false;
  }

  // 4. Format message based on action
  const cleanTitle = (task.title || "").replace(/\`/g, "'");
  const sourceStr = isActorAssignee ? "NÚCLEO INDIVIDUAL" : "OPERADOR EXTERNO";
  let messageText = "";

  switch (action) {
    case "create":
      messageText = "```\n" +
                    "⬡───[ CÓDICE: NOVO VETOR ]───⬡\n" +
                    "  EVENTO: TAREFA INVOCADA\n" +
                    `  ALVO: ${cleanTitle}\n` +
                    `  FONTE: ${sourceStr}\n` +
                    "  DIRETRIZ: Executar sem deriva.\n" +
                    "  STATUS: PENDENTE (TODO) ○\n" +
                    "⬡───────────────────────────⬡\n" +
                    "```";
      break;

    case "update":
      messageText = "```\n" +
                    "⬡───[ CÓDICE: FLUXO REFORMADO ]───⬡\n" +
                    "  EVENTO: TAREFA ALTERADA\n" +
                    `  ALVO: ${cleanTitle}\n` +
                    `  FONTE: ${sourceStr}\n` +
                    "  DIRETRIZ: O destino foi reescrito.\n" +
                    "⬡─────────────────────────────────⬡\n" +
                    "```";
      break;

    case "delete":
      messageText = "```\n" +
                    "⬡───[ CÓDICE: PURGA DE ENTIDADE ]───⬡\n" +
                    "  EVENTO: TAREFA EXPULSADA\n" +
                    `  ALVO: ${cleanTitle}\n` +
                    `  FONTE: ${sourceStr}\n` +
                    "  DIRETRIZ: Removida do mainframe ativo.\n" +
                    "  STATUS: PURGADA █\n" +
                    "⬡─────────────────────────────────⬡\n" +
                    "```";
      break;

    case "status_change":
      const isDone = task.status === "done";
      const statusStr = isDone ? "CONCLUÍDO (DONE) ●" : "PENDENTE (TODO) ○";
      messageText = "```\n" +
                    "⬡───[ CÓDICE: MUTAÇÃO DE ESTADO ]───⬡\n" +
                    "  EVENTO: ALTERAÇÃO DE STATUS\n" +
                    `  ALVO: ${cleanTitle}\n` +
                    `  FONTE: ${sourceStr}\n` +
                    `  ESTADO: ${statusStr}\n` +
                    `  DIRETRIZ: Entropia recalibrada.\n` +
                    "⬡─────────────────────────────────⬡\n" +
                    "```";
      break;
  }

  // 5. Send message
  return await sendTelegramMessage(telegramChatId, messageText);
}
