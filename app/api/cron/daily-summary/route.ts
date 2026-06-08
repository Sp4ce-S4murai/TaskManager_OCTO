import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendTelegramMessage, escapeMarkdownV2 } from "@/lib/notifications-server";

// Prevent Next.js from pre-rendering this route at build time
export const dynamic = "force-dynamic";

// Helper to parse dates from various formats
function parseDate(val: any): Date | null {
  if (!val) return null;
  if (typeof val === "object") {
    if (typeof val.toDate === "function") return val.toDate();
    if ("seconds" in val) return new Date(Number(val.seconds) * 1000);
    if ("_seconds" in val) return new Date(Number(val._seconds) * 1000);
    if ("timestampValue" in val) return new Date(val.timestampValue);
  }
  if (typeof val === "string") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  if (typeof val === "number") {
    return new Date(val);
  }
  return null;
}

// Helper to format date into DD/MM/YYYY
function formatDateDisplay(val: any): string {
  const d = parseDate(val);
  if (!d) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

async function handleDailySummary(request: Request) {
  try {
    // 1. Authenticate the cron trigger if CRON_SECRET is configured
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn("[Cron] Chamada de cron não autorizada: Token incorreto.");
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    console.log("[Cron] Iniciando execução do cron de resumo diário...");

    // 2. Fetch all tasks and all users using Admin SDK
    const tasksSnapshot = await getAdminDb().collection("tasks").get();
    const allTasks: any[] = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const usersSnapshot = await getAdminDb().collection("users").get();
    const allUsers: any[] = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log(`[Cron] Encontradas ${allTasks.length} tasks e ${allUsers.length} usuários.`);

    // 4. Filter tasks that are NOT DONE
    const pendingTasks = allTasks.filter((task) => task.status !== "done");
    console.log(`[Cron] Encontradas ${pendingTasks.length} tarefas pendentes.`);

    if (pendingTasks.length === 0) {
      return NextResponse.json({ success: true, message: "Nenhuma tarefa pendente encontrada." });
    }

    // 5. Create a lookup map for users configurations by UID
    const usersMap: Record<string, any> = {};
    for (const u of allUsers) {
      if (u.id) {
        usersMap[u.id] = u;
      }
    }

    // 6. Group pending tasks by assignee (assignedTo or user)
    const tasksByUser: Record<string, any[]> = {};
    for (const task of pendingTasks) {
      const assigneeId = task.assignedTo || task.user;
      if (assigneeId) {
        if (!tasksByUser[assigneeId]) {
          tasksByUser[assigneeId] = [];
        }
        tasksByUser[assigneeId].push(task);
      }
    }

    // 7. Define Today boundaries for local date comparison
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    let summarySentCount = 0;
    let summaryFailCount = 0;

    // 8. Process and send summary messages to users
    for (const assigneeId in tasksByUser) {
      const userProfile = usersMap[assigneeId];
      const telegramChatId = userProfile?.telegram_chat_id;

      if (!telegramChatId) {
        console.log(`[Cron] Usuário ${assigneeId} possui tarefas pendentes, mas não tem telegram_chat_id cadastrado. Resumo ignorado.`);
        continue;
      }

      const userTasks = tasksByUser[assigneeId];
      const overdueTasks: any[] = [];
      const todayTasks: any[] = [];
      const futureTasks: any[] = [];

      for (const t of userTasks) {
        const deadlineVal = t.dueDate || t.deadline;
        const deadlineDate = parseDate(deadlineVal);

        if (!deadlineDate) {
          // If no deadline, list under future/general pending
          futureTasks.push(t);
        } else {
          if (deadlineDate < todayStart) {
            overdueTasks.push(t);
          } else if (deadlineDate >= todayStart && deadlineDate <= todayEnd) {
            todayTasks.push(t);
          } else {
            futureTasks.push(t);
          }
        }
      }

      // Format unified Telegram message in MarkdownV2
      let message = "```\n" +
                    "⬡───[ CÓDICE: DIÁRIO DE PENDÊNCIAS ]───⬡\n" +
                    "  MAINFRAME: Tarefas ativas localizadas\n\n";

      let hasContent = false;

      if (overdueTasks.length > 0) {
        hasContent = true;
        message += "  🚨 ATRASADAS (ENTROPIA CRÍTICA):\n";
        for (const t of overdueTasks) {
          const cleanTitle = (t.title || "").replace(/\`/g, "'");
          const deadlineVal = t.dueDate || t.deadline;
          const dateStr = formatDateDisplay(deadlineVal);
          message += `  • ${cleanTitle} (Prazo: ${dateStr})\n`;
        }
        message += "\n";
      }

      if (todayTasks.length > 0) {
        hasContent = true;
        message += "  ⚠️ CICLO ATIVO (ATUAL):\n";
        for (const t of todayTasks) {
          const cleanTitle = (t.title || "").replace(/\`/g, "'");
          message += `  • ${cleanTitle}\n`;
        }
        message += "\n";
      }

      if (futureTasks.length > 0) {
        hasContent = true;
        message += "  ⚙️ FUTURAS (PLANEJADO):\n";
        for (const t of futureTasks) {
          const cleanTitle = (t.title || "").replace(/\`/g, "'");
          const deadlineVal = t.dueDate || t.deadline;
          if (deadlineVal) {
            const dateStr = formatDateDisplay(deadlineVal);
            message += `  • ${cleanTitle} (Prazo: ${dateStr})\n`;
          } else {
            message += `  • ${cleanTitle}\n`;
          }
        }
        message += "\n";
      }

      if (hasContent) {
        message += "  [ DIRETRIZ: Elimine as derivas temporais. ]\n" +
                   "⬡───────────────────────────────────⬡\n" +
                   "```";
        const sent = await sendTelegramMessage(telegramChatId, message);
        if (sent) {
          summarySentCount++;
        } else {
          summaryFailCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      processedUsers: Object.keys(tasksByUser).length,
      sentCount: summarySentCount,
      failedCount: summaryFailCount,
    });
  } catch (error: any) {
    console.error("[Cron] Erro fatal na execução do daily-summary cron:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return handleDailySummary(request);
}

export async function POST(request: Request) {
  return handleDailySummary(request);
}
