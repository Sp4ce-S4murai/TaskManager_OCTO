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

function formatDateDisplay(dueDateStr: string): string {
  if (!dueDateStr) return "Sem prazo";
  const parts = dueDateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dueDateStr;
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

  // 3. Resolve assignee and actor profiles
  let telegramChatId: string | null = null;
  let assigneeName = "Desconhecido";
  let actorName = "Desconhecido";

  try {
    const docSnap = await getAdminDb().collection("users").doc(assigneeId).get();
    if (docSnap.exists) {
      const profile = docSnap.data();
      telegramChatId = profile?.telegram_chat_id ?? null;
      assigneeName = profile?.name || profile?.email || assigneeId;
    } else {
      console.warn(`[Notification] Usuário atribuído "${assigneeId}" não possui documento de configurações.`);
    }
  } catch (err: any) {
    console.error(`[Notification] Erro ao carregar configurações do usuário atribuído (${assigneeId}):`, err.message);
  }

  try {
    const actorSnap = await getAdminDb().collection("users").doc(actorUserId).get();
    if (actorSnap.exists) {
      const profile = actorSnap.data();
      actorName = profile?.name || profile?.email || actorUserId;
    }
  } catch (err: any) {
    console.error(`[Notification] Erro ao carregar perfil do ator (${actorUserId}):`, err.message);
  }

  if (!telegramChatId) {
    console.log(`[Notification] O destinatário "${assigneeId}" não possui um chat ID do Telegram configurado. Pulando.`);
    return false;
  }

  // 4. Format message based on action
  const cleanTitle = (task.title || "").replace(/\`/g, "'");
  const cleanDesc = (task.description || "Nenhuma descrição fornecida.").replace(/\`/g, "'");
  const actorStr = isActorAssignee ? "Você mesmo" : actorName;
  const assigneeStr = isActorAssignee ? "Você mesmo" : assigneeName;
  
  const priorityMap: Record<string, string> = { low: "Baixa", medium: "Média", high: "Alta" };
  const priorityStr = priorityMap[task.priority] || "Média";

  const dueDateStr = task.dueDate ? formatDateDisplay(task.dueDate) : "Sem prazo definido";

  let checklistStr = "";
  if (task.checklist && task.checklist.length > 0) {
    checklistStr = "\n  CHECKLIST:\n";
    for (const item of task.checklist) {
      checklistStr += `  ${item.isDone ? "[x]" : "[ ]"} ${item.text.replace(/\`/g, "'")}\n`;
    }
  }

  let actionStr = "";
  let statusStr = task.status === "done" ? "CONCLUÍDO (DONE) ●" : "PENDENTE (TODO) ○";

  switch (action) {
    case "create":
      actionStr = "CRIADA / ATRIBUÍDA";
      break;
    case "update":
      actionStr = "DADOS ATUALIZADOS";
      break;
    case "delete":
      actionStr = "EXCLUÍDA (DELETED)";
      statusStr = "REMOVIDA";
      break;
    case "status_change":
      actionStr = "ALTERAÇÃO DE STATUS";
      break;
  }

  const messageText = "```\n" +
                      `⬡───[ TAREFA: ${actionStr} ]───⬡\n` +
                      `  EXECUTOR: ${actorStr}\n` +
                      `  TÍTULO: ${cleanTitle}\n` +
                      `  DESCRIÇÃO: ${cleanDesc}\n` +
                      `  PRIORIDADE: ${priorityStr}\n` +
                      `  STATUS: ${statusStr}\n` +
                      `  DESIGNAÇÃO: ${assigneeStr}\n` +
                      `  PRAZO: ${dueDateStr}${checklistStr}` +
                      "⬡───────────────────────────────────⬡\n" +
                      "```";

  // 5. Send message
  return await sendTelegramMessage(telegramChatId, messageText);
}
