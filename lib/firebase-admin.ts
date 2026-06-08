import admin from "firebase-admin";

const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!admin.apps.length) {
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

export const adminDb = admin.firestore();
export { admin };
