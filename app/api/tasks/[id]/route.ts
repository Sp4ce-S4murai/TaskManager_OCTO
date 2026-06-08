import { NextResponse } from "next/server";
import { verifyAuth, getBackendFirestoreToken, getTaskServer, updateTaskServer, deleteTaskServer } from "@/lib/firebase-server";
import { notifyTaskEvent } from "@/lib/notifications-server";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = params.id;
    if (!taskId) {
      return NextResponse.json({ error: "O ID da tarefa é obrigatório." }, { status: 400 });
    }

    // 1. Authenticate client user
    const uid = await verifyAuth(request);

    // 2. Parse payload
    const body = await request.json();

    // 3. Obtain administrative token for Firestore REST queries
    const serverToken = await getBackendFirestoreToken();
    if (!serverToken) {
      return NextResponse.json(
        { error: "Erro de autenticação: Credenciais administrativas do Firestore não configuradas no Vercel (verifique as variáveis de ambiente FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY ou CRON_SYSTEM_EMAIL/CRON_SYSTEM_PASSWORD no dashboard da Vercel)." },
        { status: 500 }
      );
    }

    // 4. Fetch the existing task to verify details and compare changes
    const existingTask = await getTaskServer(taskId, serverToken);
    if (!existingTask) {
      return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });
    }

    // Determine the action type: status_change vs update
    let action: "status_change" | "update" = "update";
    if (body.status !== undefined && body.status !== existingTask.status) {
      action = "status_change";
    }

    // Compile properties to update
    const updateData: any = {};
    const updateableKeys = [
      "title",
      "description",
      "status",
      "checklist",
      "cardColor",
      "privacy",
      "assignedTo",
      "dueDate",
      "affiliates",
    ];

    for (const key of updateableKeys) {
      if (body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }

    // 5. Update in Firestore
    const updatedFields = await updateTaskServer(taskId, updateData, serverToken);

    // Merge changes with old task to ensure full task representation for notifications
    const mergedTask = { ...existingTask, ...updatedFields };

    // 6. Notify assignee
    await notifyTaskEvent(action, mergedTask, uid);

    return NextResponse.json({
      success: true,
      task: mergedTask,
    });
  } catch (error: any) {
    console.error(`Erro em PUT /api/tasks/${params.id}:`, error);
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

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = params.id;
    if (!taskId) {
      return NextResponse.json({ error: "O ID da tarefa é obrigatório." }, { status: 400 });
    }

    // 1. Authenticate client user
    const uid = await verifyAuth(request);

    // 2. Obtain administrative token
    const serverToken = await getBackendFirestoreToken();
    if (!serverToken) {
      return NextResponse.json(
        { error: "Erro de autenticação: Credenciais administrativas do Firestore não configuradas no Vercel (verifique as variáveis de ambiente FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY ou CRON_SYSTEM_EMAIL/CRON_SYSTEM_PASSWORD no dashboard da Vercel)." },
        { status: 500 }
      );
    }

    // 3. Fetch task details before deletion (needed to extract title and assignee for notification)
    const existingTask = await getTaskServer(taskId, serverToken);
    if (!existingTask) {
      return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });
    }

    // 4. Delete from Firestore
    await deleteTaskServer(taskId, serverToken);

    // 5. Notify assignee
    await notifyTaskEvent("delete", existingTask, uid);

    return NextResponse.json({
      success: true,
      message: "Tarefa excluída com sucesso.",
    });
  } catch (error: any) {
    console.error(`Erro em DELETE /api/tasks/${params.id}:`, error);
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
