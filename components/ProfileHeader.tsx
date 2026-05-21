"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { UserCircle, Save, Edit3, X, Check } from "lucide-react";
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
  { id: "grid",      label: "Grade" },
  { id: "starfield", label: "Estrelas" },
  { id: "hexagons",  label: "Hexágonos" },
  { id: "binary",    label: "Binário" },
  { id: "radar",     label: "Radar" },
  { id: "nebula",    label: "Nebulosa" },
  { id: "plasma",    label: "Plasma" },
];

// ─── Avatar Gallery Popup (rendered via Portal) ───────────────────────────
function AvatarGalleryPopup({
  avatars,
  current,
  onSelect,
  onClose,
}: {
  avatars: string[];
  current: string;
  onSelect: (av: string) => void;
  onClose: () => void;
}) {
  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    // Backdrop
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal box */}
      <div
        className="bg-[#000] border border-[#00FF41] w-full max-w-2xl max-h-[85vh] flex flex-col"
        style={{ boxShadow: "0 0 40px rgba(0,255,65,0.25)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#00FF41]/30">
          <h2 className="text-[#00FF41] font-bold uppercase text-sm tracking-widest">
            ⬡ Galeria Neural — selecione seu avatar
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#FF003C] hover:text-white transition-colors"
            aria-label="Fechar galeria"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grid */}
        <div className="overflow-y-auto p-4 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
          {avatars.map((av) => {
            const selected = av === current;
            return (
              <button
                key={av}
                type="button"
                onClick={() => { onSelect(av); onClose(); }}
                className="relative aspect-square overflow-hidden transition-transform hover:scale-105 focus:outline-none"
                style={{
                  border: selected ? "2px solid #fff" : "2px solid rgba(0,255,65,0.3)",
                  boxShadow: selected ? "0 0 12px rgba(0,255,65,0.6)" : "none",
                }}
                title={av.replace(/^avatar_/,"").replace(/_\d+\.png$/,"").replace(/_/g," ")}
              >
                <Image
                  src={`/avatars/${av}`}
                  alt={av}
                  fill
                  className="object-cover"
                  sizes="120px"
                  unoptimized
                />
                {selected && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Check className="w-6 h-6 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#00FF41]/20 text-[#00FF41]/40 text-xs uppercase">
          {avatars.length} avatares disponíveis · clique para selecionar · ESC para fechar
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main Component ───────────────────────────────────────────────────────
export default function ProfileHeader({ profileUid, isCurrentUser }: ProfileHeaderProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // Edit form
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [cardAnimation, setCardAnimation] = useState("none");
  const [saving, setSaving] = useState(false);

  // Gallery popup
  const [availableAvatars, setAvailableAvatars] = useState<string[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Client-only for portal
  useEffect(() => { setMounted(true); }, []);

  // Live snapshot
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

  // Fetch avatars when edit mode opens
  useEffect(() => {
    if (editing && availableAvatars.length === 0) {
      getAvatars().then((files) => setAvailableAvatars(files));
    }
  }, [editing, availableAvatars.length]);

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
    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
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
    return (
      <div className="mx-auto max-w-7xl p-6 text-[#FFFF00] uppercase text-sm">
        carregando perfil...
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="mx-auto max-w-7xl p-6 text-[#FF003C] uppercase text-sm">
        perfil não encontrado.
      </div>
    );
  }

  const displayAvatar = editing ? avatar : (profile.avatar || "");

  return (
    <>
      {/* Gallery Popup rendered via portal */}
      {mounted && showGallery && availableAvatars.length > 0 && (
        <AvatarGalleryPopup
          avatars={availableAvatars}
          current={avatar}
          onSelect={setAvatar}
          onClose={() => setShowGallery(false)}
        />
      )}

      <section className="mx-auto w-full max-w-7xl px-4 py-6">
        <div
          className="bg-[#000] p-6"
          style={{ border: "1px solid #00FF41", boxShadow: "0 0 15px rgba(0,255,65,0.08)" }}
        >
          <div className="flex flex-col md:flex-row gap-6 items-start">

            {/* ── Avatar ── */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={!editing}
                onClick={() => editing && setShowGallery(true)}
                className="relative w-32 h-32 overflow-hidden group"
                style={{
                  border: editing ? "1px solid #fff" : "1px solid #00FF41",
                  cursor: editing ? "pointer" : "default",
                }}
                aria-label={editing ? "Abrir galeria de avatares" : "Avatar"}
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
                  <UserCircle className="w-full h-full text-[#00FF41] opacity-40 p-4" />
                )}

                {editing && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
                  >
                    <span className="text-white text-xs font-bold uppercase">trocar</span>
                    <span className="text-[#00FF41] text-[10px] mt-0.5">clique aqui</span>
                  </div>
                )}
              </button>

              {editing && (
                <p className="text-[#00FF41]/50 text-[10px] uppercase text-center">
                  clique na foto para trocar
                </p>
              )}
            </div>

            {/* ── Info ── */}
            <div className="flex-1 space-y-4 w-full">

              {/* Name row */}
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 text-[#00FF41]">
                  <p className="text-[10px] uppercase opacity-50 mb-1">&gt; identificação</p>
                  {editing ? (
                    <input
                      type="text"
                      className="w-full bg-transparent text-xl font-bold uppercase text-[#00FF41] outline-none px-2 py-1"
                      style={{ border: "1px solid #00FF41" }}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="SEU NOME"
                      maxLength={50}
                    />
                  ) : (
                    <p className="text-2xl font-bold uppercase">
                      {profile.name || "Membro Não Identificado"}
                    </p>
                  )}
                  <p className="text-[10px] uppercase opacity-40 mt-1">{profile.email}</p>
                </div>

                {isCurrentUser && (
                  <div className="flex gap-2 shrink-0 mt-1">
                    {!editing ? (
                      <button
                        onClick={() => setEditing(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase transition-colors"
                        style={{ border: "1px solid #FFFF00", color: "#FFFF00" }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = "#FFFF00";
                          (e.currentTarget as HTMLElement).style.color = "#000";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                          (e.currentTarget as HTMLElement).style.color = "#FFFF00";
                        }}
                      >
                        <Edit3 className="w-3.5 h-3.5" /> editar
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={cancelEdit}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase transition-colors"
                          style={{ border: "1px solid #FF003C", color: "#FF003C" }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor = "#FF003C";
                            (e.currentTarget as HTMLElement).style.color = "#000";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                            (e.currentTarget as HTMLElement).style.color = "#FF003C";
                          }}
                        >
                          <X className="w-3.5 h-3.5" /> cancelar
                        </button>
                        <button
                          onClick={() => void handleSave()}
                          disabled={saving}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase transition-colors disabled:opacity-40"
                          style={{ border: "1px solid #00FF41", color: "#00FF41" }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor = "#00FF41";
                            (e.currentTarget as HTMLElement).style.color = "#000";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                            (e.currentTarget as HTMLElement).style.color = "#00FF41";
                          }}
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
              <div className="text-[#00FF41]">
                <p className="text-[10px] uppercase opacity-50 mb-1">&gt; biografia</p>
                {editing ? (
                  <textarea
                    className="w-full bg-transparent text-sm text-[#00FF41] outline-none px-2 py-2 resize-none h-20"
                    style={{ border: "1px solid #00FF41" }}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="DESCRIÇÃO..."
                    maxLength={200}
                  />
                ) : (
                  <p className="text-sm opacity-80 whitespace-pre-wrap">
                    {profile.bio || "Nenhum status definido."}
                  </p>
                )}
              </div>

              {/* Animation picker */}
              {isCurrentUser && editing && (
                <div style={{ borderTop: "1px solid rgba(0,255,65,0.2)", paddingTop: "12px" }}>
                  <p className="text-[10px] text-[#00FF41] uppercase opacity-50 mb-2">
                    &gt; animação de fundo das suas tarefas
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ANIMATIONS.map((anim) => (
                      <button
                        key={anim.id}
                        type="button"
                        onClick={() => setCardAnimation(anim.id)}
                        className="px-3 py-1 text-xs uppercase font-bold transition-all"
                        style={{
                          border: `1px solid ${cardAnimation === anim.id ? "#00FF41" : "rgba(0,255,65,0.3)"}`,
                          backgroundColor: cardAnimation === anim.id ? "#00FF41" : "transparent",
                          color: cardAnimation === anim.id ? "#000" : "rgba(0,255,65,0.6)",
                        }}
                      >
                        {anim.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] mt-2 text-[#00FF41]/30">
                    Aparece no fundo de todas as suas tarefas no mural.
                  </p>
                </div>
              )}

            </div>
          </div>
        </div>
      </section>
    </>
  );
}
