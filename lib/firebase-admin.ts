import admin from "firebase-admin";

/**
 * Initializes the Firebase Admin SDK lazily (on first call, not at import time).
 * This prevents build-time crashes when env vars are unavailable during Next.js
 * "Collecting page data" phase.
 */
function ensureInitialized(): void {
  if (admin.apps.length) return;

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Erro de autenticação: Credenciais administrativas do Firestore não configuradas no Vercel (verifique as variáveis de ambiente FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY)."
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"), // Corrige quebras de linha de strings no ambiente Vercel
    }),
  });
}

/**
 * Returns the Firestore Admin instance, initializing the SDK on first call.
 */
export function getAdminDb(): admin.firestore.Firestore {
  ensureInitialized();
  return admin.firestore();
}

export { admin };

