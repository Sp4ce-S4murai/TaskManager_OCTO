"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { LogOut, Terminal } from "lucide-react";
import { AuthContext } from "@/lib/auth-context";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let mounted = true;

    void import("@/lib/firebase").then(({ auth }) => {
      if (!mounted) {
        return;
      }

      import("firebase/auth")
        .then(({ onAuthStateChanged }) => {
          unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthLoading(false);
          });
        })
        .catch((authError) => {
          setError(authError instanceof Error ? authError.message : "Falha ao carregar autenticação.");
          setAuthLoading(false);
        });
    });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const [{ auth, db }, { signInWithEmailAndPassword }, { doc, serverTimestamp, setDoc }] = await Promise.all([
        import("@/lib/firebase"),
        import("firebase/auth"),
        import("firebase/firestore")
      ]);
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);

      await setDoc(
        doc(db, "users", credential.user.uid),
        {
          uid: credential.user.uid,
          email: credential.user.email ?? email.trim(),
          lastLoginAt: serverTimestamp()
        },
        { merge: true }
      );
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Falha ao autenticar.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    const [{ auth }, { signOut }] = await Promise.all([import("@/lib/firebase"), import("firebase/auth")]);
    await signOut(auth);
  };

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-terminal-black p-6 text-terminal-green">
        <p className="border border-terminal-yellow px-4 py-3 uppercase text-terminal-yellow">iniciando sessão de autenticação...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-terminal-black p-6 text-terminal-green">
        <section className="w-full max-w-md border border-terminal-green p-5 shadow-[0_0_15px_rgba(0,255,255,0.1)]">
          <div className="mb-6 flex items-center gap-3 border-b border-terminal-green pb-4 text-terminal-green">
            <Terminal aria-hidden className="h-6 w-6" />
            <div>
              <h1 className="text-xl font-bold uppercase tracking-normal">OCTO TASK TERMINAL</h1>
              <p className="text-sm uppercase text-terminal-gray">acesso restrito a funcionários</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm uppercase text-terminal-green">&gt; email</span>
              <input
                className="w-full px-3 py-3 border-terminal-green focus:ring-0 focus:border-terminal-green text-terminal-green bg-terminal-black"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm uppercase text-terminal-green">&gt; senha</span>
              <input
                className="w-full px-3 py-3 border-terminal-green focus:ring-0 focus:border-terminal-green text-terminal-green bg-terminal-black"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {error ? <p className="border border-terminal-red text-terminal-red p-3 text-sm font-bold">ERRO DE AUTH: {error}</p> : null}
            <button className="w-full border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-black px-4 py-3 font-bold uppercase transition-colors" type="submit" disabled={submitting}>
              {submitting ? "autenticando..." : "> entrar"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <AuthContext.Provider value={{ user, logout: handleLogout }}>
      <main className="min-h-screen bg-terminal-black text-terminal-green">
        {children}
      </main>
    </AuthContext.Provider>
  );
}
