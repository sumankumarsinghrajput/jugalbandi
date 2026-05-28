"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search, Settings, Bell, Edit, Phone, Video,
  Smile, Paperclip, Mic, Send, MoreVertical,
  Users, Hash, Star, Archive, Zap,
  Check, CheckCheck, Image, Shield, LogOut
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

const DEMO_CHATS = [
  { id: "demo-1", name: "Priya Sharma", avatar: "PS", color: "#7c3aed", lastMsg: "Kal milte hain? ☕", time: "2m", unread: 3, online: true },
  { id: "demo-2", name: "Rahul Dev Team", avatar: "RD", color: "#0d9488", lastMsg: "Build deploy ho gaya 🚀", time: "15m", unread: 12, online: false },
  { id: "demo-3", name: "Arjun Mehta", avatar: "AM", color: "#dc2626", lastMsg: "Theek hai bhai", time: "1h", unread: 0, online: true },
  { id: "demo-4", name: "AI Assistant", avatar: "AI", color: "#1a6fff", lastMsg: "I can help you!", time: "2h", unread: 0, online: true, ai: true },
  { id: "demo-5", name: "Sneha Kapoor", avatar: "SK", color: "#d97706", lastMsg: "Photo bhej rahi hun 📸", time: "3h", unread: 1, online: false },
];

export default function JugalbandiApp() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [activeChat, setActiveChat] = useState(DEMO_CHATS[0]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router_push = (path: string) => { window.location.href = path; };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router_push("/auth"); return; }
      setUser(session.user);
      fetchProfile(session.user.id);
      setLoading(false);
    });
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) setProfile(data);
  }

  async function fetchMessages() {
    if (!user) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: true })
      .limit(50);
    if (data) setMessages(data);
  }

  useEffect(() => {
    if (!user) return;
    fetchMessages();
    const channel = supabase
      .channel("messages-channel")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!message.trim() || !user || sending) return;
    setSending(true);
    const newMsg = {
      sender_id: user.id,
      receiver_id: user.id,
      content: message.trim(),
    };
    const { error } = await supabase.from("messages").insert(newMsg);
    if (!error) setMessage("");
    setSending(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router_push("/auth");
  }

  const initials = profile?.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "U";
  const filtered = DEMO_CHATS.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return (
    <div style={{ height: "100vh", background: "#0a0e1a", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #1a6fff, #0d4fd9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#fff" }}>J</div>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Loading Jugalbandi...</div>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0a0e1a", fontFamily: "'Plus Jakarta Sans', sans-serif", overflow: "hidden" }}>

      {/* Left Nav */}
      <div style={{ width: 64, background: "#0a0e1a", borderRight: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 16, paddingBottom: 16, gap: 8, flexShrink: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #1a6fff, #0d4fd9)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, cursor: "pointer" }}>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>J</span>
        </div>
        {[
          { icon: <Edit size={18} />, active: true, label: "Chats" },
          { icon: <Users size={18} />, active: false, label: "Groups" },
          { icon: <Hash size={18} />, active: false, label: "Channels" },
          { icon: <Star size={18} />, active: false, label: "Starred" },
          { icon: <Archive size={18} />, active: false, label: "Archive" },
        ].map((item, i) => (
          <div key={i} title={item.label} style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: item.active ? "rgba(26,111,255,0.2)" : "transparent", color: item.active ? "#60a5fa" : "rgba(255,255,255,0.35)" }}>
            {item.icon}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div title="Notifications" style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.3)" }}><Bell size={18} /></div>
        <div title="Settings" style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.3)" }}><Settings size={18} /></div>
        <div title="Logout" onClick={handleLogout} style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,100,100,0.6)" }}><LogOut size={18} /></div>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #1a6fff, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#fff", cursor: "pointer", marginTop: 4, boxShadow: "0 0 0 2px #1a6fff" }}>
          {initials}
        </div>
      </div>

      {/* Sidebar */}
      <div style={{ width: 300, background: "#0f1525", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 18, fontWeight: 700, background: "linear-gradient(135deg, #60a5fa, #ffffff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Jugalbandi</span>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Hi, {profile?.full_name?.split(" ")[0] || "User"}</div>
          </div>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations..." style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 10px 8px 32px", color: "#fff", fontSize: 13 }} />
          </div>
        </div>

        <div style={{ display: "flex", padding: "8px 12px", gap: 4, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          {["all", "unread", "groups"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: "6px 4px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, background: activeTab === tab ? "rgba(26,111,255,0.2)" : "transparent", color: activeTab === tab ? "#60a5fa" : "rgba(255,255,255,0.4)", textTransform: "capitalize" }}>
              {tab}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.map((chat) => (
            <div key={chat.id} onClick={() => setActiveChat(chat)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", background: activeChat.id === chat.id ? "rgba(26,111,255,0.1)" : "transparent", borderLeft: activeChat.id === chat.id ? "2px solid #1a6fff" : "2px solid transparent", transition: "all 0.15s" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: chat.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: "#fff" }}>
                  {(chat as any).ai ? <Zap size={18} /> : chat.avatar}
                </div>
                {chat.online && <div style={{ position: "absolute", bottom: 1, right: 1, width: 10, height: 10, background: "#22c55e", borderRadius: "50%", border: "2px solid #0f1525" }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#f0f4ff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 140 }}>{chat.name}</span>
                  <span style={{ fontSize: 11, color: chat.unread > 0 ? "#60a5fa" : "rgba(255,255,255,0.3)" }}>{chat.time}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 }}>{chat.lastMsg}</span>
                  {chat.unread > 0 && <span style={{ background: "#1a6fff", color: "#fff", fontSize: 11, fontWeight: 600, borderRadius: 999, padding: "1px 6px" }}>{chat.unread}</span>}
                </div>
              </div>
            </div>
          ))}

          {/* My Messages section */}
          <div style={{ padding: "12px 14px 4px", fontSize: 11, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.06em" }}>My Messages</div>
          {messages.slice(-5).map((msg) => (
            <div key={msg.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", cursor: "pointer", background: "transparent" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #1a6fff, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#fff", flexShrink: 0 }}>{initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{msg.content}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#0a0e1a", minWidth: 0 }}>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12, background: "rgba(15,21,37,0.8)", backdropFilter: "blur(20px)" }}>
          <div style={{ position: "relative" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: activeChat.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: "#fff" }}>
              {(activeChat as any).ai ? <Zap size={16} /> : activeChat.avatar}
            </div>
            {activeChat.online && <div style={{ position: "absolute", bottom: 1, right: 1, width: 9, height: 9, background: "#22c55e", borderRadius: "50%", border: "2px solid #0a0e1a" }} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#f0f4ff" }}>{activeChat.name}</div>
            <div style={{ fontSize: 12, color: activeChat.online ? "#22c55e" : "rgba(255,255,255,0.3)" }}>{activeChat.online ? "Online" : "Last seen recently"}</div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {([<Phone size={17} />, <Video size={17} />, <Search size={17} />, <MoreVertical size={17} />] as any[]).map((icon, i) => (
              <div key={i} style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.5)" }}>{icon}</div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", padding: "3px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 999 }}>Today</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
          </div>

          {messages.length === 0 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, opacity: 0.4 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(26,111,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Edit size={24} style={{ color: "#60a5fa" }} />
              </div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, textAlign: "center" }}>No messages yet.<br />Send your first message below!</div>
            </div>
          )}

          {messages.map((msg) => {
            const isSent = msg.sender_id === user?.id;
            const time = new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            return (
              <div key={msg.id} style={{ display: "flex", justifyContent: isSent ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "65%" }}>
                  <div style={{ padding: "10px 14px", borderRadius: isSent ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: isSent ? "linear-gradient(135deg, #1a6fff, #0d4fd9)" : "rgba(20,25,40,0.9)", border: isSent ? "none" : "1px solid rgba(255,255,255,0.07)", color: "#f0f4ff", fontSize: 14, lineHeight: 1.5, wordBreak: "break-word" }}>
                    {msg.content}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, justifyContent: isSent ? "flex-end" : "flex-start" }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{time}</span>
                    {isSent && <CheckCheck size={13} style={{ color: "#60a5fa" }} />}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(15,21,37,0.8)", backdropFilter: "blur(20px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14, padding: "6px 8px 6px 14px" }}>
            <Smile size={20} style={{ color: "rgba(255,255,255,0.4)", cursor: "pointer", flexShrink: 0 }} />
            <input
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Type a message..."
              style={{ flex: 1, background: "transparent", border: "none", color: "#f0f4ff", fontSize: 14, padding: "6px 0" }}
            />
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <Paperclip size={18} style={{ color: "rgba(255,255,255,0.4)", cursor: "pointer" }} />
              <Image size={18} style={{ color: "rgba(255,255,255,0.4)", cursor: "pointer" }} />
              {message.trim() ? (
                <div onClick={sendMessage} style={{ width: 36, height: 36, borderRadius: 10, background: sending ? "rgba(26,111,255,0.5)" : "linear-gradient(135deg, #1a6fff, #0d4fd9)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Send size={16} style={{ color: "#fff" }} />
                </div>
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(26,111,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Mic size={16} style={{ color: "#60a5fa" }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div style={{ width: 260, background: "#0f1525", borderLeft: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", padding: "20px 16px", gap: 16, flexShrink: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: activeChat.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#fff", boxShadow: `0 0 0 3px ${activeChat.color}40` }}>
            {(activeChat as any).ai ? <Zap size={28} /> : activeChat.avatar}
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#f0f4ff" }}>{activeChat.name}</div>
            <div style={{ fontSize: 12, color: activeChat.online ? "#22c55e" : "rgba(255,255,255,0.3)", marginTop: 2 }}>{activeChat.online ? "● Online" : "Last seen recently"}</div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            {[{ icon: <Phone size={15} />, label: "Call" }, { icon: <Video size={15} />, label: "Video" }, { icon: <Bell size={15} />, label: "Mute" }].map((btn, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(26,111,255,0.15)", border: "1px solid rgba(26,111,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#60a5fa" }}>{btn.icon}</div>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{btn.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Your Profile</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.8 }}>
            <div>Name: <span style={{ color: "#f0f4ff" }}>{profile?.full_name || "—"}</span></div>
            <div>Username: <span style={{ color: "#60a5fa" }}>@{profile?.username || "—"}</span></div>
            <div>Messages: <span style={{ color: "#f0f4ff" }}>{messages.length}</span></div>
          </div>
        </div>

        <div style={{ marginTop: "auto", padding: "10px 12px", borderRadius: 10, background: "rgba(26,111,255,0.08)", border: "1px solid rgba(26,111,255,0.15)", display: "flex", alignItems: "center", gap: 8 }}>
          <Shield size={14} style={{ color: "#60a5fa", flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.4 }}>End-to-end encrypted</span>
        </div>
      </div>
    </div>
  );
}