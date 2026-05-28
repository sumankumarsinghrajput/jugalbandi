"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search, Settings, Bell, Edit, Phone, Video,
  Smile, Paperclip, Mic, Send, MoreVertical,
  Users, Hash, Star, Zap,
  CheckCheck, Shield, LogOut, ArrowLeft,
} from "lucide-react";

type Message = {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  is_read: boolean;
};

type Profile = {
  id: string;
  full_name: string;
  username: string;
  avatar_url?: string;
};

type Chat = {
  id: string;
  name: string;
  avatar: string;
  color: string;
  lastMsg: string;
  time: string;
  unread: number;
  online: boolean;
  ai?: boolean;
  saved?: boolean;
};

const DEMO_CHATS: Chat[] = [
  { id: "saved", name: "Saved Messages", avatar: "★", color: "#1a6fff", lastMsg: "Your personal notes & messages", time: "", unread: 0, online: true, saved: true },
  { id: "demo-1", name: "Priya Sharma", avatar: "PS", color: "#7c3aed", lastMsg: "Kal milte hain? ☕", time: "2m", unread: 3, online: true },
  { id: "demo-2", name: "Rahul Dev Team", avatar: "RD", color: "#0d9488", lastMsg: "Build deploy ho gaya 🚀", time: "15m", unread: 12, online: false },
  { id: "demo-3", name: "Arjun Mehta", avatar: "AM", color: "#dc2626", lastMsg: "Theek hai bhai", time: "1h", unread: 0, online: true },
  { id: "demo-4", name: "AI Assistant", avatar: "AI", color: "#6d28d9", lastMsg: "I can help you!", time: "2h", unread: 0, online: true, ai: true },
  { id: "demo-5", name: "Sneha Kapoor", avatar: "SK", color: "#d97706", lastMsg: "Photo bhej rahi hun 📸", time: "3h", unread: 1, online: false },
  { id: "demo-6", name: "Tech Jugalbandi", avatar: "TJ", color: "#059669", lastMsg: "New update: v2.0!", time: "5h", unread: 0, online: false },
];

export default function JugalbandiApp() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = "/auth"; return; }
      setUser(session.user);
      fetchProfile(session.user.id);
      setLoading(false);
    });
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) setProfile(data);
  }

  // Fetch messages from Supabase
  async function fetchMessages(userId: string) {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: true })
      .limit(100);
    if (data) setMessages(data);
  }

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    fetchMessages(user.id);

    const channel = supabase
      .channel("realtime-messages-" + user.id)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `sender_id=eq.${user.id}`,
      }, (payload) => {
        setMessages(prev => {
          const exists = prev.find(m => m.id === (payload.new as Message).id);
          if (exists) return prev;
          return [...prev, payload.new as Message];
        });
      })
      useEffect(() => {
  if (!user) return;
  fetchMessages(user.id);

  const channel = supabase
    .channel("realtime-" + user.id)
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "messages",
    }, (payload) => {
      const newMsg = payload.new as Message;
      setMessages(prev => {
        const alreadyExists = prev.some(
          m => m.id === newMsg.id || m.id.startsWith("optimistic-")
            && (m as any).content === newMsg.content
            && m.sender_id === newMsg.sender_id
        );
        if (alreadyExists) {
          return prev.map(m =>
            m.id.startsWith("optimistic-") && m.content === newMsg.content
              ? newMsg
              : m
          );
        }
        return [...prev, newMsg];
      });
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [user]);
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
  if (!message.trim() || !user || sending) return;
  setSending(true);
  const content = message.trim();
  setMessage("");

  const optimisticMsg: Message = {
    id: "optimistic-" + Date.now(),
    content,
    sender_id: user.id,
    receiver_id: user.id,
    created_at: new Date().toISOString(),
    is_read: false,
  };
  setMessages(prev => [...prev, optimisticMsg]);

  const { data, error } = await supabase
    .from("messages")
    .insert({ sender_id: user.id, receiver_id: user.id, content })
    .select()
    .single();

  if (error) {
    setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
  } else if (data) {
    setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data : m));
  }
  setSending(false);
}

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  function openChat(chat: Chat) {
    setActiveChat(chat);
    setShowChat(true);
  }

  function backToList() {
    setShowChat(false);
    setActiveChat(null);
  }

  const initials = profile?.full_name
    ?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  // Only show real messages in "Saved Messages" chat
  // Demo chats show demo messages (empty for now)
  const chatMessages = activeChat?.saved ? messages : [];

  const filtered = DEMO_CHATS.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div style={{
      height: "100vh", background: "#0a0e1a",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 16,
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 20,
        background: "linear-gradient(135deg, #1a6fff, #0d4fd9)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 28, fontWeight: 800, color: "#fff"
      }}>J</div>
      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 15 }}>Loading Jugalbandi...</div>
    </div>
  );

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; }
        .app {
          display: flex;
          height: 100vh;
          height: 100dvh;
          background: #0a0e1a;
          font-family: 'Plus Jakarta Sans', sans-serif;
          overflow: hidden;
          position: relative;
        }
        .sidebar {
          width: 320px;
          min-width: 320px;
          background: #0f1525;
          border-right: 1px solid rgba(255,255,255,0.07);
          display: flex;
          flex-direction: column;
          height: 100%;
          flex-shrink: 0;
        }
        .chat-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          background: #0a0e1a;
          height: 100%;
        }
        .icon-btn {
          width: 36px; height: 36px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.55); flex-shrink: 0;
          border: none;
          transition: background 0.15s;
        }
        .icon-btn:hover { background: rgba(255,255,255,0.1); }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
        input { outline: none; font-family: inherit; }
        input::placeholder { color: rgba(255,255,255,0.3); }
        .chat-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; cursor: pointer; border-left: 3px solid transparent; transition: all 0.15s; }
        .chat-item:hover { background: rgba(255,255,255,0.04); }
        .chat-item.active { background: rgba(26,111,255,0.12); border-left-color: #1a6fff; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .msg-in { animation: fadeUp 0.2s ease forwards; }

        /* ── Mobile ── */
        @media (max-width: 768px) {
          .sidebar {
            width: 100%; min-width: unset;
            position: absolute; inset: 0; z-index: 10;
          }
          .sidebar.slide-out { display: none; }
          .chat-area {
            position: absolute; inset: 0; z-index: 10;
          }
          .chat-area.slide-out { display: none; }
        }
      `}</style>

      <div className="app">

        {/* ── SIDEBAR ── */}
        <div className={`sidebar${showChat ? " slide-out" : ""}`}>

          {/* Header */}
          <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #1a6fff, #0d4fd9)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, color: "#fff", flexShrink: 0 }}>J</div>
                <span style={{ fontSize: 19, fontWeight: 700, color: "#ffffff" }}>Jugalbandi</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="icon-btn"><Edit size={15} /></button>
                <button className="icon-btn" onClick={handleLogout} style={{ color: "rgba(255,100,100,0.8)" }}><LogOut size={15} /></button>
              </div>
            </div>

            {/* Profile chip */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "8px 12px", background: "rgba(26,111,255,0.09)", borderRadius: 10, border: "1px solid rgba(26,111,255,0.18)" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #1a6fff, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile?.full_name || "User"}</div>
                <div style={{ fontSize: 11, color: "#60a5fa" }}>@{profile?.username || "—"}</div>
              </div>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
            </div>

            {/* Search */}
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.35)", pointerEvents: "none" }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations..."
                style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 10, padding: "9px 10px 9px 34px", color: "#ffffff", fontSize: 13 }}
              />
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", padding: "8px 12px", gap: 6, borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
            {["all", "unread", "groups"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: "7px 4px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: activeTab === tab ? "rgba(26,111,255,0.22)" : "rgba(255,255,255,0.04)", color: activeTab === tab ? "#60a5fa" : "rgba(255,255,255,0.45)", textTransform: "capitalize", transition: "all 0.2s" }}>
                {tab}
              </button>
            ))}
          </div>

          {/* Chat list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filtered.map(chat => (
              <div
                key={chat.id}
                className={`chat-item${activeChat?.id === chat.id ? " active" : ""}`}
                onClick={() => openChat(chat)}
              >
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{ width: 46, height: 46, borderRadius: "50%", background: chat.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: chat.saved ? 18 : 13, fontWeight: 700, color: "#fff" }}>
                    {chat.ai ? <Zap size={20} /> : chat.avatar}
                  </div>
                  {chat.online && (
                    <div style={{ position: "absolute", bottom: 1, right: 1, width: 11, height: 11, background: "#22c55e", borderRadius: "50%", border: "2px solid #0f1525" }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "65%" }}>{chat.name}</span>
                    <span style={{ fontSize: 11, color: chat.unread > 0 ? "#60a5fa" : "rgba(255,255,255,0.35)", flexShrink: 0 }}>{chat.time}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "80%" }}>
                      {chat.saved && messages.length > 0 ? messages[messages.length - 1].content : chat.lastMsg}
                    </span>
                    {chat.unread > 0 && (
                      <span style={{ background: "#1a6fff", color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "2px 7px", flexShrink: 0 }}>{chat.unread}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom nav */}
          <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 4, flexShrink: 0 }}>
            {[
              { icon: <Edit size={16} />, active: true },
              { icon: <Users size={16} /> },
              { icon: <Hash size={16} /> },
              { icon: <Star size={16} /> },
              { icon: <Bell size={16} /> },
              { icon: <Settings size={16} /> },
            ].map((item, i) => (
              <div key={i} style={{ flex: 1, height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: item.active ? "rgba(26,111,255,0.2)" : "transparent", color: item.active ? "#60a5fa" : "rgba(255,255,255,0.35)" }}>
                {item.icon}
              </div>
            ))}
          </div>
        </div>

        {/* ── CHAT AREA ── */}
        <div className={`chat-area${!showChat ? " slide-out" : ""}`}
          style={{ display: "flex", flexDirection: "column" }}>

          {activeChat ? (
            <>
              {/* Chat header */}
              <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10, background: "#0f1525", flexShrink: 0 }}>
                <button className="icon-btn" onClick={backToList}><ArrowLeft size={17} /></button>
                <div style={{ position: "relative" }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: activeChat.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: activeChat.saved ? 16 : 12, fontWeight: 700, color: "#fff" }}>
                    {activeChat.ai ? <Zap size={16} /> : activeChat.avatar}
                  </div>
                  {activeChat.online && <div style={{ position: "absolute", bottom: 0, right: 0, width: 9, height: 9, background: "#22c55e", borderRadius: "50%", border: "2px solid #0f1525" }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#ffffff" }}>{activeChat.name}</div>
                  <div style={{ fontSize: 11, color: activeChat.saved ? "#60a5fa" : activeChat.online ? "#22c55e" : "rgba(255,255,255,0.4)" }}>
                    {activeChat.saved ? `${messages.length} message${messages.length !== 1 ? "s" : ""}` : activeChat.online ? "● Online" : "Last seen recently"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {!activeChat.saved && (
                    <>
                      <button className="icon-btn"><Phone size={15} /></button>
                      <button className="icon-btn"><Video size={15} /></button>
                    </>
                  )}
                  <button className="icon-btn"><MoreVertical size={15} /></button>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 6 }}>
                {/* Date divider */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0 10px" }}>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", padding: "2px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 999 }}>Today</span>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                </div>

                {/* Empty state */}
                {chatMessages.length === 0 && (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, paddingBottom: 60, paddingTop: 40 }}>
                    <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${activeChat.color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {activeChat.saved
                        ? <Star size={28} style={{ color: activeChat.color }} />
                        : <Edit size={28} style={{ color: activeChat.color }} />}
                    </div>
                    <div style={{ textAlign: "center", lineHeight: 1.7 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>
                        {activeChat.saved ? "Saved Messages" : activeChat.name}
                      </div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
                        {activeChat.saved
                          ? "Send yourself notes, links, or reminders.\nThey stay here forever."
                          : "Real user-to-user chat coming soon!\nFor now, use Saved Messages to test."}
                      </div>
                    </div>
                  </div>
                )}

                {/* Message bubbles */}
                {chatMessages.map((msg) => {
                  const isSent = msg.sender_id === user?.id;
                  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div key={msg.id} className="msg-in" style={{ display: "flex", justifyContent: isSent ? "flex-end" : "flex-start" }}>
                      <div style={{ maxWidth: "75%" }}>
                        <div style={{
                          padding: "10px 14px",
                          borderRadius: isSent ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                          background: isSent ? "linear-gradient(135deg, #1a6fff, #0d4fd9)" : "rgba(20,26,44,1)",
                          border: isSent ? "none" : "1px solid rgba(255,255,255,0.09)",
                          color: "#ffffff",
                          fontSize: 14,
                          lineHeight: 1.55,
                          wordBreak: "break-word",
                        }}>
                          {msg.content}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, justifyContent: isSent ? "flex-end" : "flex-start" }}>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{time}</span>
                          {isSent && <CheckCheck size={12} style={{ color: "#60a5fa" }} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input bar */}
              <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.07)", background: "#0f1525", flexShrink: 0 }}>
                {!activeChat.saved && (
                  <div style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>
                    💬 Use <strong style={{ color: "#60a5fa" }}>Saved Messages</strong> to send real messages
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "7px 10px" }}>
                  <Smile size={20} style={{ color: "rgba(255,255,255,0.4)", cursor: "pointer", flexShrink: 0 }} />
                  <input
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder={activeChat.saved ? "Write a note to yourself..." : "Coming soon — real user chat"}
                    disabled={!activeChat.saved}
                    style={{ flex: 1, background: "transparent", border: "none", color: "#ffffff", fontSize: 14, padding: "3px 0", minWidth: 0, opacity: activeChat.saved ? 1 : 0.4 }}
                  />
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                    <Paperclip size={18} style={{ color: "rgba(255,255,255,0.4)", cursor: "pointer" }} />
                    {message.trim() ? (
                      <div onClick={sendMessage} style={{ width: 36, height: 36, borderRadius: 11, background: sending ? "rgba(26,111,255,0.5)" : "linear-gradient(135deg, #1a6fff, #0d4fd9)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                        <Send size={16} style={{ color: "#fff" }} />
                      </div>
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: 11, background: "rgba(26,111,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                        <Mic size={16} style={{ color: "#60a5fa" }} />
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 6 }}>
                  <Shield size={11} style={{ color: "rgba(255,255,255,0.2)" }} />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>End-to-end encrypted</span>
                </div>
              </div>
            </>
          ) : (
            // Desktop welcome screen (no chat selected)
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
              <div style={{ width: 88, height: 88, borderRadius: 26, background: "linear-gradient(135deg, #1a6fff, #0d4fd9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, fontWeight: 800, color: "#fff" }}>J</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>Welcome, {profile?.full_name?.split(" ")[0] || "there"}!</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", lineHeight: 1.7 }}>
                  Select <strong style={{ color: "#60a5fa" }}>Saved Messages</strong> to start chatting.<br />
                  Real user-to-user chat coming in next update!
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </>
  );
}