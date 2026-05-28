"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, Send, Zap, Mic,
  Smile, RotateCcw, Copy, ThumbsUp,
  Sparkles, Globe, BookOpen, Code, PenLine, Brain
} from "lucide-react";

type Message = {
  id: string;
  role: "user" | "model";
  text: string;
  time: string;
};

const SUGGESTIONS = [
  { icon: <PenLine size={15} />, text: "Write a professional email" },
  { icon: <Code size={15} />, text: "Help me debug my code" },
  { icon: <Globe size={15} />, text: "Translate this to Hindi" },
  { icon: <BookOpen size={15} />, text: "Summarize this article" },
  { icon: <Brain size={15} />, text: "Explain a complex topic" },
  { icon: <Sparkles size={15} />, text: "Give me creative ideas" },
];

const STORAGE_KEY = "jugalbandi-ai-chat";

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage only after mount (avoids hydration mismatch)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setMessages(JSON.parse(saved)); } catch {}
    }
    setReady(true);
  }, []);

  // Save to localStorage whenever messages change (only after mount)
  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages, ready]);

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = "/auth"; return; }
      supabase.from("profiles").select("*").eq("id", session.user.id).single()
        .then(({ data }) => { if (data) setProfile(data); });
    });
  }, []);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text?: string) {
    const content = (text || input).trim();
    if (!content || loading) return;
    setInput("");
    setLoading(true);

    const userMsg: Message = {
      id: "u-" + Date.now(),
      role: "user",
      text: content,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: `You are Jugalbandi AI, a smart, friendly assistant. The user's name is ${profile?.full_name || "there"}. Be concise and helpful.`,
          messages: updatedMessages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }],
          })),
        }),
      });

      const data = await response.json();
      const aiText = data.text || "Sorry, I couldn't generate a response.";

      setMessages(prev => [...prev, {
        id: "a-" + Date.now(),
        role: "model",
        text: aiText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: "e-" + Date.now(),
        role: "model",
        text: "Connection error. Please try again.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
    }
    setLoading(false);
  }

  function copyText(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function clearChat() {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  function renderText(text: string) {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("```")) return null;
      if (line.startsWith("### ")) return <div key={i} style={{ fontWeight: 700, fontSize: 15, color: "#f0f4ff", margin: "8px 0 4px" }}>{line.slice(4)}</div>;
      if (line.startsWith("## ")) return <div key={i} style={{ fontWeight: 700, fontSize: 16, color: "#f0f4ff", margin: "10px 0 4px" }}>{line.slice(3)}</div>;
      if (line.startsWith("# ")) return <div key={i} style={{ fontWeight: 700, fontSize: 18, color: "#f0f4ff", margin: "12px 0 6px" }}>{line.slice(2)}</div>;
      if (line.startsWith("- ") || line.startsWith("* ")) return <div key={i} style={{ display: "flex", gap: 8, margin: "2px 0" }}><span style={{ color: "#60a5fa" }}>•</span><span>{line.slice(2)}</span></div>;
      if (line === "") return <div key={i} style={{ height: 6 }} />;
      const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
      return (
        <div key={i} style={{ margin: "1px 0", lineHeight: 1.6 }}>
          {parts.map((part, j) => {
            if (part.startsWith("**") && part.endsWith("**")) return <strong key={j}>{part.slice(2, -2)}</strong>;
            if (part.startsWith("`") && part.endsWith("`")) return <code key={j} style={{ background: "rgba(26,111,255,0.2)", color: "#93c5fd", padding: "1px 6px", borderRadius: 4, fontSize: 13 }}>{part.slice(1, -1)}</code>;
            return <span key={j}>{part}</span>;
          })}
        </div>
      );
    });
  }

  const firstName = profile?.full_name?.split(" ")[0] || "there";

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; background: #0a0e1a; }
        input, button { font-family: 'Plus Jakarta Sans', sans-serif; outline: none; }
        input::placeholder { color: rgba(255,255,255,0.3); }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
        .msg { animation: fadeUp 0.25s ease forwards; }
        .dot { width: 7px; height: 7px; border-radius: 50%; background: #60a5fa; animation: pulse 1.2s infinite; }
        .sug:hover { background: rgba(26,111,255,0.18) !important; border-color: rgba(26,111,255,0.35) !important; }
        .ibtn { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.5); border: none; transition: background 0.15s; flex-shrink: 0; }
        .ibtn:hover { background: rgba(255,255,255,0.1); }
      `}</style>

      <div style={{ height: "100dvh", background: "#0a0e1a", display: "flex", flexDirection: "column", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

        {/* Header */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 12, background: "#0f1525", flexShrink: 0 }}>
          <button className="ibtn" onClick={() => window.location.href = "/"}><ArrowLeft size={17} /></button>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #1a6fff, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Zap size={18} style={{ color: "#fff" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Jugalbandi AI</div>
            <div style={{ fontSize: 11, color: "#22c55e" }}>● Powered by Groq</div>
          </div>
          <button className="ibtn" onClick={clearChat} title="Clear chat"><RotateCcw size={15} /></button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>

          {ready && messages.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 24, gap: 20 }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #1a6fff, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 32px rgba(26,111,255,0.3)" }}>
                <Zap size={32} style={{ color: "#fff" }} />
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Hi {firstName}! I'm Jugalbandi AI</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, maxWidth: 320 }}>I can help you write, code, translate, summarize, and much more.</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%", maxWidth: 480 }}>
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} className="sug" onClick={() => sendMessage(s.text)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, cursor: "pointer", color: "rgba(255,255,255,0.7)", fontSize: 13, textAlign: "left", transition: "all 0.2s" }}>
                    <span style={{ color: "#60a5fa", flexShrink: 0 }}>{s.icon}</span>{s.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className="msg" style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", gap: 10 }}>
              {msg.role === "model" && (
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #1a6fff, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                  <Zap size={14} style={{ color: "#fff" }} />
                </div>
              )}
              <div style={{ maxWidth: "80%" }}>
                <div style={{ padding: "11px 15px", borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: msg.role === "user" ? "linear-gradient(135deg, #1a6fff, #0d4fd9)" : "rgba(15,21,37,1)", border: msg.role === "user" ? "none" : "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.9)", fontSize: 14, lineHeight: 1.6, wordBreak: "break-word" }}>
                  {msg.role === "model" ? renderText(msg.text) : msg.text}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{msg.time}</span>
                  {msg.role === "model" && (
                    <button onClick={() => copyText(msg.id, msg.text)} style={{ background: "none", border: "none", cursor: "pointer", color: copied === msg.id ? "#22c55e" : "rgba(255,255,255,0.3)", padding: "2px", display: "flex" }}>
                      <Copy size={11} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="msg" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #1a6fff, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Zap size={14} style={{ color: "#fff" }} />
              </div>
              <div style={{ padding: "12px 16px", background: "rgba(15,21,37,1)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "18px 18px 18px 4px", display: "flex", gap: 5, alignItems: "center" }}>
                {[0, 0.2, 0.4].map((delay, i) => (
                  <div key={i} className="dot" style={{ animationDelay: `${delay}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "10px 12px 14px", borderTop: "1px solid rgba(255,255,255,0.07)", background: "#0f1525", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "8px 10px" }}>
            <Smile size={20} style={{ color: "rgba(255,255,255,0.4)", flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask Jugalbandi AI anything..."
              disabled={loading}
              style={{ flex: 1, background: "transparent", border: "none", color: "#fff", fontSize: 14, padding: "3px 0", minWidth: 0 }}
            />
            {input.trim() ? (
              <div onClick={() => sendMessage()} style={{ width: 36, height: 36, borderRadius: 11, background: "linear-gradient(135deg, #1a6fff, #0d4fd9)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, opacity: loading ? 0.5 : 1 }}>
                <Send size={16} style={{ color: "#fff" }} />
              </div>
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: 11, background: "rgba(26,111,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                <Mic size={16} style={{ color: "#60a5fa" }} />
              </div>
            )}
          </div>
          <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
            Jugalbandi AI · Powered by Groq · Responses may be inaccurate
          </div>
        </div>
      </div>
    </>
  );
}