"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, Send, Zap, Mic, Paperclip,
  Smile, RotateCcw, Copy, ThumbsUp, ThumbsDown,
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

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = "/auth"; return; }
      supabase.from("profiles").select("*").eq("id", session.user.id).single()
        .then(({ data }) => { if (data) setProfile(data); });
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text?: string) {
    const content = text || input.trim();
    if (!content || loading) return;
    setInput("");
    setLoading(true);

    const userMsg: Message = {
      id: "u-" + Date.now(),
      role: "user",
      text: content,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages(prev => [...prev, userMsg]);

    // Build history for Gemini
    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: {
              parts: [{
                text: `You are Jugalbandi AI, a smart, friendly, and helpful assistant built into the Jugalbandi messaging app. You help users with writing, coding, translation, summarization, creative tasks, and general knowledge. Keep responses concise, clear, and well-formatted. Use markdown for code blocks and lists when appropriate. The user's name is ${profile?.full_name || "there"}.`
              }]
            },
            contents: [
              ...history,
              { role: "user", parts: [{ text: content }] }
            ],
            generationConfig: {
              temperature: 0.9,
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      const data = await response.json();
      const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response. Please try again.";

      const aiMsg: Message = {
        id: "a-" + Date.now(),
        role: "model",
        text: aiText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      const errMsg: Message = {
        id: "e-" + Date.now(),
        role: "model",
        text: "Connection error. Please check your internet and try again.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages(prev => [...prev, errMsg]);
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
  }

  // Simple markdown renderer
  function renderText(text: string) {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      if (line.startsWith("```")) return null;
      if (line.startsWith("### ")) return <div key={i} style={{ fontWeight: 700, fontSize: 15, color: "#f0f4ff", margin: "8px 0 4px" }}>{line.slice(4)}</div>;
      if (line.startsWith("## ")) return <div key={i} style={{ fontWeight: 700, fontSize: 16, color: "#f0f4ff", margin: "10px 0 4px" }}>{line.slice(3)}</div>;
      if (line.startsWith("# ")) return <div key={i} style={{ fontWeight: 700, fontSize: 18, color: "#f0f4ff", margin: "12px 0 6px" }}>{line.slice(2)}</div>;
      if (line.startsWith("- ") || line.startsWith("* ")) return <div key={i} style={{ display: "flex", gap: 8, margin: "2px 0" }}><span style={{ color: "#60a5fa", flexShrink: 0 }}>•</span><span>{line.slice(2)}</span></div>;
      if (line.match(/^\d+\. /)) return <div key={i} style={{ display: "flex", gap: 8, margin: "2px 0" }}><span style={{ color: "#60a5fa", flexShrink: 0 }}>{line.match(/^\d+/)?.[0]}.</span><span>{line.replace(/^\d+\. /, "")}</span></div>;
      if (line === "") return <div key={i} style={{ height: 6 }} />;

      // Inline bold and code
      const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
      return (
        <div key={i} style={{ margin: "1px 0", lineHeight: 1.6 }}>
          {parts.map((part, j) => {
            if (part.startsWith("**") && part.endsWith("**")) return <strong key={j} style={{ color: "#f0f4ff", fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
            if (part.startsWith("`") && part.endsWith("`")) return <code key={j} style={{ background: "rgba(26,111,255,0.2)", color: "#93c5fd", padding: "1px 6px", borderRadius: 4, fontSize: 13, fontFamily: "monospace" }}>{part.slice(1, -1)}</code>;
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
        .msg-in { animation: fadeUp 0.25s ease forwards; }
        .typing-dot { width: 7px; height: 7px; border-radius: 50%; background: #60a5fa; animation: pulse 1.2s infinite; }
        .suggestion-btn:hover { background: rgba(26,111,255,0.18) !important; border-color: rgba(26,111,255,0.35) !important; }
        .icon-btn { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.5); border: none; transition: background 0.15s; flex-shrink: 0; }
        .icon-btn:hover { background: rgba(255,255,255,0.1); }
      `}</style>

      <div style={{ height: "100vh", height: "100dvh", background: "#0a0e1a", display: "flex", flexDirection: "column", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

        {/* Header */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 12, background: "#0f1525", flexShrink: 0 }}>
          <button className="icon-btn" onClick={() => window.location.href = "/"}>
            <ArrowLeft size={17} />
          </button>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #1a6fff, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Zap size={18} style={{ color: "#fff" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#ffffff" }}>Jugalbandi AI</div>
            <div style={{ fontSize: 11, color: "#22c55e" }}>● Powered by Gemini</div>
          </div>
          <button className="icon-btn" onClick={clearChat} title="Clear chat">
            <RotateCcw size={15} />
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Welcome screen */}
          {messages.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 24, gap: 20 }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #1a6fff, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 32px rgba(26,111,255,0.3)" }}>
                <Zap size={32} style={{ color: "#fff" }} />
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#ffffff", marginBottom: 6 }}>Hi {firstName}! I'm Jugalbandi AI</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, maxWidth: 320 }}>
                  I can help you write, code, translate, summarize, and much more. What would you like to do?
                </div>
              </div>

              {/* Suggestions */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%", maxWidth: 480 }}>
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} className="suggestion-btn" onClick={() => sendMessage(s.text)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, cursor: "pointer", color: "rgba(255,255,255,0.7)", fontSize: 13, textAlign: "left", transition: "all 0.2s" }}>
                    <span style={{ color: "#60a5fa", flexShrink: 0 }}>{s.icon}</span>
                    {s.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((msg) => (
            <div key={msg.id} className="msg-in" style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", gap: 10 }}>
              {msg.role === "model" && (
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #1a6fff, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                  <Zap size={14} style={{ color: "#fff" }} />
                </div>
              )}
              <div style={{ maxWidth: "80%" }}>
                <div style={{
                  padding: "11px 15px",
                  borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: msg.role === "user" ? "linear-gradient(135deg, #1a6fff, #0d4fd9)" : "rgba(15,21,37,1)",
                  border: msg.role === "user" ? "none" : "1px solid rgba(255,255,255,0.09)",
                  color: "rgba(255,255,255,0.85)",
                  fontSize: 14,
                  lineHeight: 1.6,
                  wordBreak: "break-word",
                }}>
                  {msg.role === "model" ? renderText(msg.text) : msg.text}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{msg.time}</span>
                  {msg.role === "model" && (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => copyText(msg.id, msg.text)} style={{ background: "none", border: "none", cursor: "pointer", color: copied === msg.id ? "#22c55e" : "rgba(255,255,255,0.3)", padding: "2px", borderRadius: 4, display: "flex", alignItems: "center" }}>
                        <Copy size={11} />
                      </button>
                      <button style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: "2px", borderRadius: 4, display: "flex", alignItems: "center" }}>
                        <ThumbsUp size={11} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="msg-in" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #1a6fff, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Zap size={14} style={{ color: "#fff" }} />
              </div>
              <div style={{ padding: "12px 16px", background: "rgba(15,21,37,1)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "18px 18px 18px 4px", display: "flex", gap: 5, alignItems: "center" }}>
                {[0, 0.2, 0.4].map((delay, i) => (
                  <div key={i} className="typing-dot" style={{ animationDelay: `${delay}s` }} />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "10px 12px 14px", borderTop: "1px solid rgba(255,255,255,0.07)", background: "#0f1525", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "8px 10px" }}>
            <Smile size={20} style={{ color: "rgba(255,255,255,0.4)", cursor: "pointer", flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask Jugalbandi AI anything..."
              style={{ flex: 1, background: "transparent", border: "none", color: "#ffffff", fontSize: 14, padding: "3px 0", minWidth: 0 }}
              disabled={loading}
            />
            {input.trim() ? (
              <div onClick={() => sendMessage()} style={{ width: 36, height: 36, borderRadius: 11, background: loading ? "rgba(26,111,255,0.4)" : "linear-gradient(135deg, #1a6fff, #0d4fd9)", display: "flex", alignItems: "center", justifyContent: "center", cursor: loading ? "not-allowed" : "pointer", flexShrink: 0 }}>
                <Send size={16} style={{ color: "#fff" }} />
              </div>
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: 11, background: "rgba(26,111,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                <Mic size={16} style={{ color: "#60a5fa" }} />
              </div>
            )}
          </div>
          <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
            Jugalbandi AI · Powered by Google Gemini · Responses may be inaccurate
          </div>
        </div>
      </div>
    </>
  );
}