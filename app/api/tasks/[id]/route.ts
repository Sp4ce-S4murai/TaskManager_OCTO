import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/firebase-server";
import { adminDb } from "@/lib/firebase-admin";
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

    // 3. Fetch the existing task to verify details and compare changes
    const docRef = adminDb.collection("tasks").doc(taskId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });
    }
    const existingTask = { id: docSnap.id, ...docSnap.data() } as any;

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

    // 4. Update in Firestore via Admin SDK
    await docRef.update(updateData);

    // Merge changes with old task to ensure full task representation for notifications
    const mergedTask = { ...existingTask, ...updateData };

    // 5. Notify assignee
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

    // 2. Fetch task details before deletion (needed to extract title and assignee for notification)
    const docRef = adminDb.collection("tasks").doc(taskId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });
    }
    const existingTask = { id: docSnap.id, ...docSnap.data() } as any;

    // 3. Delete from Firestore via Admin SDK
    await docRef.delete();

    // 4. Notify assignee
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
