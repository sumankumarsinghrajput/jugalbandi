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

  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    username: "",
  });

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit() {
    setError("");
    setSuccess("");
    setLoading(true);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (error) setError(error.message);
      else window.location.href = "/";
    } else {
      if (!form.username || !form.full_name) {
        setError("Please fill all fields.");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });
      if (error) {
        setError(error.message);
      } else if (data.user) {
        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          full_name: form.full_name,
          username: form.username.toLowerCase().replace(/\s/g, ""),
        });
        if (profileError) setError(profileError.message);
        else setSuccess("Account created! Check your email to verify, then login.");
      }
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0e1a",
      display: "flex",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      overflow: "hidden",
    }}>
      {/* Left Panel */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "48px",
        position: "relative",
        borderRight: "1px solid rgba(255,255,255,0.05)",
      }}>
        {/* Background dots */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(26,111,255,0.15) 1px, transparent 1px)", backgroundSize: "32px 32px", pointerEvents: "none" }} />

        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, zIndex: 1 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 24,
            background: "linear-gradient(135deg, #1a6fff, #0d4fd9)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 40px rgba(26,111,255,0.4)",
            fontSize: 36, fontWeight: 800, color: "#fff",
          }}>J</div>

          <div style={{ textAlign: "center" }}>
            <h1 style={{
              fontSize: 42, fontWeight: 800, margin: 0,
              background: "linear-gradient(135deg, #60a5fa, #ffffff, #93c5fd)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>Jugalbandi</h1>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 8, letterSpacing: "0.1em" }}>
              CHAT. CONNECT. TOGETHER.
            </p>
          </div>

          {/* Features */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 32, width: "100%", maxWidth: 320 }}>
            {[
              { icon: <MessageCircle size={18} />, title: "Realtime Messaging", sub: "Instant delivery, zero delay" },
              { icon: <Shield size={18} />, title: "End-to-End Encrypted", sub: "Your privacy is guaranteed" },
              { icon: <Zap size={18} />, title: "AI Powered", sub: "Smart replies & assistance" },
            ].map((f, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 18px", borderRadius: 14,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: "rgba(26,111,255,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#60a5fa", flexShrink: 0,
                }}>{f.icon}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#f0f4ff" }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>{f.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div style={{
        width: 440,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "48px 40px",
        flexShrink: 0,
      }}>
        {/* Tab Switch */}
        <div style={{
          display: "flex", background: "rgba(255,255,255,0.05)",
          borderRadius: 12, padding: 4, marginBottom: 36,
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
          {(["login", "signup"] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); setSuccess(""); }} style={{
              flex: 1, padding: "10px", border: "none", cursor: "pointer",
              borderRadius: 10, fontSize: 14, fontWeight: 600,
              background: mode === m ? "linear-gradient(135deg, #1a6fff, #0d4fd9)" : "transparent",
              color: mode === m ? "#fff" : "rgba(255,255,255,0.4)",
              transition: "all 0.2s", textTransform: "capitalize",
            }}>{m === "login" ? "Sign In" : "Create Account"}</button>
          ))}
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#f0f4ff", margin: "0 0 6px" }}>
          {mode === "login" ? "Welcome back" : "Join Jugalbandi"}
        </h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", margin: "0 0 28px" }}>
          {mode === "login" ? "Sign in to continue your conversations" : "Create your free account today"}
        </p>

        {/* Form Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {mode === "signup" && (
            <>
              <InputField icon={<User size={16} />} placeholder="Full Name" value={form.full_name} onChange={v => update("full_name", v)} />
              <InputField icon={<span style={{ fontSize: 14 }}>@</span>} placeholder="Username" value={form.username} onChange={v => update("username", v)} />
            </>
          )}
          <InputField icon={<Mail size={16} />} placeholder="Email address" type="email" value={form.email} onChange={v => update("email", v)} />
          <div style={{ position: "relative" }}>
            <InputField icon={<Lock size={16} />} placeholder="Password" type={showPass ? "text" : "password"} value={form.password} onChange={v => update("password", v)} />
            <div onClick={() => setShowPass(s => !s)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "rgba(255,255,255,0.35)", zIndex: 2 }}>
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </div>
          </div>
        </div>

        {/* Error / Success */}
        {error && (
          <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#fca5a5", fontSize: 13 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#86efac", fontSize: 13 }}>
            {success}
          </div>
        )}

        {/* Submit Button */}
        <button onClick={handleSubmit} disabled={loading} style={{
          marginTop: 24, width: "100%", padding: "14px",
          background: loading ? "rgba(26,111,255,0.5)" : "linear-gradient(135deg, #1a6fff, #0d4fd9)",
          border: "none", borderRadius: 12, color: "#fff",
          fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          transition: "all 0.2s",
          boxShadow: loading ? "none" : "0 0 24px rgba(26,111,255,0.35)",
        }}>
          {loading ? (
            <span>Please wait...</span>
          ) : (
            <>
              <span>{mode === "login" ? "Sign In" : "Create Account"}</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>

        {mode === "login" && (
          <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
            Forgot password?{" "}
            <span style={{ color: "#60a5fa", cursor: "pointer" }} onClick={async () => {
              if (!form.email) { setError("Enter your email first."); return; }
              await supabase.auth.resetPasswordForEmail(form.email);
              setSuccess("Password reset email sent!");
            }}>Reset it</span>
          </p>
        )}

        <p style={{ textAlign: "center", marginTop: 32, fontSize: 12, color: "rgba(255,255,255,0.2)", lineHeight: 1.6 }}>
          By continuing you agree to Jugalbandi's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

function InputField({ icon, placeholder, type = "text", value, onChange }: {
  icon: React.ReactNode;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.09)",
      borderRadius: 12, padding: "12px 14px",
    }}>
      <span style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0, display: "flex" }}>{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          flex: 1, background: "transparent", border: "none",
          color: "#f0f4ff", fontSize: 14,
        }}
      />
    </div>
  );
}