import { NextResponse } from "next/server";
import { verifyAuth, getRawToken, updateUserSettings } from "@/lib/firebase-server";

export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const uid = await verifyAuth(request);
    const token = getRawToken(request);

    // 2. Parse payload
    const body = await request.json();
    const {
      telegram_chat_id,
      allow_browser_notifications,
      notify_before_hours,
      notify_overdue_daily,
    } = body;

    // 3. Validation & Sanitization
    let cleanTelegramChatId: string | null = null;
    if (typeof telegram_chat_id === "string") {
      const trimmed = telegram_chat_id.trim();
      if (trimmed.length > 0) {
        // Validate Telegram chat ID format (can be positive or negative integer)
        if (!/^-?\d+$/.test(trimmed)) {
          return NextResponse.json(
            { error: "O Chat ID do Telegram deve conter apenas números (opcionalmente precedido por hífen para grupos)." },
            { status: 400 }
          );
        }
        cleanTelegramChatId = trimmed;
      }
    }

    const cleanAllowBrowser = Boolean(allow_browser_notifications);
    const cleanNotifyOverdue = Boolean(notify_overdue_daily);

    let cleanBeforeHours = 2; // Default
    if (typeof notify_before_hours === "number" && !isNaN(notify_before_hours)) {
      cleanBeforeHours = Math.max(0, Math.min(168, Math.floor(notify_before_hours))); // Clamp between 0h and 168h (1 week)
    }

    // 4. Update Database
    await updateUserSettings(uid, token, {
      telegram_chat_id: cleanTelegramChatId,
      allow_browser_notifications: cleanAllowBrowser,
      notify_before_hours: cleanBeforeHours,
      notify_overdue_daily: cleanNotifyOverdue,
    });

    return NextResponse.json({
      success: true,
      message: "Configurações de notificação salvas com sucesso.",
    });
  } catch (error: any) {
    console.error("Erro em /api/notifications/save-settings:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor." },
      { status: error.message?.includes("Token") ? 401 : 500 }
    );
  }
}
