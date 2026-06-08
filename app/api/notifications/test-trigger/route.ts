import { NextResponse } from "next/server";
import { verifyAuth, getRawToken, getUserSettings } from "@/lib/firebase-server";

export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const uid = await verifyAuth(request);
    const token = getRawToken(request);

    // 2. Fetch User Settings from Firestore
    const userSettings = await getUserSettings(uid, token);

    const { telegram_chat_id, allow_browser_notifications } = userSettings;

    let telegramSent = false;
    let telegramError: string | null = null;

    // 3. Send Telegram test notification if chat ID is configured
    if (telegram_chat_id) {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        telegramError = "TELEGRAM_BOT_TOKEN não está configurado no arquivo .env.local do servidor.";
      } else {
        // Escaped message text according to Telegram MarkdownV2 requirements
        const testMessage =
          "🚨 *ALERTA DE SISTEMA: TASKMANAGER\\_OCTO* 🚨\n\n" +
          "Olá\\! Este é um teste oficial de notificação do seu terminal de produtividade\\.\n\n" +
          "*A procrastinação destrói sua produtividade\\!*\n" +
          "Não adie suas obrigações\\. Complete suas tarefas a tempo\\! Foco total\\.";

        try {
          const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              chat_id: telegram_chat_id,
              text: testMessage,
              parse_mode: "MarkdownV2",
            }),
          });

          const resData = await response.json();
          if (response.ok && resData.ok) {
            telegramSent = true;
          } else {
            telegramError = resData.description || "Erro desconhecido retornado pela API do Telegram.";
          }
        } catch (err: any) {
          telegramError = err.message || "Erro de conexão ao enviar requisição para o Telegram.";
        }
      }
    } else {
      telegramError = "Nenhum ID de Chat do Telegram configurado no perfil.";
    }

    // 4. Return response
    return NextResponse.json({
      success: true,
      telegram: {
        attempted: Boolean(telegram_chat_id),
        sent: telegramSent,
        error: telegramError,
      },
      browserNotification: {
        shouldTrigger: allow_browser_notifications,
        title: "🚨 OCTO: Alerta de Teste",
        options: {
          body: "A procrastinação é sua maior inimiga. Foco total e mãos à obra!",
          icon: "/avatars/avatar_oracle_1779380039328.png", // Fallback to oracle avatar or default icon if available
          tag: "octo-test-notification",
          requireInteraction: true,
        },
      },
    });
  } catch (error: any) {
    console.error("Erro em /api/notifications/test-trigger:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor." },
      { status: error.message?.includes("Token") ? 401 : 500 }
    );
  }
}
