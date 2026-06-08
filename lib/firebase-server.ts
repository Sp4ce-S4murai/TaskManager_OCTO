import crypto from "crypto";
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

/**
 * Obtains an access token or ID token to make authenticated REST calls to Firestore on the server.
 */
export async function getBackendFirestoreToken(): Promise<string | null> {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (clientEmail && privateKey) {
    try {
      const header = { alg: "RS256", typ: "JWT" };
      const now = Math.floor(Date.now() / 1000);
      const claim = {
        iss: clientEmail,
        scope: "https://www.googleapis.com/auth/datastore",
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now,
      };
      const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
      const encodedClaim = Buffer.from(JSON.stringify(claim)).toString("base64url");
      const stringToSign = `${encodedHeader}.${encodedClaim}`;
      const signer = crypto.createSign("RSA-SHA256");
      signer.update(stringToSign);
      const signature = signer.sign(privateKey.replace(/\\n/g, "\n"), "base64url");
      const jwt = `${stringToSign}.${signature}`;

      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
      });
      const data = await res.json();
      if (res.ok && data.access_token) {
        return data.access_token;
      }
      console.warn("OAuth2 token fetch failed:", data.error_description || data.error);
    } catch (err: any) {
      console.warn("Error generating OAuth2 token from service account:", err.message);
    }
  }

  const adminEmail = process.env.CRON_SYSTEM_EMAIL;
  const adminPassword = process.env.CRON_SYSTEM_PASSWORD;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (adminEmail && adminPassword && apiKey) {
    try {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: adminEmail, password: adminPassword, returnSecureToken: true }),
        }
      );
      const data = await res.json();
      if (res.ok && data.idToken) {
        return data.idToken;
      }
      console.warn("Admin user sign-in failed:", data.error?.message);
    } catch (err: any) {
      console.warn("Error signing in admin user:", err.message);
    }
  }

  return null;
}

/**
 * Converts standard JS object to Firestore REST fields structure.
 */
export function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const key in obj) {
    const val = obj[key];
    if (val === undefined) continue;
    if (val === null) {
      fields[key] = { nullValue: null };
    } else if (typeof val === "boolean") {
      fields[key] = { booleanValue: val };
    } else if (typeof val === "number") {
      if (Number.isInteger(val)) {
        fields[key] = { integerValue: String(val) };
      } else {
        fields[key] = { doubleValue: val };
      }
    } else if (typeof val === "string") {
      fields[key] = { stringValue: val };
    } else if (Array.isArray(val)) {
      fields[key] = val.length > 0 ? {
        arrayValue: {
          values: val.map(v => {
            if (typeof v === "object" && v !== null) {
              return { mapValue: { fields: toFirestoreFields(v) } };
            }
            if (typeof v === "string") return { stringValue: v };
            if (typeof v === "boolean") return { booleanValue: v };
            if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
            return { nullValue: null };
          })
        }
      } : {
        arrayValue: {}
      };
    } else if (typeof val === "object") {
      if (val instanceof Date) {
        fields[key] = { timestampValue: val.toISOString() };
      } else if (val && (typeof val.toDate === "function" || val.seconds !== undefined)) {
        const d = typeof val.toDate === "function" ? val.toDate() : new Date(Number(val.seconds) * 1000);
        fields[key] = { timestampValue: d.toISOString() };
      } else {
        fields[key] = { mapValue: { fields: toFirestoreFields(val) } };
      }
    }
  }
  return fields;
}

/**
 * Parses Firestore REST document fields to standard JS object.
 */
export function parseFirestoreDoc(doc: any): any {
  if (!doc || !doc.name) return null;
  const fields = doc.fields || {};
  const res: Record<string, any> = {
    id: doc.name.split("/").pop() || "",
  };

  const parseVal = (field: any): any => {
    if (!field) return undefined;
    if ("stringValue" in field) return field.stringValue;
    if ("booleanValue" in field) return field.booleanValue;
    if ("integerValue" in field) return parseInt(field.integerValue, 10);
    if ("doubleValue" in field) return parseFloat(field.doubleValue);
    if ("timestampValue" in field) return field.timestampValue;
    if ("nullValue" in field) return null;
    if ("arrayValue" in field) {
      const values = field.arrayValue.values || [];
      return values.map((v: any) => parseVal(v));
    }
    if ("mapValue" in field) {
      const mapFields = field.mapValue.fields || {};
      const mapRes: Record<string, any> = {};
      for (const k in mapFields) {
        mapRes[k] = parseVal(mapFields[k]);
      }
      return mapRes;
    }
    return undefined;
  };

  for (const key in fields) {
    res[key] = parseVal(fields[key]);
  }

  return res;
}

/**
 * Administrative method to fetch all tasks from Firestore REST API.
 */
export async function getTasksServer(token: string): Promise<any[]> {
  if (!FIREBASE_PROJECT_ID) {
    throw new Error("Variável de ambiente NEXT_PUBLIC_FIREBASE_PROJECT_ID não configurada.");
  }
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/tasks`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erro ao buscar tasks no Firestore: ${errText}`);
  }

  const data = await response.json();
  const docs = data.documents || [];
  return docs.map(parseFirestoreDoc);
}

/**
 * Administrative method to fetch all users from Firestore REST API.
 */
export async function getUsersServer(token: string): Promise<any[]> {
  if (!FIREBASE_PROJECT_ID) {
    throw new Error("Variável de ambiente NEXT_PUBLIC_FIREBASE_PROJECT_ID não configurada.");
  }
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erro ao buscar users no Firestore: ${errText}`);
  }

  const data = await response.json();
  const docs = data.documents || [];
  return docs.map(parseFirestoreDoc);
}

/**
 * Creates a task document in Firestore using administrative/user REST API.
 */
export async function createTaskServer(taskData: any, token: string): Promise<any> {
  if (!FIREBASE_PROJECT_ID) {
    throw new Error("Variável de ambiente NEXT_PUBLIC_FIREBASE_PROJECT_ID não configurada.");
  }
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/tasks`;
  const fields = toFirestoreFields(taskData);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erro ao criar task no Firestore REST: ${errText}`);
  }

  const data = await response.json();
  return parseFirestoreDoc(data);
}

/**
 * Updates a task document in Firestore using administrative/user REST API.
 */
export async function updateTaskServer(taskId: string, updateData: any, token: string): Promise<any> {
  if (!FIREBASE_PROJECT_ID) {
    throw new Error("Variável de ambiente NEXT_PUBLIC_FIREBASE_PROJECT_ID não configurada.");
  }
  const fields = toFirestoreFields(updateData);
  const queryParams = Object.keys(updateData)
    .map((key) => `updateMask.fieldPaths=${key}`)
    .join("&");
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/tasks/${taskId}?${queryParams}`;

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erro ao atualizar task no Firestore REST: ${errText}`);
  }

  const data = await response.json();
  return parseFirestoreDoc(data);
}

/**
 * Deletes a task document from Firestore using administrative/user REST API.
 */
export async function deleteTaskServer(taskId: string, token: string): Promise<void> {
  if (!FIREBASE_PROJECT_ID) {
    throw new Error("Variável de ambiente NEXT_PUBLIC_FIREBASE_PROJECT_ID não configurada.");
  }
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/tasks/${taskId}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erro ao excluir task no Firestore REST: ${errText}`);
  }
}

/**
 * Fetches a single task document from Firestore using REST API.
 */
export async function getTaskServer(taskId: string, token: string): Promise<any> {
  if (!FIREBASE_PROJECT_ID) {
    throw new Error("Variável de ambiente NEXT_PUBLIC_FIREBASE_PROJECT_ID não configurada.");
  }
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/tasks/${taskId}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erro ao buscar task no Firestore REST: ${errText}`);
  }

  const data = await response.json();
  return parseFirestoreDoc(data);
}

