"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { UserCircle, Save, Edit3, X } from "lucide-react";
import { db } from "@/lib/firebase";
import type { UserProfile } from "@/lib/types";
import { getAvatars } from "@/app/actions";

interface ProfileHeaderProps {
  profileUid: string;
  isCurrentUser: boolean;
}

const ANIMATIONS = [
  { id: "none",      label: "Nenhuma" },
  { id: "matrix",    label: "Matrix" },
  { id: "runes",     label: "Runas" },
  { id: "glitch",    label: "Glitch" },
  { id: "grid",      label: "Grade 3D" },
  { id: "starfield", label: "Campo Estelar" },
  { id: "hexagons",  label: "Hexágonos" },
  { id: "binary",    label: "Binário" },
  { id: "radar",     label: "Radar" },
  { id: "nebula",    label: "Nebulosa" },
  { id: "plasma",    label: "Plasma" },
];

export default function ProfileHeader({ profileUid, isCurrentUser }: ProfileHeaderProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // Edit form state
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [cardAnimation, setCardAnimation] = useState("none");
  const [saving, setSaving] = useState(false);

  // Gallery state
  const [availableAvatars, setAvailableAvatars] = useState<string[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);

  // Live profile snapshot
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "users", profileUid), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setProfile(data);
        if (!editing) {
          setName(data.name || "");
          setBio(data.bio || "");
          setAvatar(data.avatar || "");
          setCardAnimation(data.cardAnimation || "none");
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, [profileUid, editing]);

  // Load avatars list when entering edit mode
  useEffect(() => {
    if (editing && availableAvatars.length === 0) {
      getAvatars().then((files) => setAvailableAvatars(files));
    }
  }, [editing, availableAvatars.length]);

  // Close gallery when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (galleryRef.current && !galleryRef.current.contains(e.target as Node)) {
        setShowGallery(false);
      }
    };
    if (showGallery) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showGallery]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", profileUid), {
        name: name.trim(),
        bio: bio.trim(),
        avatar,
        cardAnimation,
      });
      setEditing(false);
      setShowGallery(false);
    } catch (err) {
      console.error("Failed to update profile", err);
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    setShowGallery(false);
    if (profile) {
      setName(profile.name || "");
      setBio(profile.bio || "");
      setAvatar(profile.avatar || "");
      setCardAnimation(profile.cardAnimation || "none");
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-7xl p-4 uppercase text-terminal-yellow">carregando perfil...</div>;
  }
  if (!profile) {
    return <div className="mx-auto max-w-7xl p-4 uppercase text-terminal-red">perfil não encontrado no mainframe.</div>;
  }

  const displayAvatar = editing ? avatar : profile.avatar;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6">
      <div className="border border-terminal-green bg-terminal-black p-6 shadow-[0_0_15px_rgba(0,255,65,0.1)]">
        <div className="flex flex-col md:flex-row gap-6 items-start">

          {/* ── Avatar column ── */}
          <div className="flex flex-col items-center gap-3 shrink-0">

            {/* Avatar preview / click target */}
            <div className="relative" ref={galleryRef}>
              <button
                type="button"
                disabled={!editing}
                onClick={() => setShowGallery(prev => !prev)}
                className={[
                  "relative w-32 h-32 border border-terminal-green bg-terminal-black overflow-hidden flex items-center justify-center",
                  editing ? "cursor-pointer hover:border-white" : "cursor-default",
                ].join(" ")}
                aria-label="Selecionar avatar"
              >
                {displayAvatar ? (
                  <Image
                    src={`/avatars/${displayAvatar}`}
                    alt="Avatar"
                    fill
                    className="object-cover"
                    sizes="128px"
                    unoptimized
                  />
                ) : (
                  <UserCircle className="w-16 h-16 text-terminal-green opacity-50" />
                )}
                {editing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-bold uppercase px-2 py-1 bg-black/60">
                      trocar foto
                    </span>
                  </div>
                )}
              </button>

              {/* Gallery dropdown — absolutely positioned relative to the button wrapper */}
              {showGallery && availableAvatars.length > 0 && (
                <div className="absolute top-[136px] left-0 z-50 bg-terminal-black border border-terminal-green shadow-[0_0_20px_rgba(0,255,65,0.3)] w-72">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-terminal-green/40">
                    <span className="text-terminal-green text-xs font-bold uppercase">Galeria Neural</span>
                    <button
                      type="button"
                      onClick={() => setShowGallery(false)}
                      className="text-terminal-red hover:text-white"
                      aria-label="Fechar galeria"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 p-3 max-h-64 overflow-y-auto">
                    {availableAvatars.map((av) => (
                      <button
                        key={av}
                        type="button"
                        onClick={() => { setAvatar(av); setShowGallery(false); }}
                        className={[
                          "relative aspect-square border-2 transition-all overflow-hidden",
                          avatar === av
                            ? "border-white scale-105"
                            : "border-terminal-green/30 hover:border-terminal-green",
                        ].join(" ")}
                        title={av.replace(/_/g, " ").replace(/\.[^.]+$/, "")}
                      >
                        <Image
                          src={`/avatars/${av}`}
                          alt={av}
                          fill
                          className="object-cover"
                          sizes="64px"
                          unoptimized
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {editing && (
              <p className="text-terminal-green/60 text-xs uppercase text-center">
                clique na foto para trocar
              </p>
            )}
          </div>

          {/* ── Info column ── */}
          <div className="flex-1 space-y-4 w-full">

            {/* Header row */}
            <div className="flex justify-between items-start gap-4">
              <div className="text-terminal-green flex-1">
                <h2 className="text-xs font-bold uppercase mb-1 opacity-60">&gt; identificação</h2>
                {editing ? (
                  <input
                    type="text"
                    className="w-full px-2 py-1 border border-terminal-green bg-transparent text-xl font-bold uppercase text-terminal-green focus:ring-0 focus:outline-none"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="NOME DE USUÁRIO"
                    maxLength={50}
                  />
                ) : (
                  <p className="text-2xl font-bold uppercase">{profile.name || "Membro Não Identificado"}</p>
                )}
                <p className="text-xs uppercase text-terminal-green/50 mt-1">UID: {profile.email}</p>
              </div>

              {isCurrentUser && (
                <div className="flex gap-2 shrink-0 mt-1">
                  {!editing ? (
                    <button
                      onClick={() => setEditing(true)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 border border-terminal-yellow text-terminal-yellow hover:bg-terminal-yellow hover:text-terminal-black transition-colors uppercase text-xs font-bold"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      editar
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={cancelEdit}
                        className="inline-flex items-center gap-2 px-3 py-1.5 border border-terminal-red text-terminal-red hover:bg-terminal-red hover:text-terminal-black transition-colors uppercase text-xs font-bold"
                      >
                        <X className="w-3.5 h-3.5" />
                        cancelar
                      </button>
                      <button
                        onClick={() => void handleSave()}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-3 py-1.5 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-black transition-colors uppercase text-xs font-bold disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {saving ? "salvando..." : "salvar"}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Bio */}
            <div className="text-terminal-green">
              <h2 className="text-xs font-bold uppercase mb-1 opacity-60">&gt; biografia / status</h2>
              {editing ? (
                <textarea
                  className="w-full px-2 py-2 border border-terminal-green bg-transparent text-sm text-terminal-green focus:ring-0 focus:outline-none resize-none h-20"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="DESCRIÇÃO DO USUÁRIO..."
                  maxLength={200}
                />
              ) : (
                <p className="text-sm text-terminal-green/80 whitespace-pre-wrap">
                  {profile.bio || "Nenhum status definido."}
                </p>
              )}
            </div>

            {/* Animation selector (only when editing) */}
            {isCurrentUser && editing && (
              <div className="text-terminal-green pt-3 border-t border-terminal-green/20">
                <h2 className="text-xs font-bold uppercase mb-2 opacity-60">&gt; animação de fundo das suas tarefas</h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {ANIMATIONS.map((anim) => (
                    <button
                      key={anim.id}
                      type="button"
                      onClick={() => setCardAnimation(anim.id)}
                      className={[
                        "px-2 py-1.5 border text-xs uppercase font-bold transition-all",
                        cardAnimation === anim.id
                          ? "border-terminal-green bg-terminal-green text-terminal-black"
                          : "border-terminal-green/40 text-terminal-green/70 hover:border-terminal-green hover:text-terminal-green",
                      ].join(" ")}
                    >
                      {anim.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs mt-2 text-terminal-green/40">
                  Esta animação aparece no fundo de todas as suas tarefas no mural.
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </section>
  );
}
