"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Camera, Check, X, User, AtSign, FileText, Save } from "lucide-react";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.replace("/auth"); return; }
      setUser(session.user);
      supabase.from("profiles").select("*").eq("id", session.user.id).single()
        .then(({ data }) => {
          if (data) {
            setFullName(data.full_name || "");
            setUsername(data.username || "");
            setBio(data.bio || "");
            setAvatarUrl(data.avatar_url || "");
            setAvatarPreview(data.avatar_url || "");
          }
          setLoading(false);
        });
    });
  }, []);

  async function uploadAvatar(file: File) {
    if (!CLOUD_NAME || !UPLOAD_PRESET) return null;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST", body: formData,
      });
      const data = await res.json();
      setUploading(false);
      return data.secure_url;
    } catch {
      setUploading(false);
      alert("Upload failed.");
      return null;
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    // Upload to Cloudinary
    const url = await uploadAvatar(file);
    if (url) setAvatarUrl(url);
  }

  async function saveProfile() {
    if (!user || saving) return;
    if (!fullName.trim()) { alert("Name cannot be empty."); return; }
    if (!username.trim()) { alert("Username cannot be empty."); return; }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: fullName.trim(),
      username: username.trim().toLowerCase(),
      bio: bio.trim(),
      avatar_url: avatarUrl,
    }).eq("id", user.id);
    setSaving(false);
    if (error) {
      alert(error.message.includes("unique") ? "Username already taken." : "Failed to save. Try again.");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  const getInitials = (name: string) => name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  if (loading) return (
    <div style={{ height: "100vh", background: "#0a0e1a", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <img src="/icon-512.png" style={{ width: 64, height: 64, borderRadius: 20 }} />
      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 15 }}>Loading...</div>
    </div>
  );

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; background: #0a0e1a; }
        input, textarea { outline: none; font-family: 'Plus Jakarta Sans', sans-serif; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.3); }
        textarea { resize: none; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#0a0e1a", fontFamily: "'Plus Jakarta Sans', sans-serif", display: "flex", flexDirection: "column", alignItems: "center" }}>

        {/* Header */}
        <div style={{ width: "100%", maxWidth: 560, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#0f1525", position: "sticky", top: 0, zIndex: 10 }}>
          <button onClick={() => window.location.href = "/"} style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.05)", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer" }}>
            <ArrowLeft size={17} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Edit Profile</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Update your info</div>
          </div>
          <button onClick={saveProfile} disabled={saving || uploading} style={{ padding: "8px 18px", background: saved ? "#22c55e" : "linear-gradient(135deg, #1a6fff, #0d4fd9)", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, opacity: saving || uploading ? 0.7 : 1, transition: "background 0.3s" }}>
            {saved ? <><Check size={14} /> Saved</> : saving ? "Saving..." : uploading ? "Uploading..." : <><Save size={14} /> Save</>}
          </button>
        </div>

        <div style={{ width: "100%", maxWidth: 560, padding: "24px 16px", display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Avatar */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative" }}>
              <div style={{ width: 96, height: 96, borderRadius: "50%", background: avatarPreview ? "transparent" : "linear-gradient(135deg, #1a6fff, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: "#fff", overflow: "hidden", border: "3px solid rgba(26,111,255,0.4)" }}>
                {avatarPreview
                  ? <img src={avatarPreview} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : getInitials(fullName || "U")}
              </div>
              <button onClick={() => fileInputRef.current?.click()} style={{ position: "absolute", bottom: 0, right: 0, width: 30, height: 30, borderRadius: "50%", background: "#1a6fff", border: "2px solid #0a0e1a", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                {uploading
                  ? <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />
                  : <Camera size={13} style={{ color: "#fff" }} />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Tap camera to change photo</div>
          </div>

          {/* Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Full Name */}
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14, padding: "4px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "10px 0" }}>
                <User size={15} style={{ color: "#60a5fa", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>Full Name</div>
                  <input
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Your full name"
                    maxLength={50}
                    style={{ width: "100%", background: "transparent", border: "none", color: "#fff", fontSize: 14, fontWeight: 500 }}
                  />
                </div>
              </div>

              {/* Username */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0" }}>
                <AtSign size={15} style={{ color: "#60a5fa", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>Username</div>
                  <input
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="your_username"
                    maxLength={30}
                    style={{ width: "100%", background: "transparent", border: "none", color: "#fff", fontSize: 14, fontWeight: 500 }}
                  />
                </div>
              </div>
            </div>

            {/* Bio */}
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14, padding: "12px 16px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <FileText size={15} style={{ color: "#60a5fa", flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>Bio</div>
                  <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="Write something about yourself..."
                    maxLength={150}
                    rows={3}
                    style={{ width: "100%", background: "transparent", border: "none", color: "#fff", fontSize: 14, lineHeight: 1.6 }}
                  />
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "right" }}>{bio.length}/150</div>
                </div>
              </div>
            </div>

            {/* Account info */}
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14, padding: "12px 16px" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>Account</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{user?.email}</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}