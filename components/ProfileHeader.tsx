"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { UserCircle, Save, Edit3, ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/lib/firebase";
import type { UserProfile } from "@/lib/types";
import { getAvatars } from "@/app/actions";

interface ProfileHeaderProps {
  profileUid: string;
  isCurrentUser: boolean;
}

export default function ProfileHeader({ profileUid, isCurrentUser }: ProfileHeaderProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  
  // Editing state
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [cardAnimation, setCardAnimation] = useState("none");
  const [availableAvatars, setAvailableAvatars] = useState<string[]>([]);
  const [avatarsFetched, setAvatarsFetched] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [saving, setSaving] = useState(false);

  const animations = ["none", "matrix", "runes", "glitch", "grid", "starfield", "hexagons", "binary", "radar", "nebula", "plasma"];

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "users", profileUid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
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

  useEffect(() => {
    if (editing && !avatarsFetched) {
      setAvatarsFetched(true);
      getAvatars().then(avatars => {
        setAvailableAvatars(avatars);
        if (avatars.length > 0 && !avatar) {
          setAvatar(avatars[0]);
        }
      });
    }
  }, [editing, avatarsFetched, avatar]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", profileUid), {
        name: name.trim(),
        bio: bio.trim(),
        avatar: avatar,
        cardAnimation: cardAnimation
      });
      setEditing(false);
    } catch (error) {
      console.error("Failed to update profile", error);
    } finally {
      setSaving(false);
    }
  };

  const nextAvatar = () => {
    if (availableAvatars.length === 0) return;
    const currentIndex = availableAvatars.indexOf(avatar);
    const nextIndex = (currentIndex + 1) % availableAvatars.length;
    setAvatar(availableAvatars[nextIndex]);
  };

  const prevAvatar = () => {
    if (availableAvatars.length === 0) return;
    const currentIndex = availableAvatars.indexOf(avatar);
    const prevIndex = currentIndex <= 0 ? availableAvatars.length - 1 : currentIndex - 1;
    setAvatar(availableAvatars[prevIndex]);
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
      <div className="border border-terminal-green bg-terminal-black p-6 shadow-[0_0_15px_rgba(0,255,65,0.1)] relative">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-3 shrink-0">
            <button 
              type="button"
              onClick={() => editing && setShowGallery(!showGallery)}
              className={`relative w-32 h-32 border border-terminal-green bg-terminal-black/50 overflow-hidden flex items-center justify-center ${editing ? 'cursor-pointer hover:border-white' : 'cursor-default'}`}
            >
              {displayAvatar ? (
                <Image 
                  src={`/avatars/${displayAvatar}`} 
                  alt="Avatar" 
                  fill 
                  className={`object-cover aspect-square transition-all duration-300 ${editing ? 'grayscale-0' : 'grayscale hover:grayscale-0'}`}
                  sizes="128px"
                />
              ) : (
                <UserCircle className="w-16 h-16 text-terminal-green opacity-50" />
              )}
              {editing && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs uppercase font-bold bg-black/60 px-2 py-1">trocar foto</span>
                </div>
              )}
            </button>
            
            {editing && showGallery && availableAvatars.length > 0 && (
              <div className="absolute top-40 left-6 z-50 bg-terminal-black border border-terminal-green p-4 shadow-[0_0_20px_rgba(0,255,65,0.2)] w-64">
                <div className="flex justify-between items-center mb-3 border-b border-terminal-green/30 pb-2">
                  <span className="text-xs font-bold uppercase text-terminal-green">Galeria Neural</span>
                  <button type="button" onClick={() => setShowGallery(false)} className="text-terminal-red hover:text-white text-xs">fechar</button>
                </div>
                <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                  {availableAvatars.map(av => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => {
                        setAvatar(av);
                        setShowGallery(false);
                      }}
                      className={`relative aspect-square border ${avatar === av ? 'border-white scale-105' : 'border-terminal-green/50 hover:border-terminal-green'} transition-all`}
                    >
                      <Image src={`/avatars/${av}`} alt={av} fill className="object-cover" sizes="64px" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="flex-1 space-y-4 w-full">
            <div className="flex justify-between items-start">
              <div className="text-terminal-green">
                <h2 className="text-sm font-bold uppercase mb-1">&gt; identificação</h2>
                {editing ? (
                  <input
                    type="text"
                    className="w-full px-2 py-1 border border-terminal-green bg-transparent text-xl font-bold uppercase text-terminal-green focus:ring-0 focus:outline-none"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="DIGITE SEU NOME"
                    maxLength={50}
                  />
                ) : (
                  <p className="text-2xl font-bold uppercase">{profile.name || "Membro Não Identificado"}</p>
                )}
                <p className="text-xs uppercase text-terminal-gray mt-1">ID: {profile.email}</p>
              </div>

              {isCurrentUser && !editing && (
                <button 
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 border border-terminal-yellow text-terminal-yellow hover:bg-terminal-yellow hover:text-terminal-black transition-colors uppercase text-xs font-bold"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  editar perfil
                </button>
              )}
              {isCurrentUser && editing && (
                <button 
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-3 py-1.5 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-black transition-colors uppercase text-xs font-bold"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? "salvando..." : "salvar"}
                </button>
              )}
            </div>

            <div className="text-terminal-green">
              <h2 className="text-sm font-bold uppercase mb-1">&gt; biografia / status</h2>
              {editing ? (
                <textarea
                  className="w-full px-2 py-2 border border-terminal-green bg-transparent text-sm text-terminal-green focus:ring-0 focus:outline-none resize-none h-24"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="DIGITE SUA BIO..."
                  maxLength={200}
                />
              ) : (
                <p className="text-sm uppercase text-terminal-green/90 whitespace-pre-wrap">
                  {profile.bio || "Nenhum status definido no banco de dados."}
                </p>
              )}
            </div>

            {isCurrentUser && editing && (
              <div className="text-terminal-green pt-2 border-t border-terminal-green/30">
                <h2 className="text-sm font-bold uppercase mb-1">&gt; animação de fundo do mural</h2>
                <select 
                  className="w-full px-2 py-2 border border-terminal-green bg-terminal-black text-sm text-terminal-green focus:ring-0 focus:outline-none uppercase"
                  value={cardAnimation}
                  onChange={e => setCardAnimation(e.target.value)}
                >
                  {animations.map(anim => (
                    <option key={anim} value={anim}>{anim}</option>
                  ))}
                </select>
                <p className="text-xs mt-1 text-terminal-green/70">As animações serão exibidas no fundo das suas tarefas.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
