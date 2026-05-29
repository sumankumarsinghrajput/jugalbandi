"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search, Settings, Bell, Edit, Phone, Video,
  Smile, Paperclip, Mic, Send, MoreVertical,
  Users, Hash, Star, Zap,
  Check, CheckCheck, Shield, LogOut, ArrowLeft, UserPlus, X,
  FileText, Film, Music, Archive, Download, Image,
} from "lucide-react";

type Message = {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  is_read: boolean;
  is_delivered: boolean;
  file_url?: string;
  file_type?: string;
  file_name?: string;
  file_size?: number;
};

type Profile = {
  id: string;
  full_name: string;
  username: string;
  avatar_url?: string;
  last_seen?: string;
};

type Conversation = {
  id: string;
  name: string;
  username: string;
  avatar: string;
  color: string;
  lastMsg: string;
  time: string;
  unread: number;
  online: boolean;
  saved?: boolean;
  userId?: string;
};

const COLORS = ["#7c3aed","#0d9488","#dc2626","#d97706","#059669","#be185d","#1d4ed8","#b45309"];
const getColor = (str: string) => COLORS[str.charCodeAt(0) % COLORS.length];
const getInitials = (name: string) => name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";
const timeAgo = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 2) return "recently";
  if (m < 60) return `${m} minutes`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""}`;
  return `${Math.floor(h / 24)} day${Math.floor(h / 24) > 1 ? "s" : ""}`;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

const getFileIcon = (type: string) => {
  if (type.startsWith("image/")) return <Image size={20} />;
  if (type.startsWith("video/")) return <Film size={20} />;
  if (type.startsWith("audio/")) return <Music size={20} />;
  if (type.includes("pdf") || type.includes("document") || type.includes("text")) return <FileText size={20} />;
  return <Archive size={20} />;
};

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export default function JugalbandiApp() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [chatUserLastSeen, setChatUserLastSeen] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AUTH
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let lastSeenFn: (() => void) | null = null;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = "/auth"; return; }
      setUser(session.user);
      setLoading(false);

      supabase.from("profiles").select("*").eq("id", session.user.id).single()
        .then(({ data }) => { if (data) setProfile(data); });

      lastSeenFn = () => {
        supabase.from("profiles")
          .update({ last_seen: new Date().toISOString() })
          .eq("id", session.user.id)
          .then(() => {});
      };

      lastSeenFn();
      interval = setInterval(lastSeenFn, 30000);
      window.addEventListener("beforeunload", lastSeenFn);
    }).catch(() => { window.location.href = "/auth"; });

    return () => {
      clearInterval(interval);
      if (lastSeenFn) window.removeEventListener("beforeunload", lastSeenFn);
    };
  }, []);

  // Fetch messages and last seen when chat opens
  useEffect(() => {
    if (activeChat && user) {
      fetchMessages(user.id, activeChat.saved ? "saved" : activeChat.userId!);
      if (activeChat.userId) {
        supabase.from("profiles").select("last_seen").eq("id", activeChat.userId).single()
          .then(({ data }) => { if (data) setChatUserLastSeen(data.last_seen); });
      } else {
        setChatUserLastSeen(null);
      }
    }
  }, [activeChat]);

  async function fetchConversations(userId: string) {
    const { data } = await supabase
      .from("messages")
      .select("*, sender:profiles!messages_sender_id_fkey(id,full_name,username), receiver:profiles!messages_receiver_id_fkey(id,full_name,username)")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (!data) return;

    const undelivered = data.filter(m => m.receiver_id === userId && !m.is_delivered);
    for (const m of undelivered) {
      await supabase.from("messages").update({ is_delivered: true }).eq("id", m.id);
    }

    const seen = new Set<string>();
    const convs: Conversation[] = [];

    convs.push({
      id: "saved", name: "Saved Messages", username: "saved",
      avatar: "★", color: "#1a6fff", lastMsg: "Your personal notes",
      time: "", unread: 0, online: true, saved: true,
    });

    for (const msg of data) {
      const other = msg.sender_id === userId ? msg.receiver : msg.sender;
      if (!other || other.id === userId || seen.has(other.id)) continue;
      seen.add(other.id);
      const unread = data.filter(m =>
        m.sender_id === other.id && m.receiver_id === userId && !m.is_read
      ).length;
      convs.push({
        id: other.id, name: other.full_name, username: other.username,
        avatar: getInitials(other.full_name), color: getColor(other.id),
        lastMsg: msg.file_url ? `📎 ${msg.file_name || "File"}` : msg.content,
        time: timeAgo(msg.created_at),
        unread, online: false, userId: other.id,
      });
    }
    setConversations(convs);
  }

  async function fetchMessages(userId: string, otherId: string) {
    if (otherId === "saved") {
      const { data } = await supabase.from("messages").select("*")
        .eq("sender_id", userId).eq("receiver_id", userId)
        .order("created_at", { ascending: true }).limit(100);
      if (data) setMessages(data);
    } else {
      const { data } = await supabase.from("messages").select("*")
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId})`)
        .order("created_at", { ascending: true }).limit(100);
      if (data) {
        setMessages(data);
        const undelivered = data.filter(m => m.receiver_id === userId && !m.is_delivered);
        for (const m of undelivered) {
          await supabase.from("messages").update({ is_delivered: true }).eq("id", m.id);
        }
        const unread = data.filter(m => m.receiver_id === userId && !m.is_read);
        for (const m of unread) {
          await supabase.from("messages").update({ is_read: true }).eq("id", m.id);
        }
      }
    }
  }

  // Typing indicator
  useEffect(() => {
    if (!user) return;
    const typingChannel = supabase.channel("typing-room")
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload.user_id === user.id) return;
        if (payload.payload.chat_id !== activeChat?.userId && payload.payload.chat_id !== user.id) return;
        setTypingUsers(prev => new Set(prev).add(payload.payload.user_id));
        setTimeout(() => {
          setTypingUsers(prev => {
            const next = new Set(prev);
            next.delete(payload.payload.user_id);
            return next;
          });
        }, 3000);
      })
      .subscribe();
    return () => { supabase.removeChannel(typingChannel); };
  }, [user, activeChat]);

  // Presence
  useEffect(() => {
    if (!user) return;
    const presenceChannel = supabase.channel("presence-room")
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState<{ user_id: string }>();
        const online = new Set<string>();
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => online.add(p.user_id));
        });
        setOnlineUsers(online);
        online.forEach(async (onlineUserId) => {
          if (onlineUserId === user.id) return;
          await supabase.from("messages")
            .update({ is_delivered: true })
            .eq("sender_id", user.id)
            .eq("receiver_id", onlineUserId)
            .eq("is_delivered", false);
          setMessages(prev => prev.map(m =>
            m.sender_id === user.id && m.receiver_id === onlineUserId
              ? { ...m, is_delivered: true } : m
          ));
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ user_id: user.id });
        }
      });
    return () => { supabase.removeChannel(presenceChannel); };
  }, [user]);

  // Realtime messages
  useEffect(() => {
    if (!user) return;
    fetchConversations(user.id);
    const channel = supabase.channel("realtime-" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const newMsg = payload.new as Message;
        if (newMsg.sender_id !== user.id && newMsg.receiver_id !== user.id) return;
        setActiveChat(current => {
          if (!current) return current;
          const inThisChat =
            (current.saved && newMsg.sender_id === user.id && newMsg.receiver_id === user.id) ||
            (!current.saved && (
              (newMsg.sender_id === user.id && newMsg.receiver_id === current.userId) ||
              (newMsg.sender_id === current.userId && newMsg.receiver_id === user.id)
            ));
          if (inThisChat) {
            setMessages(prev => {
              const optimisticIndex = prev.findIndex(
                m => m.id.startsWith("optimistic-") && m.content === newMsg.content && m.sender_id === newMsg.sender_id
              );
              if (optimisticIndex !== -1) {
                const updated = [...prev];
                updated[optimisticIndex] = newMsg;
                return updated;
              }
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
          return current;
        });
        fetchConversations(user.id);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
        const updated = payload.new as Message;
        if (updated.sender_id !== user.id && updated.receiver_id !== user.id) return;
        setMessages(prev =>
          prev.map(m => m.id === updated.id ? { ...m, is_read: updated.is_read, is_delivered: updated.is_delivered } : m)
        );
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!userSearch.trim() || !user) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase.from("profiles").select("*")
        .neq("id", user.id)
        .or(`username.ilike.%${userSearch}%,full_name.ilike.%${userSearch}%`)
        .limit(8);
      setSearchResults(data || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch, user]);

  // Upload file to Cloudinary
  async function uploadFile(file: File) {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      alert("Cloudinary not configured.");
      return null;
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
        { method: "POST", body: formData }
      );
      const data = await response.json();
      setUploading(false);
      return {
        url: data.secure_url,
        type: file.type,
        name: file.name,
        size: file.size,
      };
    } catch {
      setUploading(false);
      alert("Upload failed. Try again.");
      return null;
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user || !activeChat) return;
    if (file.size > 50 * 1024 * 1024) {
      alert("File too large. Maximum size is 50MB.");
      return;
    }

    const uploaded = await uploadFile(file);
    if (!uploaded) return;

    const receiverId = activeChat.saved ? user.id : activeChat.userId!;
    const optimisticMsg: Message = {
      id: "optimistic-" + Date.now(),
      content: "",
      sender_id: user.id,
      receiver_id: receiverId,
      created_at: new Date().toISOString(),
      is_read: false,
      is_delivered: false,
      file_url: uploaded.url,
      file_type: uploaded.type,
      file_name: uploaded.name,
      file_size: uploaded.size,
    };
    setMessages(prev => [...prev, optimisticMsg]);

    const { data, error } = await supabase.from("messages")
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        content: "",
        file_url: uploaded.url,
        file_type: uploaded.type,
        file_name: uploaded.name,
        file_size: uploaded.size,
      })
      .select().single();

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    } else if (data) {
      setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data : m));
      fetchConversations(user.id);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function sendMessage() {
    if (!message.trim() || !user || sending || !activeChat) return;
    setSending(true);
    const content = message.trim();
    setMessage("");
    const receiverId = activeChat.saved ? user.id : activeChat.userId!;
    const optimisticMsg: Message = {
      id: "optimistic-" + Date.now(), content,
      sender_id: user.id, receiver_id: receiverId,
      created_at: new Date().toISOString(),
      is_read: false, is_delivered: false,
    };
    setMessages(prev => [...prev, optimisticMsg]);
    const { data, error } = await supabase.from("messages")
      .insert({ sender_id: user.id, receiver_id: receiverId, content })
      .select().single();
    if (error) {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    } else if (data) {
      setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data : m));
      fetchConversations(user.id);
    }
    setSending(false);
  }

  function renderFileMessage(msg: Message) {
    const isImage = msg.file_type?.startsWith("image/");
    const isVideo = msg.file_type?.startsWith("video/");
    const isAudio = msg.file_type?.startsWith("audio/");

    if (isImage) {
      return (
        <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
          <img
            src={msg.file_url}
            alt={msg.file_name}
            style={{ maxWidth: "100%", maxHeight: 260, borderRadius: 10, display: "block", cursor: "pointer" }}
          />
        </a>
      );
    }

    if (isVideo) {
      return (
        <video controls style={{ maxWidth: "100%", maxHeight: 260, borderRadius: 10, display: "block" }}>
          <source src={msg.file_url} type={msg.file_type} />
        </video>
      );
    }

    if (isAudio) {
      return (
        <audio controls style={{ width: "100%", marginTop: 4 }}>
          <source src={msg.file_url} type={msg.file_type} />
        </audio>
      );
    }

    return (
      <a href={msg.file_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "rgba(255,255,255,0.08)", borderRadius: 10, cursor: "pointer" }}>
          <div style={{ color: "#60a5fa", flexShrink: 0 }}>{getFileIcon(msg.file_type || "")}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>{msg.file_name}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{formatFileSize(msg.file_size || 0)}</div>
          </div>
          <Download size={16} style={{ color: "#60a5fa", flexShrink: 0 }} />
        </div>
      </a>
    );
  }

  function openUserChat(p: Profile) {
    const conv: Conversation = {
      id: p.id, name: p.full_name, username: p.username,
      avatar: getInitials(p.full_name), color: getColor(p.id),
      lastMsg: "", time: "", unread: 0, online: false, userId: p.id,
    };
    setActiveChat(conv);
    setShowChat(true);
    setShowSearch(false);
    setUserSearch("");
    setSearchResults([]);
    if (!conversations.find(c => c.id === p.id)) {
      setConversations(prev => {
        const filtered = prev.filter(c => c.id !== p.id);
        const saved = filtered.find(c => c.saved);
        const rest = filtered.filter(c => !c.saved);
        return saved ? [saved, conv, ...rest] : [conv, ...rest];
      });
    }
  }

  async function handleLogout() {
    if (user) {
      await supabase.from("profiles")
        .update({ last_seen: new Date().toISOString() })
        .eq("id", user.id);
    }
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  function openChat(chat: Conversation) {
    setActiveChat(chat);
    setShowChat(true);
    setMessages([]);
    setConversations(prev => prev.map(c => c.id === chat.id ? { ...c, unread: 0 } : c));
  }

  function backToList() {
    setShowChat(false);
    setActiveChat(null);
    setMessages([]);
  }

  const myInitials = profile?.full_name ? getInitials(profile.full_name) : "U";
  const filteredConvs = conversations.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.username.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div style={{ height: "100vh", background: "#0a0e1a", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <img src="/icon-512.png" alt="Jugalbandi" style={{ width: 64, height: 64, borderRadius: 20 }} />
      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 15 }}>Loading Jugalbandi...</div>
    </div>
  );

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; }
        .app { display: flex; height: 100vh; height: 100dvh; background: #0a0e1a; font-family: 'Plus Jakarta Sans', sans-serif; overflow: hidden; position: relative; }
        .sidebar { width: 320px; min-width: 320px; background: #0f1525; border-right: 1px solid rgba(255,255,255,0.07); display: flex; flex-direction: column; height: 100%; flex-shrink: 0; }
        .chat-area { flex: 1; display: flex; flex-direction: column; min-width: 0; background: #0a0e1a; height: 100%; }
        .icon-btn { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.55); flex-shrink: 0; border: none; transition: background 0.15s; }
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
        .search-overlay { position: absolute; inset: 0; z-index: 50; background: #0f1525; display: flex; flex-direction: column; }
        @media (max-width: 768px) {
          .sidebar { width: 100%; min-width: unset; position: absolute; inset: 0; z-index: 10; transition: transform 0.25s ease; }
          .sidebar.slide-out { transform: translateX(-100%); }
          .chat-area { position: absolute; inset: 0; z-index: 9; transition: transform 0.25s ease; transform: translateX(100%); }
          .chat-area:not(.slide-out) { transform: translateX(0); z-index: 11; }
          .chat-area.slide-out { transform: translateX(100%); }
        }
      `}</style>

      <div className="app">
        {/* SIDEBAR */}
        <div className={`sidebar${showChat ? " slide-out" : ""}`} style={{ position: "relative" }}>
          {showSearch && (
            <div className="search-overlay">
              <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10 }}>
                <button className="icon-btn" onClick={() => { setShowSearch(false); setUserSearch(""); setSearchResults([]); }}>
                  <ArrowLeft size={17} />
                </button>
                <input autoFocus value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search by name or username..."
                  style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "9px 12px", color: "#fff", fontSize: 14 }} />
                {userSearch && <button className="icon-btn" onClick={() => setUserSearch("")}><X size={15} /></button>}
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
                {searching && <div style={{ padding: "20px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Searching...</div>}
                {!searching && userSearch && searchResults.length === 0 && (
                  <div style={{ padding: "20px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>No users found for "{userSearch}"</div>
                )}
                {searchResults.map(p => (
                  <div key={p.id} onClick={() => openUserChat(p)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: getColor(p.id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                      {getInitials(p.full_name)}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{p.full_name}</div>
                      <div style={{ fontSize: 12, color: "#60a5fa" }}>@{p.username}</div>
                    </div>
                    <div style={{ marginLeft: "auto", padding: "5px 12px", borderRadius: 8, background: "rgba(26,111,255,0.2)", color: "#60a5fa", fontSize: 12, fontWeight: 600 }}>Chat</div>
                  </div>
                ))}
                {!userSearch && (
                  <div style={{ padding: "24px 20px", textAlign: "center" }}>
                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(26,111,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                      <Users size={24} style={{ color: "#60a5fa" }} />
                    </div>
                    <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>Search for any Jugalbandi user<br />by their name or @username</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <img src="/icon-192.png" alt="Jugalbandi" style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, objectFit: "cover" }} />
                <span style={{ fontSize: 19, fontWeight: 700, color: "#ffffff" }}>Jugalbandi</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="icon-btn" title="New chat" onClick={() => setShowSearch(true)}><UserPlus size={15} /></button>
                <button className="icon-btn" onClick={handleLogout} style={{ color: "rgba(255,100,100,0.8)" }}><LogOut size={15} /></button>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "8px 12px", background: "rgba(26,111,255,0.09)", borderRadius: 10, border: "1px solid rgba(26,111,255,0.18)" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #1a6fff, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{myInitials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile?.full_name || "User"}</div>
                <div style={{ fontSize: 11, color: "#60a5fa" }}>@{profile?.username || "—"}</div>
              </div>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
            </div>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.35)", pointerEvents: "none" }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations..."
                style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 10, padding: "9px 10px 9px 34px", color: "#ffffff", fontSize: 13 }} />
            </div>
          </div>

          <div style={{ display: "flex", padding: "8px 12px", gap: 6, borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
            {["all", "unread", "groups"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: "7px 4px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: activeTab === tab ? "rgba(26,111,255,0.22)" : "rgba(255,255,255,0.04)", color: activeTab === tab ? "#60a5fa" : "rgba(255,255,255,0.45)", textTransform: "capitalize", transition: "all 0.2s" }}>
                {tab}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {filteredConvs.length === 0 && (
              <div style={{ padding: "32px 20px", textAlign: "center" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(26,111,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                  <UserPlus size={22} style={{ color: "#60a5fa" }} />
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.7 }}>
                  No conversations yet.<br />
                  <span onClick={() => setShowSearch(true)} style={{ color: "#60a5fa", cursor: "pointer" }}>Find someone to chat with →</span>
                </div>
              </div>
            )}
            {filteredConvs.map(chat => (
              <div key={chat.id} className={`chat-item${activeChat?.id === chat.id ? " active" : ""}`} onClick={() => openChat(chat)}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{ width: 46, height: 46, borderRadius: "50%", background: chat.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: chat.saved ? 18 : 13, fontWeight: 700, color: "#fff" }}>
                    {chat.avatar}
                  </div>
                  {onlineUsers.has(chat.userId || "") && (
                    <div style={{ position: "absolute", bottom: 1, right: 1, width: 11, height: 11, background: "#22c55e", borderRadius: "50%", border: "2px solid #0f1525" }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "65%" }}>{chat.name}</span>
                    <span style={{ fontSize: 11, color: chat.unread > 0 ? "#60a5fa" : "rgba(255,255,255,0.35)", flexShrink: 0 }}>{chat.time}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "80%" }}>{chat.lastMsg}</span>
                    {chat.unread > 0 && <span style={{ background: "#1a6fff", color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "2px 7px", flexShrink: 0 }}>{chat.unread}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 4, flexShrink: 0 }}>
            {[
              { icon: <Edit size={16} />, active: true },
              { icon: <Users size={16} /> },
              { icon: <Zap size={16} />, link: "/ai" },
              { icon: <Star size={16} /> },
              { icon: <Bell size={16} /> },
              { icon: <Settings size={16} /> },
            ].map((item, i) => (
              <div key={i} onClick={() => { if ((item as any).link) window.location.href = (item as any).link; }}
                style={{ flex: 1, height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: item.active ? "rgba(26,111,255,0.2)" : "transparent", color: item.active ? "#60a5fa" : "rgba(255,255,255,0.35)" }}>
                {item.icon}
              </div>
            ))}
          </div>
        </div>

        {/* CHAT AREA */}
        <div className={`chat-area${!showChat ? " slide-out" : ""}`} style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          {activeChat ? (
            <>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10, background: "#0f1525", flexShrink: 0 }}>
                <button className="icon-btn" onClick={backToList}><ArrowLeft size={17} /></button>
                <div style={{ position: "relative" }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: activeChat.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: activeChat.saved ? 16 : 13, fontWeight: 700, color: "#fff" }}>
                    {activeChat.avatar}
                  </div>
                  {onlineUsers.has(activeChat.userId || "") && (
                    <div style={{ position: "absolute", bottom: 0, right: 0, width: 9, height: 9, background: "#22c55e", borderRadius: "50%", border: "2px solid #0f1525" }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#ffffff" }}>{activeChat.name}</div>
                  <div style={{ fontSize: 11, color: activeChat.saved ? "#60a5fa" : typingUsers.has(activeChat.userId || "") ? "#22c55e" : onlineUsers.has(activeChat.userId || "") ? "#22c55e" : "rgba(255,255,255,0.4)" }}>
                    {activeChat.saved ? "Your personal space"
                      : typingUsers.has(activeChat.userId || "") ? "typing..."
                      : onlineUsers.has(activeChat.userId || "") ? "● Online"
                      : chatUserLastSeen
                      ? timeAgo(chatUserLastSeen) === "recently" ? "Last seen recently" : `Last seen ${timeAgo(chatUserLastSeen)} ago`
                      : `@${activeChat.username}`}
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

              {/* Upload progress */}
              {uploading && (
                <div style={{ padding: "8px 16px", background: "rgba(26,111,255,0.1)", borderBottom: "1px solid rgba(26,111,255,0.2)", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: "#1a6fff", borderRadius: 999, width: "60%", animation: "shimmer 1s infinite" }} />
                  </div>
                  <span style={{ fontSize: 12, color: "#60a5fa" }}>Uploading...</span>
                </div>
              )}

              <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0 10px" }}>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", padding: "2px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 999 }}>Today</span>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                </div>

                {messages.length === 0 && (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, paddingBottom: 60, paddingTop: 40 }}>
                    <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${activeChat.color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 28 }}>{activeChat.saved ? "★" : "💬"}</span>
                    </div>
                    <div style={{ textAlign: "center", lineHeight: 1.7 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>{activeChat.name}</div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
                        {activeChat.saved ? "Send yourself notes, files, or reminders." : `Start a conversation with ${activeChat.name}`}
                      </div>
                    </div>
                  </div>
                )}

                {messages.map((msg) => {
                  const isSent = msg.sender_id === user?.id;
                  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div key={msg.id} className="msg-in" style={{ display: "flex", justifyContent: isSent ? "flex-end" : "flex-start" }}>
                      <div style={{ maxWidth: "75%" }}>
                        <div style={{ padding: msg.file_url ? "6px 6px" : "10px 14px", borderRadius: isSent ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: isSent ? "linear-gradient(135deg, #1a6fff, #0d4fd9)" : "rgba(20,26,44,1)", border: isSent ? "none" : "1px solid rgba(255,255,255,0.09)", color: "#ffffff", fontSize: 14, lineHeight: 1.55, wordBreak: "break-word" }}>
                          {msg.file_url ? renderFileMessage(msg) : msg.content}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, justifyContent: isSent ? "flex-end" : "flex-start" }}>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{time}</span>
                          {isSent && (
                            msg.is_read
                              ? <CheckCheck size={12} style={{ color: "#60a5fa" }} />
                              : (msg.is_delivered || onlineUsers.has(activeChat?.userId || ""))
                              ? <CheckCheck size={12} style={{ color: "rgba(255,255,255,0.4)" }} />
                              : <Check size={12} style={{ color: "rgba(255,255,255,0.4)" }} />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.07)", background: "#0f1525", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "7px 10px" }}>
                  <Smile size={20} style={{ color: "rgba(255,255,255,0.4)", cursor: "pointer", flexShrink: 0 }} />
                  <input ref={inputRef} value={message} onChange={e => {
                      setMessage(e.target.value);
                      if (!user || !activeChat?.userId) return;
                      supabase.channel("typing-room").send({
                        type: "broadcast", event: "typing",
                        payload: { user_id: user.id, chat_id: activeChat.userId },
                      });
                    }}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder={activeChat.saved ? "Write a note to yourself..." : `Message ${activeChat.name}...`}
                    style={{ flex: 1, background: "transparent", border: "none", color: "#ffffff", fontSize: 14, padding: "3px 0", minWidth: 0 }} />
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="*/*"
                      onChange={handleFileSelect}
                      style={{ display: "none" }}
                    />
                    <Paperclip
                      size={18}
                      style={{ color: uploading ? "#60a5fa" : "rgba(255,255,255,0.4)", cursor: "pointer" }}
                      onClick={() => fileInputRef.current?.click()}
                    />
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
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>End-to-end encrypted · Max 50MB</span>
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
              <img src="/icon-512.png" alt="Jugalbandi" style={{ width: 88, height: 88, borderRadius: 26 }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>Welcome, {profile?.full_name?.split(" ")[0] || "there"}!</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", lineHeight: 1.7, marginBottom: 20 }}>Select a conversation or start a new one.</div>
                <button onClick={() => setShowSearch(true)} style={{ padding: "11px 24px", background: "linear-gradient(135deg, #1a6fff, #0d4fd9)", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <UserPlus size={16} /> Find someone to chat
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}