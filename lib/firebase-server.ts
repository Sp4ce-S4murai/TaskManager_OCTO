import type { UserProfile } from "@/lib/types";

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

/**
 * Extracts the ID token from the Authorization header and verifies it via the Google Identity Toolkit API.
 * Returns the authenticated user's UID (localId) if successful.
 */
export async function verifyAuth(request: Request): Promise<string> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Cabeçalho Authorization ausente ou inválido.");
  }

  const idToken = authHeader.split("Bearer ")[1]?.trim();
  if (!idToken) {
    throw new Error("Token de autenticação não fornecido.");
  }

  if (!FIREBASE_API_KEY) {
    throw new Error("Variável de ambiente NEXT_PUBLIC_FIREBASE_API_KEY não configurada.");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const message = errData?.error?.message || "Falha na verificação do token.";
    throw new Error(`Token inválido ou expirado: ${message}`);
  }

  const data = await response.json();
  if (!data.users || data.users.length === 0) {
    throw new Error("Usuário não encontrado no Firebase Auth.");
  }

  return data.users[0].localId; // The UID
}

/**
 * Safely extracts the token string from the request headers to pass to Firestore REST calls.
 */
export function getRawToken(request: Request): string {
  const authHeader = request.headers.get("authorization");
  return authHeader?.split("Bearer ")[1]?.trim() || "";
}

/**
 * Updates a user document in Firestore using the Firestore REST API on behalf of the user.
 */
export async function updateUserSettings(
  uid: string,
  idToken: string,
  settings: {
    telegram_chat_id: string | null;
    allow_browser_notifications: boolean;
    notify_before_hours: number;
    notify_overdue_daily: boolean;
  }
): Promise<void> {
  if (!FIREBASE_PROJECT_ID) {
    throw new Error("Variável de ambiente NEXT_PUBLIC_FIREBASE_PROJECT_ID não configurada.");
  }

  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}?updateMask.fieldPaths=telegram_chat_id&updateMask.fieldPaths=allow_browser_notifications&updateMask.fieldPaths=notify_before_hours&updateMask.fieldPaths=notify_overdue_daily`;

  const fields: Record<string, any> = {};

  if (settings.telegram_chat_id === null || settings.telegram_chat_id === "") {
    fields.telegram_chat_id = { nullValue: null };
  } else {
    fields.telegram_chat_id = { stringValue: settings.telegram_chat_id };
  }

  fields.allow_browser_notifications = { booleanValue: settings.allow_browser_notifications };
  fields.notify_before_hours = { integerValue: String(settings.notify_before_hours) };
  fields.notify_overdue_daily = { booleanValue: settings.notify_overdue_daily };

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao atualizar Firestore REST: ${errorText}`);
  }
}

/**
 * Fetches user document from Firestore using the REST API and parses it into a clean object.
 */
export async function getUserSettings(uid: string, idToken: string): Promise<UserProfile> {
  if (!FIREBASE_PROJECT_ID) {
    throw new Error("Variável de ambiente NEXT_PUBLIC_FIREBASE_PROJECT_ID não configurada.");
  }

  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao buscar Firestore REST: ${errorText}`);
  }

  const data = await response.json();
  const fields = data.fields || {};

  // Helper to parse Firestore REST field format
  const parseVal = (field: any) => {
    if (!field) return undefined;
    if ("stringValue" in field) return field.stringValue;
    if ("booleanValue" in field) return field.booleanValue;
    if ("integerValue" in field) return parseInt(field.integerValue, 10);
    if ("nullValue" in field) return null;
    return undefined;
  };

  return {
    uid,
    email: parseVal(fields.email) || "",
    name: parseVal(fields.name),
    bio: parseVal(fields.bio),
    avatar: parseVal(fields.avatar),
    cardAnimation: parseVal(fields.cardAnimation),
    telegram_chat_id: parseVal(fields.telegram_chat_id) ?? null,
    allow_browser_notifications: parseVal(fields.allow_browser_notifications) ?? false,
    notify_before_hours: parseVal(fields.notify_before_hours) ?? 2,
    notify_overdue_daily: parseVal(fields.notify_overdue_daily) ?? true,
  };
}

