"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search, Edit, Phone, Video,
  Smile, Paperclip, Mic, Send, MoreVertical,
  Users, Star, Zap,
  Check, CheckCheck, Shield, LogOut, ArrowLeft, UserPlus, X,
  FileText, Film, Music, Archive, Download, Image, Info,
  MessageCircle, CornerUpLeft, Ban, ChevronUp, ChevronDown,
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
  reactions?: Record<string, string[]>;
  reply_to_id?: string;
  reply_to_content?: string;
  reply_to_sender?: string;
};

type Profile = {
  id: string;
  full_name: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  last_seen?: string;
};

type Conversation = {
  id: string;
  name: string;
  username: string;
  avatar: string;
  avatar_url?: string;
  color: string;
  lastMsg: string;
  time: string;
  unread: number;
  online: boolean;
  saved?: boolean;
  userId?: string;
};

type ViewProfile = {
  id: string;
  name: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  last_seen?: string;
  online?: boolean;
  color: string;
};

type AvatarPopup = {
  userId: string;
  name: string;
  username: string;
  avatar_url?: string;
  color: string;
  x: number;
  y: number;
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
const lastSeenText = (date: string | undefined) => {
  if (!date) return "";
  const t = timeAgo(date);
  return t === "recently" ? "Last seen recently" : `Last seen ${t} ago`;
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

const REACTION_EMOJIS = ["❤️","👍","😂","😮","😢","🔥","👏","🙏"];
const EMOJI_GRID = [
  "😀","😂","🤣","😊","😍","🥰","😎","🤩","😜","🤔",
  "😮","😢","😭","😡","🤯","🥳","😴","🤗","😬","🙄",
  "❤️","🧡","💛","💚","💙","💜","💔","💕","🖤","🤍",
  "👍","👎","👏","🙌","🤝","💪","👌","✌️","🫡","🙏",
  "🔥","✨","🎉","💯","⭐","🌟","💫","🎈","🎁","🎊",
  "😋","🥺","😇","🤭","😌","🥹","🫠","😏","😑","🤐",
  "🐶","🐱","🐭","🐸","🦁","🐧","🦋","🌸","🌈","☀️",
  "🍕","🍔","🍜","🍣","🍦","☕","🧋","🍺","🥂","🍾",
];

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

function Avatar({ url, initials, color, size }: { url?: string; initials: string; color: string; size: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.28, fontWeight: 700, color: "#fff", overflow: "hidden", flexShrink: 0 }}>
      {url ? <img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
    </div>
  );
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} style={{ background: "rgba(255,210,0,0.45)", color: "#fff", borderRadius: 2, padding: "0 1px" }}>{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

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
  const [showChat, setShowChat] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [chatUserLastSeen, setChatUserLastSeen] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [profilePanel, setProfilePanel] = useState<ViewProfile | null>(null);
  const [avatarPopup, setAvatarPopup] = useState<AvatarPopup | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [swipingMsgId, setSwipingMsgId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [mobileLongPressReaction, setMobileLongPressReaction] = useState<string | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [searchMatches, setSearchMatches] = useState<string[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [sharedMedia, setSharedMedia] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatSearchRef = useRef<HTMLInputElement>(null);
  const activeChatRef = useRef<Conversation | null>(null);
  const isInitialLoad = useRef(true);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchMsgRef = useRef<Message | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement>>({});

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
      lastSeenFn = () => { supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", session.user.id).then(() => {}); };
      lastSeenFn();
      interval = setInterval(lastSeenFn, 30000);
      window.addEventListener("beforeunload", lastSeenFn);
      supabase.from("blocked_users").select("blocked_id").eq("blocker_id", session.user.id)
        .then(({ data }) => { if (data) setBlockedUsers(new Set(data.map((b: any) => b.blocked_id))); });
    }).catch(() => { window.location.href = "/auth"; });
    return () => { clearInterval(interval); if (lastSeenFn) window.removeEventListener("beforeunload", lastSeenFn); };
  }, []);

  useEffect(() => { activeChatRef.current = activeChat; isInitialLoad.current = true; }, [activeChat]);

  useEffect(() => {
    if (activeChat && user) {
      fetchMessages(user.id, activeChat.saved ? "saved" : activeChat.userId!);
      if (activeChat.userId) {
        supabase.from("profiles").select("last_seen, avatar_url, bio").eq("id", activeChat.userId).single()
          .then(({ data }) => {
            if (data) { setChatUserLastSeen(data.last_seen); setActiveChat(prev => prev ? { ...prev, avatar_url: data.avatar_url } : prev); }
          });
      } else { setChatUserLastSeen(null); }
    }
  }, [activeChat?.id]);

  // Search matches update
  useEffect(() => {
    if (!chatSearchQuery.trim()) {
      setSearchMatches([]); setCurrentMatchIndex(0); return;
    }
    const q = chatSearchQuery.toLowerCase();
    const matches = messages
      .filter(m => m.content?.toLowerCase().includes(q) || m.file_name?.toLowerCase().includes(q))
      .map(m => m.id);
    setSearchMatches(matches);
    setCurrentMatchIndex(0);
    if (matches.length > 0) {
      setTimeout(() => messageRefs.current[matches[0]]?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    }
  }, [chatSearchQuery, messages]);

  function navigateMatch(dir: 1 | -1) {
    if (searchMatches.length === 0) return;
    const newIdx = (currentMatchIndex + dir + searchMatches.length) % searchMatches.length;
    setCurrentMatchIndex(newIdx);
    messageRefs.current[searchMatches[newIdx]]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function fetchConversations(userId: string) {
    const { data } = await supabase
      .from("messages")
      .select("*, sender:profiles!messages_sender_id_fkey(id,full_name,username,avatar_url), receiver:profiles!messages_receiver_id_fkey(id,full_name,username,avatar_url)")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });
    if (!data) return;
    const undelivered = data.filter(m => m.receiver_id === userId && !m.is_delivered);
    for (const m of undelivered) await supabase.from("messages").update({ is_delivered: true }).eq("id", m.id);
    const seen = new Set<string>();
    const convs: Conversation[] = [];
    convs.push({ id: "saved", name: "Saved Messages", username: "saved", avatar: "★", color: "#1a6fff", lastMsg: "Your personal notes", time: "", unread: 0, online: true, saved: true });
    for (const msg of data) {
      const other = msg.sender_id === userId ? msg.receiver : msg.sender;
      if (!other || other.id === userId || seen.has(other.id)) continue;
      seen.add(other.id);
      const unread = activeChatRef.current?.userId === other.id ? 0 :
        data.filter(m => m.sender_id === other.id && m.receiver_id === userId && !m.is_read).length;
      convs.push({
        id: other.id, name: other.full_name, username: other.username,
        avatar: getInitials(other.full_name), avatar_url: other.avatar_url || "",
        color: getColor(other.id),
        lastMsg: msg.file_url ? `📎 ${msg.file_name || "File"}` : msg.content,
        time: timeAgo(msg.created_at), unread, online: false, userId: other.id,
      });
    }
    setConversations(convs);
  }

  async function fetchMessages(userId: string, otherId: string) {
    if (otherId === "saved") {
      const { data } = await supabase.from("messages").select("*").eq("sender_id", userId).eq("receiver_id", userId).order("created_at", { ascending: true }).limit(100);
      if (data) setMessages(data);
    } else {
      const { data } = await supabase.from("messages").select("*")
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId})`)
        .order("created_at", { ascending: true }).limit(100);
      if (data) {
        setMessages(data);
        for (const m of data.filter(m => m.receiver_id === userId && !m.is_delivered))
          await supabase.from("messages").update({ is_delivered: true }).eq("id", m.id);
        for (const m of data.filter(m => m.receiver_id === userId && !m.is_read))
          await supabase.from("messages").update({ is_read: true }).eq("id", m.id);
      }
    }
  }

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("typing-room")
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload.user_id === user.id) return;
        if (payload.payload.chat_id !== activeChatRef.current?.userId && payload.payload.chat_id !== user.id) return;
        setTypingUsers(prev => new Set(prev).add(payload.payload.user_id));
        setTimeout(() => setTypingUsers(prev => { const n = new Set(prev); n.delete(payload.payload.user_id); return n; }), 3000);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const pc = supabase.channel("presence-room")
      .on("presence", { event: "sync" }, () => {
        const state = pc.presenceState<{ user_id: string }>();
        const online = new Set<string>();
        Object.values(state).forEach((p: any) => p.forEach((u: any) => online.add(u.user_id)));
        setOnlineUsers(online);
        online.forEach(async (uid) => {
          if (uid === user.id) return;
          await supabase.from("messages").update({ is_delivered: true }).eq("sender_id", user.id).eq("receiver_id", uid).eq("is_delivered", false);
          setMessages(prev => prev.map(m => m.sender_id === user.id && m.receiver_id === uid ? { ...m, is_delivered: true } : m));
        });
      })
      .subscribe(async (status) => { if (status === "SUBSCRIBED") await pc.track({ user_id: user.id }); });
    return () => { supabase.removeChannel(pc); };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchConversations(user.id);
    const ch = supabase.channel("realtime-" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const newMsg = payload.new as Message;
        if (newMsg.sender_id !== user.id && newMsg.receiver_id !== user.id) return;
        setActiveChat(current => {
          if (!current) return current;
          const inThisChat =
            (current.saved && newMsg.sender_id === user.id && newMsg.receiver_id === user.id) ||
            (!current.saved && ((newMsg.sender_id === user.id && newMsg.receiver_id === current.userId) || (newMsg.sender_id === current.userId && newMsg.receiver_id === user.id)));
          if (inThisChat) {
            if (newMsg.receiver_id === user.id) supabase.from("messages").update({ is_read: true, is_delivered: true }).eq("id", newMsg.id).then(() => {});
            setMessages(prev => {
              const oi = prev.findIndex(m => m.id.startsWith("optimistic-") && m.content === newMsg.content && m.sender_id === newMsg.sender_id);
              if (oi !== -1) { const u = [...prev]; u[oi] = newMsg; return u; }
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg.receiver_id === user.id ? { ...newMsg, is_read: true, is_delivered: true } : newMsg];
            });
          }
          return current;
        });
        fetchConversations(user.id);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
        const u = payload.new as Message;
        if (u.sender_id !== user.id && u.receiver_id !== user.id) return;
        setMessages(prev => prev.map(m => m.id === u.id ? { ...m, is_read: u.is_read, is_delivered: u.is_delivered, reactions: u.reactions } : m));
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  useEffect(() => {
    if (messages.length === 0) return;
    if (isInitialLoad.current) { messagesEndRef.current?.scrollIntoView({ behavior: "auto" }); isInitialLoad.current = false; }
    else if (!chatSearchQuery) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!userSearch.trim() || !user) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase.from("profiles").select("*").neq("id", user.id).or(`username.ilike.%${userSearch}%,full_name.ilike.%${userSearch}%`).limit(8);
      setSearchResults(data || []); setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [userSearch, user]);

  function handleTouchStart(e: React.TouchEvent, msg: Message) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchMsgRef.current = msg;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      if (touchMsgRef.current && !msg.id.startsWith("optimistic-")) {
        setMobileLongPressReaction(msg.id);
        if (navigator.vibrate) navigator.vibrate(50);
        touchMsgRef.current = null; setSwipingMsgId(null); setSwipeOffset(0);
      }
    }, 500);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    if (!touchMsgRef.current) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (dy > 20) { touchMsgRef.current = null; setSwipingMsgId(null); setSwipeOffset(0); return; }
    if (dx > 0 && dx < 100) { setSwipingMsgId(touchMsgRef.current.id); setSwipeOffset(dx); }
  }

  function handleTouchEnd() {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    if (swipeOffset > 60 && touchMsgRef.current) {
      setReplyTo(touchMsgRef.current);
      if (navigator.vibrate) navigator.vibrate(30);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    setSwipingMsgId(null); setSwipeOffset(0); touchMsgRef.current = null;
  }

  async function toggleReaction(messageId: string, emoji: string) {
    setReactionPickerMsgId(null);
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;
    const reactions = { ...(msg.reactions || {}) };
    const users: string[] = reactions[emoji] ? [...reactions[emoji]] : [];
    const hasReacted = users.includes(user.id);
    if (hasReacted) {
      const newUsers = users.filter(id => id !== user.id);
      if (newUsers.length === 0) delete reactions[emoji]; else reactions[emoji] = newUsers;
    } else { reactions[emoji] = [...users, user.id]; }
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m));
    await supabase.from("messages").update({ reactions }).eq("id", messageId);
  }

  // CLEAR CHAT — deletes from DB
  async function clearChat() {
    if (!user || !activeChat) return;
    const confirmed = window.confirm("Clear all messages? This cannot be undone.");
    if (!confirmed) return;
    if (activeChat.saved) {
      await supabase.from("messages").delete().eq("sender_id", user.id).eq("receiver_id", user.id);
    } else {
      await supabase.from("messages").delete()
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeChat.userId}),and(sender_id.eq.${activeChat.userId},receiver_id.eq.${user.id})`);
    }
    setMessages([]);
    fetchConversations(user.id);
  }

  // BLOCK — only blocks the other user from sending to you (server-side)
  // Locally just tracks who you blocked
  async function toggleBlock(userId: string) {
    if (blockedUsers.has(userId)) {
      await supabase.from("blocked_users").delete().eq("blocker_id", user.id).eq("blocked_id", userId);
      setBlockedUsers(prev => { const n = new Set(prev); n.delete(userId); return n; });
    } else {
      await supabase.from("blocked_users").insert({ blocker_id: user.id, blocked_id: userId });
      setBlockedUsers(prev => new Set(prev).add(userId));
    }
  }

  async function loadSharedMedia(userId: string) {
    if (!user) return;
    const { data } = await supabase.from("messages").select("file_url, file_type")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
      .not("file_url", "is", null).order("created_at", { ascending: false }).limit(12);
    if (data) setSharedMedia(data.filter(m => m.file_type?.startsWith("image/")).map(m => m.file_url));
  }

  async function uploadFile(file: File) {
    if (!CLOUD_NAME || !UPLOAD_PRESET) { alert("Cloudinary not configured."); return null; }
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method: "POST", body: fd });
      const data = await res.json();
      setUploading(false);
      return { url: data.secure_url, type: file.type, name: file.name, size: file.size };
    } catch { setUploading(false); alert("Upload failed."); return null; }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user || !activeChat) return;
    if (file.size > 50 * 1024 * 1024) { alert("File too large. Max 50MB."); return; }
    const up = await uploadFile(file);
    if (!up) return;
    const rid = activeChat.saved ? user.id : activeChat.userId!;
    const opt: Message = { id: "optimistic-" + Date.now(), content: "", sender_id: user.id, receiver_id: rid, created_at: new Date().toISOString(), is_read: false, is_delivered: false, file_url: up.url, file_type: up.type, file_name: up.name, file_size: up.size };
    setMessages(prev => [...prev, opt]);
    const { data, error } = await supabase.from("messages").insert({ sender_id: user.id, receiver_id: rid, content: "", file_url: up.url, file_type: up.type, file_name: up.name, file_size: up.size }).select().single();
    if (error) setMessages(prev => prev.filter(m => m.id !== opt.id));
    else if (data) { setMessages(prev => prev.map(m => m.id === opt.id ? data : m)); fetchConversations(user.id); }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function sendMessage() {
    if (!message.trim() || !user || sending || !activeChat) return;
    setSending(true);
    const content = message.trim(); setMessage("");
    const currentReplyTo = replyTo; setReplyTo(null); setShowEmojiPicker(false);
    const rid = activeChat.saved ? user.id : activeChat.userId!;
    const opt: Message = {
      id: "optimistic-" + Date.now(), content, sender_id: user.id, receiver_id: rid,
      created_at: new Date().toISOString(), is_read: false, is_delivered: false,
      reply_to_id: currentReplyTo?.id,
      reply_to_content: currentReplyTo?.file_url ? "📎 File" : currentReplyTo?.content,
      reply_to_sender: currentReplyTo ? (currentReplyTo.sender_id === user.id ? "You" : activeChat.name) : undefined,
    };
    setMessages(prev => [...prev, opt]);
    const insertData: any = { sender_id: user.id, receiver_id: rid, content };
    if (currentReplyTo) {
      insertData.reply_to_id = currentReplyTo.id;
      insertData.reply_to_content = currentReplyTo.file_url ? "📎 File" : currentReplyTo.content;
      insertData.reply_to_sender = currentReplyTo.sender_id === user.id ? "You" : activeChat.name;
    }
    const { data, error } = await supabase.from("messages").insert(insertData).select().single();
    if (error) setMessages(prev => prev.filter(m => m.id !== opt.id));
    else if (data) { setMessages(prev => prev.map(m => m.id === opt.id ? data : m)); fetchConversations(user.id); }
    setSending(false);
  }

  function downloadFile(url: string, filename: string) {
    const a = document.createElement("a");
    a.href = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename || "download")}`;
    a.download = filename || "download"; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  function renderFileMessage(msg: Message) {
    if (msg.file_type?.startsWith("image/")) return <img src={msg.file_url} alt={msg.file_name} onClick={() => setLightboxImg(msg.file_url!)} style={{ maxWidth: "100%", maxHeight: 260, borderRadius: 10, display: "block", cursor: "zoom-in" }} />;
    if (msg.file_type?.startsWith("video/")) return <video controls style={{ maxWidth: "100%", maxHeight: 260, borderRadius: 10 }}><source src={msg.file_url} type={msg.file_type} /></video>;
    if (msg.file_type?.startsWith("audio/")) return <audio controls style={{ width: "100%" }}><source src={msg.file_url} type={msg.file_type} /></audio>;
    return (
      <div onClick={() => downloadFile(msg.file_url!, msg.file_name || "file")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "rgba(255,255,255,0.08)", borderRadius: 10, cursor: "pointer" }}>
        <div style={{ color: "#60a5fa" }}>{getFileIcon(msg.file_type || "")}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>{msg.file_name}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{formatFileSize(msg.file_size || 0)}</div>
        </div>
        <Download size={16} style={{ color: "#60a5fa", flexShrink: 0 }} />
      </div>
    );
  }

  async function openProfilePanel(userId: string) {
    setAvatarPopup(null);
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) {
      setProfilePanel({ id: data.id, name: data.full_name, username: data.username, avatar_url: data.avatar_url, bio: data.bio, last_seen: data.last_seen, online: onlineUsers.has(data.id), color: getColor(data.id) });
      loadSharedMedia(userId);
    }
  }

  function openUserChat(p: Profile) {
    const conv: Conversation = { id: p.id, name: p.full_name, username: p.username, avatar: getInitials(p.full_name), avatar_url: p.avatar_url, color: getColor(p.id), lastMsg: "", time: "", unread: 0, online: false, userId: p.id };
    setActiveChat(conv); setShowChat(true); setShowSearch(false); setUserSearch(""); setSearchResults([]);
    if (!conversations.find(c => c.id === p.id)) {
      setConversations(prev => { const f = prev.filter(c => c.id !== p.id); const s = f.find(c => c.saved); const r = f.filter(c => !c.saved); return s ? [s, conv, ...r] : [conv, ...r]; });
    }
  }

  async function handleLogout() {
    if (user) await supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", user.id);
    await supabase.auth.signOut(); window.location.href = "/auth";
  }

  function openChat(chat: Conversation) {
    setActiveChat(chat); setShowChat(true); setMessages([]); setProfilePanel(null); setReplyTo(null); setShowEmojiPicker(false); setShowChatSearch(false); setChatSearchQuery("");
    setConversations(prev => prev.map(c => c.id === chat.id ? { ...c, unread: 0 } : c));
  }

  function backToList() { setShowChat(false); setActiveChat(null); setMessages([]); setProfilePanel(null); setReplyTo(null); setShowChatSearch(false); setChatSearchQuery(""); }

  // Navigate to a chat from profile panel — fix: if same chat open, just close panel
  function goToChat(userId: string) {
    const conv = conversations.find(c => c.userId === userId);
    if (conv) {
      if (activeChat?.id === conv.id) {
        // Already in this chat — just close the profile panel, don't reset messages
        setProfilePanel(null);
      } else {
        openChat(conv);
      }
    } else if (profilePanel) {
      // Create new conversation entry
      const nc: Conversation = { id: profilePanel.id, name: profilePanel.name, username: profilePanel.username, avatar: getInitials(profilePanel.name), avatar_url: profilePanel.avatar_url, color: profilePanel.color, lastMsg: "", time: "", unread: 0, online: false, userId: profilePanel.id };
      setActiveChat(nc); setShowChat(true); setMessages([]); setProfilePanel(null);
      setConversations(prev => { const f = prev.filter(c => c.id !== nc.id); const s = f.find(c => c.saved); const r = f.filter(c => !c.saved); return s ? [s, nc, ...r] : [nc, ...r]; });
    }
  }

  const myInitials = profile?.full_name ? getInitials(profile.full_name) : "U";
  const filteredConvs = conversations.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.username.toLowerCase().includes(search.toLowerCase()));

  // WhatsApp-style Profile Panel
  const ProfilePanelContent = profilePanel ? (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", background: "#0a0e1a", overflowY: "auto" }}>
      <div style={{ position: "relative", background: `linear-gradient(160deg, ${profilePanel.color}cc 0%, #0a0e1a 70%)`, padding: "56px 20px 24px", flexShrink: 0 }}>
        <button onClick={() => setProfilePanel(null)} style={{ position: "absolute", top: 12, left: 12, width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.3)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
          <div onClick={() => profilePanel.avatar_url && setLightboxImg(profilePanel.avatar_url)}
            style={{ width: 88, height: 88, borderRadius: "50%", background: profilePanel.color, border: "3px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, color: "#fff", overflow: "hidden", cursor: profilePanel.avatar_url ? "zoom-in" : "default", flexShrink: 0 }}>
            {profilePanel.avatar_url ? <img src={profilePanel.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : getInitials(profilePanel.name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{profilePanel.name}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>@{profilePanel.username}</div>
            {profilePanel.online ? <div style={{ fontSize: 12, color: "#22c55e" }}>● Online</div>
              : profilePanel.last_seen ? <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{lastSeenText(profilePanel.last_seen)}</div> : null}
          </div>
        </div>
      </div>

      {profilePanel.id !== user?.id && (
        <div style={{ display: "flex", gap: 10, padding: "16px 16px 8px" }}>
          <button onClick={() => goToChat(profilePanel.id)} style={{ flex: 1, padding: "10px 6px", background: "rgba(26,111,255,0.15)", border: "1px solid rgba(26,111,255,0.3)", borderRadius: 12, color: "#60a5fa", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <MessageCircle size={18} /><span>Message</span>
          </button>
          <button style={{ flex: 1, padding: "10px 6px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <Phone size={18} /><span>Call</span>
          </button>
          <button style={{ flex: 1, padding: "10px 6px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <Video size={18} /><span>Video</span>
          </button>
          <button onClick={() => { setShowChatSearch(true); setProfilePanel(null); setTimeout(() => chatSearchRef.current?.focus(), 100); }}
            style={{ flex: 1, padding: "10px 6px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <Search size={18} /><span>Search</span>
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "8px 16px 24px" }}>
        {profilePanel.bio && (
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "14px 16px", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: 11, color: "#60a5fa", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>About</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>{profilePanel.bio}</div>
          </div>
        )}

        {sharedMedia.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "14px 16px", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "#60a5fa", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>Shared Media</div>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{sharedMedia.length} photos</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, borderRadius: 10, overflow: "hidden" }}>
              {sharedMedia.slice(0, 6).map((url, i) => (
                <div key={i} onClick={() => setLightboxImg(url)} style={{ aspectRatio: "1", background: "#1a2236", overflow: "hidden", cursor: "zoom-in", borderRadius: 6 }}>
                  <img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {profilePanel.id !== user?.id && (
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div onClick={() => toggleBlock(profilePanel.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <Ban size={18} style={{ color: blockedUsers.has(profilePanel.id) ? "#22c55e" : "#ef4444" }} />
              <span style={{ fontSize: 14, color: blockedUsers.has(profilePanel.id) ? "#22c55e" : "#ef4444" }}>
                {blockedUsers.has(profilePanel.id) ? "Unblock User" : "Block User"}
              </span>
            </div>
          </div>
        )}

        {profilePanel.id === user?.id && (
          <button onClick={() => { setProfilePanel(null); window.location.href = "/profile"; }}
            style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg, #1a6fff, #0d4fd9)", border: "none", borderRadius: 14, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Edit size={16} /> Edit My Profile
          </button>
        )}
      </div>
    </div>
  ) : null;

  if (loading) return (
    <div style={{ height: "100vh", background: "#0a0e1a", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <img src="/icon-512.png" style={{ width: 64, height: 64, borderRadius: 20 }} />
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
        @keyframes matchPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(255,210,0,0); } 40% { box-shadow: 0 0 0 4px rgba(255,210,0,0.4); } }
        .msg-in { animation: fadeUp 0.2s ease forwards; }
        .msg-current-match { animation: matchPulse 0.8s ease 0s 2; border-radius: 18px; }
        .msg-actions { display: flex; }
        .search-overlay { position: absolute; inset: 0; z-index: 50; background: #0f1525; display: flex; flex-direction: column; }
        .emoji-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; }
        @media (max-width: 768px) {
          .sidebar { width: 100%; min-width: unset; position: absolute; inset: 0; z-index: 10; transition: transform 0.25s ease; }
          .sidebar.slide-out { transform: translateX(-100%); }
          .chat-area { position: absolute; inset: 0; z-index: 9; transition: transform 0.25s ease; transform: translateX(100%); }
          .chat-area:not(.slide-out) { transform: translateX(0); z-index: 11; }
          .chat-area.slide-out { transform: translateX(100%); }
          .emoji-grid { grid-template-columns: repeat(6, 1fr); }
          .msg-actions { display: none !important; }
        }
      `}</style>

      <div className="app" onClick={() => { setAvatarPopup(null); setShowMenu(false); setReactionPickerMsgId(null); setShowEmojiPicker(false); setMobileLongPressReaction(null); }}>

        {/* Lightbox */}
        {lightboxImg && (
          <div onClick={() => setLightboxImg(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
            <button onClick={() => setLightboxImg(null)} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: 40, height: 40, color: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            <img src={lightboxImg} style={{ maxWidth: "95vw", maxHeight: "90vh", borderRadius: 12, objectFit: "contain" }} onClick={e => e.stopPropagation()} />
            <button onClick={() => downloadFile(lightboxImg!, lightboxImg!.split("/").pop() || "image")} style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", padding: "8px 20px", background: "rgba(26,111,255,0.8)", borderRadius: 10, color: "#fff", fontSize: 13, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <Download size={14} /> Download
            </button>
          </div>
        )}

        {/* Mobile Reaction Picker */}
        {mobileLongPressReaction && (
          <div onClick={() => setMobileLongPressReaction(null)} style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#1a2236", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 40, padding: "8px 12px", display: "flex", gap: 2, boxShadow: "0 8px 40px rgba(0,0,0,0.6)" }}>
              {REACTION_EMOJIS.map(e => (
                <button key={e} onClick={() => { toggleReaction(mobileLongPressReaction, e); setMobileLongPressReaction(null); }} style={{ fontSize: 22, background: "none", border: "none", cursor: "pointer", padding: "4px", lineHeight: 1 }}>{e}</button>
              ))}
            </div>
          </div>
        )}

        {/* Avatar Popup */}
        {avatarPopup && (
          <div onClick={e => e.stopPropagation()} style={{ position: "fixed", top: Math.min(avatarPopup.y, window.innerHeight - 210), left: Math.min(avatarPopup.x, window.innerWidth - 220), zIndex: 200, background: "#1a2236", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: "16px", width: 200, boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <Avatar url={avatarPopup.avatar_url} initials={getInitials(avatarPopup.name)} color={avatarPopup.color} size={64} />
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", textAlign: "center" }}>{avatarPopup.name}</div>
              <div style={{ fontSize: 12, color: "#60a5fa" }}>@{avatarPopup.username}</div>
              {onlineUsers.has(avatarPopup.userId) && <div style={{ fontSize: 11, color: "#22c55e" }}>● Online</div>}
              <button onClick={() => openProfilePanel(avatarPopup.userId)} style={{ width: "100%", marginTop: 4, padding: "8px", background: "rgba(26,111,255,0.2)", border: "1px solid rgba(26,111,255,0.3)", borderRadius: 10, color: "#60a5fa", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Info size={13} /> View Profile
              </button>
            </div>
          </div>
        )}

        {/* SIDEBAR */}
        <div className={`sidebar${showChat ? " slide-out" : ""}`} style={{ position: "relative" }}>
          {showSearch && (
            <div className="search-overlay">
              <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10 }}>
                <button className="icon-btn" onClick={() => { setShowSearch(false); setUserSearch(""); setSearchResults([]); }}><ArrowLeft size={17} /></button>
                <input autoFocus value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search by name or username..."
                  style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "9px 12px", color: "#fff", fontSize: 14 }} />
                {userSearch && <button className="icon-btn" onClick={() => setUserSearch("")}><X size={15} /></button>}
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
                {searching && <div style={{ padding: "20px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Searching...</div>}
                {!searching && userSearch && searchResults.length === 0 && <div style={{ padding: "20px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>No users found</div>}
                {searchResults.map(p => (
                  <div key={p.id} onClick={() => openUserChat(p)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <Avatar url={p.avatar_url} initials={getInitials(p.full_name)} color={getColor(p.id)} size={44} />
                    <div><div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{p.full_name}</div><div style={{ fontSize: 12, color: "#60a5fa" }}>@{p.username}</div></div>
                    <div style={{ marginLeft: "auto", padding: "5px 12px", borderRadius: 8, background: "rgba(26,111,255,0.2)", color: "#60a5fa", fontSize: 12, fontWeight: 600 }}>Chat</div>
                  </div>
                ))}
                {!userSearch && (
                  <div style={{ padding: "24px 20px", textAlign: "center" }}>
                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(26,111,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}><Users size={24} style={{ color: "#60a5fa" }} /></div>
                    <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>Search for any Jugalbandi user<br />by their name or @username</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <img src="/icon-192.png" style={{ width: 34, height: 34, borderRadius: 10, objectFit: "cover" }} />
                <span style={{ fontSize: 19, fontWeight: 700, color: "#fff" }}>Jugalbandi</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="icon-btn" onClick={() => setShowSearch(true)}><UserPlus size={15} /></button>
                <button className="icon-btn" onClick={handleLogout} style={{ color: "rgba(255,100,100,0.8)" }}><LogOut size={15} /></button>
              </div>
            </div>
            <div onClick={() => window.location.href = "/profile"} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "8px 12px", background: "rgba(26,111,255,0.09)", borderRadius: 10, border: "1px solid rgba(26,111,255,0.18)", cursor: "pointer" }}>
              <Avatar url={profile?.avatar_url} initials={myInitials} color="linear-gradient(135deg, #1a6fff, #7c3aed)" size={30} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile?.full_name || "User"}</div>
                <div style={{ fontSize: 11, color: "#60a5fa" }}>@{profile?.username || "—"}</div>
              </div>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
            </div>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.35)", pointerEvents: "none" }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations..."
                style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 10, padding: "9px 10px 9px 34px", color: "#fff", fontSize: 13 }} />
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
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(26,111,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}><UserPlus size={22} style={{ color: "#60a5fa" }} /></div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.7 }}>No conversations yet.<br /><span onClick={() => setShowSearch(true)} style={{ color: "#60a5fa", cursor: "pointer" }}>Find someone →</span></div>
              </div>
            )}
            {filteredConvs.map(chat => (
              <div key={chat.id} className={`chat-item${activeChat?.id === chat.id ? " active" : ""}`} onClick={() => openChat(chat)}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div onClick={e => {
                    if (!chat.userId) return; e.stopPropagation();
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setAvatarPopup({ userId: chat.userId, name: chat.name, username: chat.username, avatar_url: chat.avatar_url, color: chat.color, x: rect.right + 8, y: rect.top });
                  }} style={{ width: 46, height: 46, borderRadius: "50%", background: chat.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: chat.saved ? 18 : 13, fontWeight: 700, color: "#fff", overflow: "hidden", cursor: chat.userId ? "pointer" : "default" }}>
                    {chat.avatar_url ? <img src={chat.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : chat.avatar}
                  </div>
                  {onlineUsers.has(chat.userId || "") && <div style={{ position: "absolute", bottom: 1, right: 1, width: 11, height: 11, background: "#22c55e", borderRadius: "50%", border: "2px solid #0f1525" }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "65%" }}>{chat.name}</span>
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
            {[{ icon: <Edit size={16} />, active: true }, { icon: <Users size={16} /> }, { icon: <Zap size={16} />, link: "/ai" }, { icon: <Star size={16} /> }].map((item, i) => (
              <div key={i} onClick={() => { if ((item as any).link) window.location.href = (item as any).link; }}
                style={{ flex: 1, height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: item.active ? "rgba(26,111,255,0.2)" : "transparent", color: item.active ? "#60a5fa" : "rgba(255,255,255,0.35)" }}>
                {item.icon}
              </div>
            ))}
          </div>
        </div>

        {/* CHAT AREA */}
        <div className={`chat-area${!showChat ? " slide-out" : ""}`} style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          {profilePanel ? ProfilePanelContent : activeChat ? (
            <>
              {/* Chat Header */}
              <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10, background: "#0f1525", flexShrink: 0 }}>
                <button className="icon-btn" onClick={backToList}><ArrowLeft size={17} /></button>
                <div onClick={() => activeChat.userId && openProfilePanel(activeChat.userId)} style={{ position: "relative", cursor: activeChat.userId ? "pointer" : "default", flexShrink: 0 }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: activeChat.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: activeChat.saved ? 16 : 13, fontWeight: 700, color: "#fff", overflow: "hidden" }}>
                    {activeChat.avatar_url ? <img src={activeChat.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : activeChat.avatar}
                  </div>
                  {onlineUsers.has(activeChat.userId || "") && <div style={{ position: "absolute", bottom: 0, right: 0, width: 9, height: 9, background: "#22c55e", borderRadius: "50%", border: "2px solid #0f1525" }} />}
                </div>
                <div onClick={() => activeChat.userId && openProfilePanel(activeChat.userId)} style={{ flex: 1, minWidth: 0, cursor: activeChat.userId ? "pointer" : "default", overflow: "hidden" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activeChat.name}</div>
                  <div style={{ fontSize: 11, color: activeChat.saved ? "#60a5fa" : typingUsers.has(activeChat.userId || "") ? "#22c55e" : onlineUsers.has(activeChat.userId || "") ? "#22c55e" : "rgba(255,255,255,0.4)" }}>
                    {activeChat.saved ? "Your personal space" : typingUsers.has(activeChat.userId || "") ? "typing..." : onlineUsers.has(activeChat.userId || "") ? "● Online" : chatUserLastSeen ? lastSeenText(chatUserLastSeen) : `@${activeChat.username}`}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  {!activeChat.saved && (<><button className="icon-btn"><Phone size={15} /></button><button className="icon-btn"><Video size={15} /></button></>)}
                  <div style={{ position: "relative" }}>
                    <button className="icon-btn" onClick={e => { e.stopPropagation(); setShowMenu(m => !m); }}><MoreVertical size={15} /></button>
                    {showMenu && (
                      <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: 40, right: 0, background: "#1a2236", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "6px 0", minWidth: 180, zIndex: 100, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                        {activeChat.userId && (
                          <div onClick={() => { setShowMenu(false); openProfilePanel(activeChat.userId!); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", cursor: "pointer", color: "rgba(255,255,255,0.8)", fontSize: 13 }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                            <Info size={14} style={{ color: "#60a5fa" }} /> View Profile
                          </div>
                        )}
                        <div onClick={() => { setShowMenu(false); setShowChatSearch(s => !s); if (!showChatSearch) setTimeout(() => chatSearchRef.current?.focus(), 100); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", cursor: "pointer", color: "rgba(255,255,255,0.8)", fontSize: 13 }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <Search size={14} style={{ color: "#60a5fa" }} /> Search in Chat
                        </div>
                        {activeChat.userId && (
                          <div onClick={() => { setShowMenu(false); toggleBlock(activeChat.userId!); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", cursor: "pointer", fontSize: 13 }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                            <Ban size={14} style={{ color: blockedUsers.has(activeChat.userId) ? "#22c55e" : "#ef4444" }} />
                            <span style={{ color: blockedUsers.has(activeChat.userId) ? "#22c55e" : "rgba(255,255,255,0.8)" }}>{blockedUsers.has(activeChat.userId) ? "Unblock User" : "Block User"}</span>
                          </div>
                        )}
                        <div onClick={() => { setShowMenu(false); window.location.href = "/profile"; }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", cursor: "pointer", color: "rgba(255,255,255,0.8)", fontSize: 13 }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <Edit size={14} style={{ color: "#60a5fa" }} /> Edit My Profile
                        </div>
                        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />
                        <div onClick={() => { setShowMenu(false); clearChat(); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", cursor: "pointer", color: "#ef4444", fontSize: 13 }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <X size={14} /> Clear Chat
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Chat Search Bar */}
              {showChatSearch && (
                <div style={{ padding: "8px 12px", background: "#0f1525", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <Search size={15} style={{ color: "rgba(255,255,255,0.4)", flexShrink: 0 }} />
                  <input ref={chatSearchRef} value={chatSearchQuery} onChange={e => setChatSearchQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") navigateMatch(1); if (e.key === "Escape") { setShowChatSearch(false); setChatSearchQuery(""); } }}
                    placeholder="Search in chat..."
                    style={{ flex: 1, background: "transparent", border: "none", color: "#fff", fontSize: 14 }} />
                  {chatSearchQuery.trim() && (
                    <>
                      <span style={{ fontSize: 12, color: searchMatches.length > 0 ? "rgba(255,255,255,0.5)" : "#ef4444", flexShrink: 0, whiteSpace: "nowrap" }}>
                        {searchMatches.length > 0 ? `${currentMatchIndex + 1} / ${searchMatches.length}` : "Not found"}
                      </span>
                      <button onClick={() => navigateMatch(-1)} disabled={searchMatches.length === 0} style={{ background: "none", border: "none", cursor: searchMatches.length > 0 ? "pointer" : "default", color: searchMatches.length > 0 ? "#60a5fa" : "rgba(255,255,255,0.2)", display: "flex", padding: 2 }}>
                        <ChevronUp size={16} />
                      </button>
                      <button onClick={() => navigateMatch(1)} disabled={searchMatches.length === 0} style={{ background: "none", border: "none", cursor: searchMatches.length > 0 ? "pointer" : "default", color: searchMatches.length > 0 ? "#60a5fa" : "rgba(255,255,255,0.2)", display: "flex", padding: 2 }}>
                        <ChevronDown size={16} />
                      </button>
                    </>
                  )}
                  <button onClick={() => { setShowChatSearch(false); setChatSearchQuery(""); setSearchMatches([]); }} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", display: "flex", padding: 2 }}><X size={15} /></button>
                </div>
              )}

              {uploading && (
                <div style={{ padding: "8px 16px", background: "rgba(26,111,255,0.1)", borderBottom: "1px solid rgba(26,111,255,0.2)", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 999 }}><div style={{ height: "100%", background: "#1a6fff", borderRadius: 999, width: "60%" }} /></div>
                  <span style={{ fontSize: 12, color: "#60a5fa" }}>Uploading...</span>
                </div>
              )}

              {/* Messages — all visible, matches highlighted */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
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
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>{activeChat.saved ? "Send yourself notes, files, or reminders." : `Start a conversation with ${activeChat.name}`}</div>
                    </div>
                  </div>
                )}

                {messages.map((msg) => {
                  const isSent = msg.sender_id === user?.id;
                  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  const isSwipingThis = swipingMsgId === msg.id;
                  const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;
                  const showActions = hoveredMsgId === msg.id && !msg.id.startsWith("optimistic-");
                  const isMatch = chatSearchQuery.trim() && searchMatches.includes(msg.id);
                  const isCurrentMatch = searchMatches[currentMatchIndex] === msg.id;

                  return (
                    <div key={msg.id} className="msg-in" style={{ marginBottom: hasReactions ? 24 : 2 }}
                      ref={el => { if (el) messageRefs.current[msg.id] = el; }}
                      onMouseEnter={() => setHoveredMsgId(msg.id)}
                      onMouseLeave={() => setHoveredMsgId(null)}>
                      <div style={{ display: "flex", justifyContent: isSent ? "flex-end" : "flex-start" }}>
                        <div onTouchStart={e => handleTouchStart(e, msg)} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
                          className={isCurrentMatch ? "msg-current-match" : ""}
                          style={{ maxWidth: "75%", transform: isSwipingThis ? `translateX(${Math.min(swipeOffset, 80)}px)` : "translateX(0)", transition: isSwipingThis ? "none" : "transform 0.2s ease", position: "relative", outline: isMatch && !isCurrentMatch ? "1px solid rgba(255,210,0,0.3)" : "none", borderRadius: 18 }}>

                          {!msg.id.startsWith("optimistic-") && (
                            <div className="msg-actions" style={{ position: "absolute", [isSent ? "right" : "left"]: "calc(100% + 6px)", bottom: 18, display: "flex", flexDirection: "column", gap: 4, zIndex: 10, opacity: showActions ? 1 : 0, pointerEvents: showActions ? "auto" : "none", transition: "opacity 0.15s" }}>
                              <button onClick={e => { e.stopPropagation(); setReactionPickerMsgId(prev => prev === msg.id ? null : msg.id); }} style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>😊</button>
                              <button onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }} style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <CornerUpLeft size={13} style={{ color: "rgba(255,255,255,0.6)" }} />
                              </button>
                            </div>
                          )}

                          {isSwipingThis && swipeOffset > 20 && (
                            <div style={{ position: "absolute", left: -36, bottom: 10, opacity: Math.min(swipeOffset / 60, 1) }}>
                              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(26,111,255,0.25)", border: "1px solid rgba(26,111,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <CornerUpLeft size={13} style={{ color: "#60a5fa" }} />
                              </div>
                            </div>
                          )}

                          {msg.reply_to_content && (
                            <div style={{ background: isSent ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.07)", borderLeft: "3px solid #60a5fa", borderRadius: "8px 8px 0 0", padding: "6px 10px", marginBottom: -4 }}>
                              <div style={{ fontSize: 11, color: "#60a5fa", fontWeight: 600, marginBottom: 2 }}>{msg.reply_to_sender}</div>
                              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{msg.reply_to_content}</div>
                            </div>
                          )}

                          <div style={{ padding: msg.file_url ? "6px" : "10px 14px", borderRadius: msg.reply_to_content ? (isSent ? "0 18px 4px 18px" : "0 18px 18px 4px") : (isSent ? "18px 18px 4px 18px" : "18px 18px 18px 4px"), background: isSent ? "linear-gradient(135deg, #1a6fff, #0d4fd9)" : "rgba(20,26,44,1)", border: isSent ? "none" : "1px solid rgba(255,255,255,0.09)", color: "#fff", fontSize: 14, lineHeight: 1.55, wordBreak: "break-word" }}>
                            {msg.file_url ? renderFileMessage(msg) : (
                              chatSearchQuery.trim()
                                ? <HighlightText text={msg.content} query={chatSearchQuery} />
                                : msg.content
                            )}
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, justifyContent: isSent ? "flex-end" : "flex-start" }}>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{time}</span>
                            {isSent && (msg.is_read ? <CheckCheck size={12} style={{ color: "#60a5fa" }} /> : (msg.is_delivered || onlineUsers.has(activeChat?.userId || "")) ? <CheckCheck size={12} style={{ color: "rgba(255,255,255,0.4)" }} /> : <Check size={12} style={{ color: "rgba(255,255,255,0.4)" }} />)}
                          </div>

                          {hasReactions && (
                            <div style={{ position: "absolute", bottom: -22, [isSent ? "right" : "left"]: 0, display: "flex", gap: 3, flexWrap: "wrap" }}>
                              {Object.entries(msg.reactions!).map(([emoji, userIds]) => (
                                <div key={emoji} onClick={() => toggleReaction(msg.id, emoji)} style={{ padding: "2px 7px", background: userIds.includes(user.id) ? "rgba(26,111,255,0.35)" : "rgba(20,26,44,0.98)", border: userIds.includes(user.id) ? "1px solid rgba(26,111,255,0.5)" : "1px solid rgba(255,255,255,0.15)", borderRadius: 999, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 3, boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
                                  {emoji}<span style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>{userIds.length}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {reactionPickerMsgId === msg.id && (
                            <div onClick={e => e.stopPropagation()} style={{ position: "absolute", [isSent ? "right" : "left"]: 0, bottom: "calc(100% + 10px)", background: "#1a2236", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 30, padding: "6px 12px", display: "flex", gap: 4, zIndex: 50, boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}>
                              {REACTION_EMOJIS.map(e => (
                                <button key={e} onClick={() => toggleReaction(msg.id, e)} style={{ fontSize: 22, background: "none", border: "none", cursor: "pointer", padding: "2px 3px", borderRadius: "50%", transition: "transform 0.1s" }} onMouseEnter={el => (el.currentTarget.style.transform = "scale(1.3)")} onMouseLeave={el => (el.currentTarget.style.transform = "scale(1)")}>{e}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Preview */}
              {replyTo && (
                <div style={{ padding: "8px 16px", background: "#0f1525", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <div style={{ width: 3, height: 36, background: "#1a6fff", borderRadius: 99, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "#60a5fa", fontWeight: 600, marginBottom: 2 }}>{replyTo.sender_id === user?.id ? "You" : activeChat.name}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{replyTo.file_url ? "📎 File" : replyTo.content}</div>
                  </div>
                  <button onClick={() => setReplyTo(null)} style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={13} style={{ color: "rgba(255,255,255,0.5)" }} /></button>
                </div>
              )}

              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div onClick={e => e.stopPropagation()} style={{ padding: "12px", background: "#0f1525", borderTop: "1px solid rgba(255,255,255,0.07)", flexShrink: 0, maxHeight: 200, overflowY: "auto" }}>
                  <div className="emoji-grid">
                    {EMOJI_GRID.map(e => (
                      <button key={e} onClick={() => {
                        const pos = (inputRef.current?.selectionStart) || message.length;
                        setMessage(prev => prev.slice(0, pos) + e + prev.slice(pos));
                        setTimeout(() => { inputRef.current?.focus(); inputRef.current?.setSelectionRange(pos + e.length, pos + e.length); }, 0);
                      }} style={{ fontSize: 22, background: "none", border: "none", cursor: "pointer", padding: "4px", borderRadius: 8 }} onMouseEnter={el => (el.currentTarget.style.background = "rgba(255,255,255,0.08)")} onMouseLeave={el => (el.currentTarget.style.background = "none")}>{e}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.07)", background: "#0f1525", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "7px 10px" }}>
                  <button onClick={e => { e.stopPropagation(); setShowEmojiPicker(p => !p); setReactionPickerMsgId(null); }} style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", padding: 0 }}>
                    <Smile size={20} style={{ color: showEmojiPicker ? "#60a5fa" : "rgba(255,255,255,0.4)" }} />
                  </button>
                  <input ref={inputRef} value={message} onChange={e => {
                    setMessage(e.target.value);
                    if (!user || !activeChat?.userId) return;
                    supabase.channel("typing-room").send({ type: "broadcast", event: "typing", payload: { user_id: user.id, chat_id: activeChat.userId } });
                  }}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder={activeChat.saved ? "Write a note to yourself..." : `Message ${activeChat.name}...`}
                    style={{ flex: 1, background: "transparent", border: "none", color: "#fff", fontSize: 14, padding: "3px 0", minWidth: 0 }} />
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                    <input ref={fileInputRef} type="file" accept="*/*" onChange={handleFileSelect} style={{ display: "none" }} />
                    <Paperclip size={18} style={{ color: uploading ? "#60a5fa" : "rgba(255,255,255,0.4)", cursor: "pointer" }} onClick={() => fileInputRef.current?.click()} />
                    {message.trim()
                      ? <div onClick={sendMessage} style={{ width: 36, height: 36, borderRadius: 11, background: sending ? "rgba(26,111,255,0.5)" : "linear-gradient(135deg, #1a6fff, #0d4fd9)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Send size={16} style={{ color: "#fff" }} /></div>
                      : <div style={{ width: 36, height: 36, borderRadius: 11, background: "rgba(26,111,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Mic size={16} style={{ color: "#60a5fa" }} /></div>}
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
              <img src="/icon-512.png" style={{ width: 88, height: 88, borderRadius: 26 }} />
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