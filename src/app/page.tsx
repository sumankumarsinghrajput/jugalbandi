"use client";
import { useState } from "react";
import {
  Search, Settings, Bell, Edit, Phone, Video,
  Smile, Paperclip, Mic, Send, MoreVertical,
  Users, Hash, Star, Archive, Moon, Zap,
  ChevronDown, Check, CheckCheck, Image, Shield
} from "lucide-react";

const chats = [
  { id: 1, name: "Priya Sharma", avatar: "PS", color: "#7c3aed", lastMsg: "Kal milte hain? ☕", time: "2m", unread: 3, online: true, pinned: true },
  { id: 2, name: "Rahul Dev Team", avatar: "RD", color: "#0d9488", lastMsg: "Build deploy ho gaya 🚀", time: "15m", unread: 12, online: false, group: true },
  { id: 3, name: "Arjun Mehta", avatar: "AM", color: "#dc2626", lastMsg: "Theek hai bhai, kal baat karte", time: "1h", unread: 0, online: true },
  { id: 4, name: "AI Assistant", avatar: "AI", color: "#1a6fff", lastMsg: "I can help you with that!", time: "2h", unread: 0, online: true, ai: true },
  { id: 5, name: "Sneha Kapoor", avatar: "SK", color: "#d97706", lastMsg: "Photo dekh, bhej rahi hun 📸", time: "3h", unread: 1, online: false },
  { id: 6, name: "Tech Jugalbandi", avatar: "TJ", color: "#059669", lastMsg: "New update: v2.0 released!", time: "5h", unread: 0, online: false, group: true },
  { id: 7, name: "Vikram Singh", avatar: "VS", color: "#7c3aed", lastMsg: "Haha okay! 😂", time: "Yesterday", unread: 0, online: false },
  { id: 8, name: "Anjali Gupta", avatar: "AG", color: "#be185d", lastMsg: "Thank you so much ❤️", time: "Yesterday", unread: 0, online: true },
];

const messages = [
  { id: 1, text: "Hey! Jugalbandi dekha? Bohot acha lag raha hai yaar 🔥", sent: false, time: "10:22 AM", read: true },
  { id: 2, text: "Haan bhai! Maine hi banaya hai 😄 Kaisa laga?", sent: true, time: "10:23 AM", read: true },
  { id: 3, text: "Seriously?! Yaar ye toh WhatsApp se bhi acha dikh raha hai! Blue theme too good hai", sent: false, time: "10:24 AM", read: true },
  { id: 4, text: "Thank you! Still working on it. AI features bhi add kar raha hun 🤖", sent: true, time: "10:25 AM", read: true },
  { id: 5, text: "Kal milte hain? Coffee pe baat karte hain ☕", sent: false, time: "10:28 AM", read: false },
];

export default function JugalbandiApp() {
  const [activeChat, setActiveChat] = useState(chats[0]);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filtered = chats.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0a0e1a", fontFamily: "'Plus Jakarta Sans', sans-serif", overflow: "hidden" }}>

      {/* Left Nav Icons */}
      <div style={{ width: 64, background: "#0a0e1a", borderRight: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 16, paddingBottom: 16, gap: 8, flexShrink: 0 }}>
        {/* Logo */}
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
          <div key={i} title={item.label} style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: item.active ? "rgba(26,111,255,0.2)" : "transparent", color: item.active ? "#60a5fa" : "rgba(255,255,255,0.35)", transition: "all 0.2s" }}>
            {item.icon}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        {[
          { icon: <Bell size={18} />, label: "Notifications" },
          { icon: <Settings size={18} />, label: "Settings" },
        ].map((item, i) => (
          <div key={i} title={item.label} style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.3)", transition: "all 0.2s" }}>
            {item.icon}
          </div>
        ))}
        {/* Avatar */}
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #1a6fff, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#fff", cursor: "pointer", marginTop: 4, boxShadow: "0 0 0 2px #1a6fff, 0 0 12px rgba(26,111,255,0.4)" }}>
          SK
        </div>
      </div>

      {/* Sidebar — Chat List */}
      <div style={{ width: 300, background: "#0f1525", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        {/* Header */}
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 18, fontWeight: 700, background: "linear-gradient(135deg, #60a5fa, #ffffff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Jugalbandi</span>
            <div style={{ display: "flex", gap: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.4)" }}><Edit size={15} /></div>
            </div>
          </div>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations..."
              style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 10px 8px 32px", color: "#fff", fontSize: 13 }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", padding: "8px 12px", gap: 4, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          {["all", "unread", "groups"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: "6px 4px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, background: activeTab === tab ? "rgba(26,111,255,0.2)" : "transparent", color: activeTab === tab ? "#60a5fa" : "rgba(255,255,255,0.4)", transition: "all 0.2s", textTransform: "capitalize" }}>
              {tab}
            </button>
          ))}
        </div>

        {/* Chat List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.map((chat, i) => (
            <div key={chat.id} onClick={() => setActiveChat(chat)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", background: activeChat.id === chat.id ? "rgba(26,111,255,0.1)" : "transparent", borderLeft: activeChat.id === chat.id ? "2px solid #1a6fff" : "2px solid transparent", transition: "all 0.15s", animation: `fadeSlideIn 0.3s ease ${i * 0.04}s both` }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: chat.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: "#fff" }}>
                  {chat.ai ? <Zap size={18} /> : chat.avatar}
                </div>
                {chat.online && <div style={{ position: "absolute", bottom: 1, right: 1, width: 10, height: 10, background: "#22c55e", borderRadius: "50%", border: "2px solid #0f1525" }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#f0f4ff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 140 }}>{chat.name}</span>
                  <span style={{ fontSize: 11, color: chat.unread > 0 ? "#60a5fa" : "rgba(255,255,255,0.3)", flexShrink: 0 }}>{chat.time}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 }}>{chat.lastMsg}</span>
                  {chat.unread > 0 && <span style={{ background: "#1a6fff", color: "#fff", fontSize: 11, fontWeight: 600, borderRadius: 999, padding: "1px 6px", minWidth: 18, textAlign: "center", flexShrink: 0 }}>{chat.unread}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#0a0e1a", minWidth: 0 }}>
        {/* Chat Header */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12, background: "rgba(15,21,37,0.8)", backdropFilter: "blur(20px)" }}>
          <div style={{ position: "relative" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: activeChat.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: "#fff" }}>
              {activeChat.ai ? <Zap size={16} /> : activeChat.avatar}
            </div>
            {activeChat.online && <div style={{ position: "absolute", bottom: 1, right: 1, width: 9, height: 9, background: "#22c55e", borderRadius: "50%", border: "2px solid #0a0e1a" }} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#f0f4ff" }}>{activeChat.name}</div>
            <div style={{ fontSize: 12, color: activeChat.online ? "#22c55e" : "rgba(255,255,255,0.3)" }}>{activeChat.online ? "Online" : "Last seen recently"}</div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {[<Phone size={17} />, <Video size={17} />, <Search size={17} />, <MoreVertical size={17} />].map((icon, i) => (
              <div key={i} style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.5)", background: "transparent", transition: "all 0.2s" }}>
                {icon}
              </div>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Date divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", padding: "3px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 999 }}>Today</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
          </div>

          {messages.map((msg, i) => (
            <div key={msg.id} style={{ display: "flex", justifyContent: msg.sent ? "flex-end" : "flex-start", animation: `fadeSlideIn 0.3s ease ${i * 0.05}s both` }}>
              <div style={{ maxWidth: "65%" }}>
                <div style={{ padding: "10px 14px", borderRadius: msg.sent ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: msg.sent ? "linear-gradient(135deg, #1a6fff, #0d4fd9)" : "rgba(20,25,40,0.9)", border: msg.sent ? "none" : "1px solid rgba(255,255,255,0.07)", color: "#f0f4ff", fontSize: 14, lineHeight: 1.5 }}>
                  {msg.text}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, justifyContent: msg.sent ? "flex-end" : "flex-start" }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{msg.time}</span>
                  {msg.sent && (msg.read ? <CheckCheck size={13} style={{ color: "#60a5fa" }} /> : <Check size={13} style={{ color: "rgba(255,255,255,0.3)" }} />)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(15,21,37,0.8)", backdropFilter: "blur(20px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14, padding: "6px 8px 6px 14px" }}>
            <Smile size={20} style={{ color: "rgba(255,255,255,0.4)", cursor: "pointer", flexShrink: 0 }} />
            <input
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && message.trim()) setMessage(""); }}
              placeholder="Type a message..."
              style={{ flex: 1, background: "transparent", border: "none", color: "#f0f4ff", fontSize: 14, padding: "6px 0" }}
            />
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <Paperclip size={18} style={{ color: "rgba(255,255,255,0.4)", cursor: "pointer" }} />
              <Image size={18} style={{ color: "rgba(255,255,255,0.4)", cursor: "pointer" }} />
              {message.trim() ? (
                <div onClick={() => setMessage("")} style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #1a6fff, #0d4fd9)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
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

      {/* Right Info Panel */}
      <div style={{ width: 260, background: "#0f1525", borderLeft: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", padding: "20px 16px", gap: 16, flexShrink: 0 }}>
        {/* Contact Info */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: activeChat.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#fff", boxShadow: `0 0 0 3px ${activeChat.color}40, 0 0 20px ${activeChat.color}30` }}>
            {activeChat.ai ? <Zap size={28} /> : activeChat.avatar}
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#f0f4ff" }}>{activeChat.name}</div>
            <div style={{ fontSize: 12, color: activeChat.online ? "#22c55e" : "rgba(255,255,255,0.3)", marginTop: 2 }}>{activeChat.online ? "● Online" : "Last seen recently"}</div>
          </div>
          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            {[{ icon: <Phone size={15} />, label: "Call" }, { icon: <Video size={15} />, label: "Video" }, { icon: <Bell size={15} />, label: "Mute" }].map((btn, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(26,111,255,0.15)", border: "1px solid rgba(26,111,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#60a5fa" }}>{btn.icon}</div>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{btn.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Shared Media */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Shared Media</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ aspectRatio: "1", borderRadius: 8, background: `rgba(${[124,58,237,13,148,136,220,38,38,217,119,6,26,111,255,5,150,105][i*3]},${[58,237,13,148,136,220,38,38,217,119,6,26,111,255,5,150,105,6][i*3]},${[237,13,148,136,220,38,38,217,119,6,26,111,255,5,150,105,6,26][i*3]},0.3)`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Image size={14} style={{ color: "rgba(255,255,255,0.4)" }} />
              </div>
            ))}
          </div>
        </div>

        {/* Privacy */}
        <div style={{ marginTop: "auto", padding: "10px 12px", borderRadius: 10, background: "rgba(26,111,255,0.08)", border: "1px solid rgba(26,111,255,0.15)", display: "flex", alignItems: "center", gap: 8 }}>
          <Shield size={14} style={{ color: "#60a5fa", flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.4 }}>End-to-end encrypted</span>
        </div>
      </div>
    </div>
  );
}