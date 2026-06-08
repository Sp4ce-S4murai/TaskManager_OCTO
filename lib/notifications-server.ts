import { getUserSettings, getBackendFirestoreToken } from "@/lib/firebase-server";

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
): Promise<void> {
  // 1. Identify the assigned user
  const assigneeId = task.assignedTo || task.user;
  if (!assigneeId) {
    console.log(`[Notification] Evento ignorado: Tarefa "${task.title}" não possui usuário atribuído.`);
    return;
  }

  // 2. Rules regarding the actor vs assignee
  const isActorAssignee = actorUserId === assigneeId;

  // For updates/deletes/creates by the assignee themselves, we do NOT notify.
  // We only notify them if it is a critical status change they performed (for validation).
  if (isActorAssignee && action !== "status_change") {
    console.log(`[Notification] Ignorando notificação de evento '${action}': o ator (${actorUserId}) é o próprio dono da tarefa.`);
    return;
  }

  // 3. Resolve the assignee's profile to check if they have a Telegram Chat ID configured
  let telegramChatId: string | null = null;
  try {
    const token = await getBackendFirestoreToken();
    if (token) {
      const profile = await getUserSettings(assigneeId, token);
      telegramChatId = profile?.telegram_chat_id ?? null;
    } else {
      console.error("[Notification] Não foi possível autenticar no Firestore para buscar o perfil do destinatário.");
    }
  } catch (err: any) {
    console.error(`[Notification] Erro ao carregar configurações do usuário atribuído (${assigneeId}):`, err.message);
  }

  if (!telegramChatId) {
    console.log(`[Notification] O destinatário "${assigneeId}" não possui um chat ID do Telegram configurado. Pulando.`);
    return;
  }

  // 4. Format message based on action
  const taskTitleEscaped = escapeMarkdownV2(task.title);
  let messageText = "";

  switch (action) {
    case "create":
      messageText = `📅 *Nova tarefa atribuída\\!* \n\n` +
                    `A tarefa *${taskTitleEscaped}* foi designada a você por outro operador\\.`;
      break;

    case "update":
      messageText = `✏️ *Tarefa atualizada\\!* \n\n` +
                    `As informações da sua tarefa *${taskTitleEscaped}* foram editadas por outro operador\\.`;
      break;

    case "delete":
      messageText = `🗑️ *Tarefa excluída\\!* \n\n` +
                    `Sua tarefa *${taskTitleEscaped}* foi removida do mainframe por outro operador\\.`;
      break;

    case "status_change":
      const newStatus = task.status === "done" ? "FEITO" : "PENDENTE";
      const statusEscaped = escapeMarkdownV2(newStatus);
      if (isActorAssignee) {
        messageText = `🔔 *Confirmação de Status* \n\n` +
                      `Você alterou o status da sua tarefa *${taskTitleEscaped}* para *${statusEscaped}*\\.`;
      } else {
        messageText = `🚨 *Status Alterado\\!* \n\n` +
                      `O status da sua tarefa *${taskTitleEscaped}* foi alterado para *${statusEscaped}* por outro operador\\.`;
      }
      break;
  }

  // 5. Send message
  await sendTelegramMessage(telegramChatId, messageText);
}
