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
      return NextResponse.json({ error: "Erro de autenticação interna com o banco de dados." }, { status: 500 });
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
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor." },
      { status: error.message?.includes("Token") ? 401 : 500 }
    );
  }
}
