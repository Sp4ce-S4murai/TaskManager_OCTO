import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/firebase-server";
import { adminDb, admin } from "@/lib/firebase-admin";
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
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      assignedTo: assignedTo || null,
      dueDate: dueDate || null,
      affiliates: [],
    };

    // 4. Save to Firestore via Admin SDK
    const docRef = await adminDb.collection("tasks").add(taskData);

    // Retrieve the created task from Firestore to have the resolved server timestamp
    const taskSnap = await docRef.get();
    const createdTask = { id: docRef.id, ...taskSnap.data() };

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
