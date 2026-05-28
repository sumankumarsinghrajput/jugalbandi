"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Zap, Shield, MessageCircle } from "lucide-react";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ email: "", password: "", full_name: "", username: "" });
  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit() {
    setError(""); setSuccess(""); setLoading(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
      if (error) setError(error.message);
      else window.location.href = "/";
    } else {
      if (!form.username || !form.full_name) { setError("Please fill all fields."); setLoading(false); return; }
      const { data, error } = await supabase.auth.signUp({ email: form.email, password: form.password });
      if (error) { setError(error.message); }
      else if (data.user) {
        const { error: pe } = await supabase.from("profiles").insert({ id: data.user.id, full_name: form.full_name, username: form.username.toLowerCase().replace(/\s/g, "") });
        if (pe) setError(pe.message);
        else setSuccess("Account created! Please sign in now.");
      }
    }
    setLoading(false);
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #0a0e1a; font-family: 'Plus Jakarta Sans', sans-serif; }
        input { outline: none; font-family: inherit; }
        input::placeholder { color: rgba(255,255,255,0.3); }
        .auth-wrap {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: #0a0e1a;
          background-image: radial-gradient(rgba(26,111,255,0.08) 1px, transparent 1px);
          background-size: 32px 32px;
        }
        .auth-card { width: 100%; max-width: 460px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 24px; padding: 32px; }
@media (max-width: 480px) { .auth-card { padding: 0; background: none; border: none; border-radius: 0; } }
        .features-row {
          display: flex;
          gap: 8px;
          margin: 14px 0;
        }
        .feature-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 10px 6px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          text-align: center;
        }
        @media (max-width: 480px) {
          .auth-wrap { padding: 16px; justify-content: flex-start; padding-top: 30px; }
        }
      `}</style>

      <div className="auth-wrap">
        <div className="auth-card">

          {/* Logo */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 16 }}>
            <img
              src="/icon-512.png"
              alt="Jugalbandi"
              style={{ width: 70, height: 70, borderRadius: 20, marginBottom: 10, boxShadow: "0 0 28px rgba(26,111,255,0.4)" }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const div = document.createElement("div");
                div.style.cssText = "width:70px;height:70px;border-radius:20px;background:linear-gradient(135deg,#1a6fff,#0d4fd9);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:800;color:#fff;margin-bottom:10px;";
                div.textContent = "J";
                target.parentNode?.insertBefore(div, target);
              }}
            />
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#ffffff", marginBottom: 2 }}>Jugalbandi</h1>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, letterSpacing: "0.1em" }}>CHAT. CONNECT. TOGETHER.</p>
          </div>

          {/* Features row - horizontal always */}
          <div className="features-row">
            {[
              { icon: <MessageCircle size={14} />, title: "Realtime", sub: "Instant" },
              { icon: <Shield size={14} />, title: "Encrypted", sub: "Private" },
              { icon: <Zap size={14} />, title: "AI Powered", sub: "Smart" },
            ].map((f, i) => (
              <div key={i} className="feature-item">
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(26,111,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#60a5fa" }}>{f.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#ffffff" }}>{f.title}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{f.sub}</div>
              </div>
            ))}
          </div>

          {/* Tab Switch */}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 4, marginBottom: 18, border: "1px solid rgba(255,255,255,0.09)" }}>
            {(["login", "signup"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); setSuccess(""); }} style={{ flex: 1, padding: "10px", border: "none", cursor: "pointer", borderRadius: 10, fontSize: 14, fontWeight: 700, background: mode === m ? "linear-gradient(135deg, #1a6fff, #0d4fd9)" : "transparent", color: mode === m ? "#fff" : "rgba(255,255,255,0.45)", transition: "all 0.2s" }}>
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#ffffff", marginBottom: 3 }}>
            {mode === "login" ? "Welcome back" : "Join Jugalbandi"}
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 16 }}>
            {mode === "login" ? "Sign in to continue" : "Create your free account"}
          </p>

          {/* Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {mode === "signup" && (
              <>
                <Field icon={<User size={15} />} placeholder="Full Name" value={form.full_name} onChange={v => update("full_name", v)} />
                <Field icon={<span style={{ fontSize: 14, fontWeight: 600 }}>@</span>} placeholder="Username" value={form.username} onChange={v => update("username", v)} />
              </>
            )}
            <Field icon={<Mail size={15} />} placeholder="Email address" type="email" value={form.email} onChange={v => update("email", v)} />
            <div style={{ position: "relative" }}>
              <Field icon={<Lock size={15} />} placeholder="Password (min 6 chars)" type={showPass ? "text" : "password"} value={form.password} onChange={v => update("password", v)} />
              <div onClick={() => setShowPass(s => !s)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "rgba(255,255,255,0.4)", zIndex: 2 }}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </div>
            </div>
          </div>

          {error && <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#fca5a5", fontSize: 13 }}>{error}</div>}
          {success && <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#86efac", fontSize: 13 }}>{success}</div>}

          <button onClick={handleSubmit} disabled={loading} style={{ marginTop: 16, width: "100%", padding: "14px", background: loading ? "rgba(26,111,255,0.5)" : "linear-gradient(135deg, #1a6fff, #0d4fd9)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: loading ? "none" : "0 0 20px rgba(26,111,255,0.3)" }}>
            {loading ? "Please wait..." : <>{mode === "login" ? "Sign In" : "Create Account"} <ArrowRight size={17} /></>}
          </button>

          <p style={{ textAlign: "center", marginTop: 14, fontSize: 11, color: "rgba(255,255,255,0.25)", lineHeight: 1.6 }}>
            By continuing you agree to Jugalbandi's Terms & Privacy Policy
          </p>
        </div>
      </div>
    </>
  );
}

function Field({ icon, placeholder, type = "text", value, onChange }: { icon: React.ReactNode; placeholder: string; type?: string; value: string; onChange: (v: string) => void; }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 14px" }}>
      <span style={{ color: "rgba(255,255,255,0.4)", flexShrink: 0, display: "flex" }}>{icon}</span>
      <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} style={{ flex: 1, background: "transparent", border: "none", color: "#ffffff", fontSize: 15 }} />
    </div>
  );
}