import { NextResponse } from "next/server";
import { verifyAuth, getBackendFirestoreToken, createTaskServer } from "@/lib/firebase-server";
import { notifyTaskEvent } from "@/lib/notifications-server";

export async function POST(request: Request) {
  try {
    // 1. Authenticate client user
    const uid = await verifyAuth(request);

    // 2. Parse payload
    const body = await request.json();
    const { title, description, checklist, cardColor, privacy, assignedTo, dueDate, authorEmail } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "O título da tarefa é obrigatório." }, { status: 400 });
    }

    // 3. Obtain administrative token for Firestore REST writes
    const serverToken = await getBackendFirestoreToken();
    if (!serverToken) {
      return NextResponse.json(
        { error: "Erro de autenticação: Credenciais administrativas do Firestore não configuradas no Vercel (verifique as variáveis de ambiente FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY ou CRON_SYSTEM_EMAIL/CRON_SYSTEM_PASSWORD no dashboard da Vercel)." },
        { status: 500 }
      );
    }

    const taskData: any = {
      title: title.trim(),
      description: (description || "").trim(),
      status: "todo",
      authorEmail: authorEmail || "desconhecido",
      authorUid: uid,
      checklist: checklist || [],
      imageUrl: null,
      cardColor: cardColor || "terminal-green",
      privacy: privacy || "corporate",
      timestamp: new Date(),
      assignedTo: assignedTo || null,
      dueDate: dueDate || null,
      affiliates: [],
    };

    // 4. Save to Firestore
    const createdTask = await createTaskServer(taskData, serverToken);

    // 5. Trigger reactive Telegram notification to the assignee
    await notifyTaskEvent("create", createdTask, uid);

    return NextResponse.json({
      success: true,
      task: createdTask,
    });
  } catch (error: any) {
    console.error("Erro em POST /api/tasks:", error);
    const isAuthError =
      error.message?.includes("Token") ||
      error.message?.includes("Authorization") ||
      error.message?.includes("Cabeçalho");
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor." },
      { status: isAuthError ? 401 : 500 }
    );
  }
}
