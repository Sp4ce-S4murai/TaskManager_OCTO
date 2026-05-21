"use client";

import dynamic from "next/dynamic";
import { FormEvent, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { LogOut, Terminal } from "lucide-react";

const TaskMural = dynamic(() => import("@/components/TaskMural"), {
  ssr: false,
  loading: () => <p className="mx-auto max-w-7xl p-4 uppercase">loading mural module...</p>
});

export default function AuthGate() {
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
          setError(authError instanceof Error ? authError.message : "Unable to load authentication.");
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
      setError(loginError instanceof Error ? loginError.message : "Unable to authenticate.");
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
        <p className="border border-terminal-green px-4 py-3 uppercase">booting auth session...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-terminal-black p-6 text-terminal-green">
        <section className="w-full max-w-md border border-terminal-green p-5">
          <div className="mb-6 flex items-center gap-3 border-b border-terminal-green pb-4">
            <Terminal aria-hidden className="h-6 w-6" />
            <div>
              <h1 className="text-xl font-bold uppercase tracking-normal">OCTO TASK TERMINAL</h1>
              <p className="text-sm uppercase">authorized employees only</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm uppercase">&gt; email</span>
              <input
                className="w-full px-3 py-3"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm uppercase">&gt; password</span>
              <input
                className="w-full px-3 py-3"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {error ? <p className="border border-terminal-green p-3 text-sm">AUTH ERROR: {error}</p> : null}
            <button className="w-full px-4 py-3 font-bold uppercase" type="submit" disabled={submitting}>
              {submitting ? "authenticating..." : "> login"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-terminal-black text-terminal-green">
      <header className="sticky top-0 z-10 border-b border-terminal-green bg-terminal-black px-4 py-3">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-normal">OCTO TASK TERMINAL</h1>
            <p className="text-sm uppercase">session: {user.email}</p>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 px-4 py-2 uppercase"
            type="button"
            onClick={() => void handleLogout()}
          >
            <LogOut aria-hidden className="h-4 w-4" />
            logout
          </button>
        </div>
      </header>
      <TaskMural user={user} />
    </main>
  );
}
