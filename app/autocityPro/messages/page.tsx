// app/autocityPro/messages/page.tsx — FIXED VERSION WITH DOCUMENT-LEVEL POINTER LISTENERS
// KEY FIX: Uses document-level pointerup listeners for reliable pointer release detection
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import {
  MessageCircle,
  Send,
  Mic,
  X,
  Play,
  Pause,
  Trash2,
  Search,
  Check,
  CheckCheck,
  ArrowLeft,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Copy,
  Plus,
  Camera,
  Lock,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Wallpaper ────────────────────────────────────────────────────────────────
const WALLPAPER_SVG_RAW = `<svg xmlns='http://www.w3.org/2000/svg' width='380' height='380'>
  <rect width='380' height='380' fill='%230D1117'/>
  <g stroke='rgba(255,255,255,0.11)' stroke-width='1.4' fill='none' stroke-linecap='round' stroke-linejoin='round'>
    <path d='M20,48 A18,18 0 0,1 56,48'/><rect x='15' y='48' width='9' height='14' rx='3'/>
    <rect x='52' y='48' width='9' height='14' rx='3'/>
    <polygon points='200,18 203,26 212,26 205,31 208,39 200,34 192,39 195,31 188,26 197,26'/>
    <path d='M318,68 C318,58 306,54 306,64 C306,54 294,58 294,68 C294,76 306,85 306,85 C306,85 318,76 318,68 Z'/>
    <path d='M85,148 L85,168 M85,168 A5,5 0 1,1 75,168 A5,5 0 0,1 85,168'/><path d='M85,148 L99,145 L99,155 L85,158'/>
    <path d='M290,115 L265,155 L315,155 Z'/><path d='M271,150 A30,30 0 0,1 309,150'/>
    <circle cx='285' cy='138' r='3' fill='rgba(255,255,255,0.11)'/><circle cx='298' cy='143' r='2.5' fill='rgba(255,255,255,0.11)'/>
    <path d='M34,258 L34,280 Q34,286 40,286 L60,286 Q66,286 66,280 L66,258 Z'/><path d='M66,263 Q76,263 76,270 Q76,277 66,277'/>
    <path d='M40,258 Q43,250 50,250 Q57,250 60,258'/>
    <circle cx='170' cy='70' r='2.5' fill='rgba(255,255,255,0.11)' stroke='none'/>
    <circle cx='145' cy='315' r='2' fill='rgba(255,255,255,0.11)' stroke='none'/>
    <circle cx='340' cy='170' r='2.5' fill='rgba(255,255,255,0.11)' stroke='none'/>
    <circle cx='230' cy='240' r='2' fill='rgba(255,255,255,0.11)' stroke='none'/>
    <circle cx='100' cy='330' r='2' fill='rgba(255,255,255,0.11)' stroke='none'/>
    <circle cx='345' cy='235' r='5'/><ellipse cx='345' cy='222' rx='4' ry='7'/>
    <ellipse cx='358' cy='235' rx='7' ry='4'/><ellipse cx='345' cy='248' rx='4' ry='7'/>
    <ellipse cx='332' cy='235' rx='7' ry='4'/>
    <rect x='283' y='312' width='46' height='30' rx='8'/>
    <path d='M293,342 L288,352 L300,342'/><line x1='292' y1='322' x2='320' y2='322'/><line x1='292' y1='330' x2='314' y2='330'/>
    <path d='M160,274 L175,283 L160,310 L145,283 Z'/><line x1='145' y1='283' x2='175' y2='283'/>
    <path d='M248,60 L250,68 M248,60 L246,68 M248,60 L256,62 M248,60 L240,62 M248,60 L254,54 M248,60 L242,54'/>
    <circle cx='130' cy='178' r='20'/><line x1='130' y1='163' x2='130' y2='178'/><line x1='130' y1='178' x2='141' y2='178'/>
    <circle cx='130' cy='178' r='2' fill='rgba(255,255,255,0.11)'/>
    <polygon points='45,170 47,177 55,177 49,182 51,189 45,185 39,189 41,182 35,177 43,177'/>
    <path d='M237,336 A15,15 0 0,1 261,336'/><rect x='233' y='336' width='7' height='11' rx='2.5'/><rect x='260' y='336' width='7' height='11' rx='2.5'/>
    <line x1='324' y1='100' x2='352' y2='94'/><line x1='324' y1='94' x2='352' y2='88'/><line x1='324' y1='88' x2='324' y2='108'/>
    <circle cx='319' cy='108' r='5' fill='rgba(255,255,255,0.11)'/><line x1='352' y1='82' x2='352' y2='102'/>
    <circle cx='347' cy='102' r='5' fill='rgba(255,255,255,0.11)'/>
    <circle cx='195' cy='215' r='18'/><circle cx='189' cy='210' r='2' fill='rgba(255,255,255,0.11)'/>
    <circle cx='201' cy='210' r='2' fill='rgba(255,255,255,0.11)'/><path d='M187,220 Q195,228 203,220'/>
    <path d='M88,92 C88,86 80,84 80,90 C80,84 72,86 72,92 C72,97 80,103 80,103 C80,103 88,97 88,92 Z'/>
  </g>
</svg>`;

const WALLPAPER_BG_URL = `url("data:image/svg+xml,${WALLPAPER_SVG_RAW.replace(
  /#/g,
  "%23"
).replace(/\n\s*/g, " ")}")`;

// ─── Waveform cache ───────────────────────────────────────────────────────────
const waveformCache = new Map<string, number[]>();
function getWaveform(seed: string, bars = 28): number[] {
  if (waveformCache.has(seed)) return waveformCache.get(seed)!;
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) + hash + seed.charCodeAt(i);
    hash = hash & 0x7fffffff;
  }
  const result: number[] = [];
  for (let i = 0; i < bars; i++) {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    const normalized = (hash % 1000) / 1000;
    const pos = i / bars;
    const envelope = 0.35 + 0.65 * Math.sin(pos * Math.PI);
    result.push(Math.max(0.08, Math.min(0.95, normalized * envelope + 0.08)));
  }
  waveformCache.set(seed, result);
  return result;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}
interface Message {
  _id: string;
  senderId: User;
  recipientId: User;
  type: "text" | "voice" | "image";
  content: string;
  voiceUrl?: string;
  voiceDuration?: number;
  imageUrl?: string;
  isRead: boolean;
  createdAt: string;
}
interface Conversation {
  conversationWith: User;
  lastMessage: Message;
  unreadCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

const formatDate = (date: string): string => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const formatLastSeen = (lastActiveAt: string | null): string => {
  if (!lastActiveAt) return "last seen recently";
  const diffMins = Math.floor(
    (Date.now() - new Date(lastActiveAt).getTime()) / 60_000
  );
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "last seen just now";
  if (diffMins < 60)
    return `last seen ${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  if (diffHours < 24)
    return `last seen ${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays === 1) return "last seen yesterday";
  if (diffDays < 7) return `last seen ${diffDays} days ago`;
  return `last seen ${new Date(lastActiveAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
};

const formatAudioTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const LOCK_THRESHOLD = 80; // px upward   → lock into hands-free mode
const CANCEL_THRESHOLD = 80; // px leftward → cancel recording

// ─────────────────────────────────────────────────────────────────────────────
export default function MessagesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [viewingImage, setViewingImage] = useState<{
    url: string;
    content: string;
  } | null>(null);
  const [recipientStatus, setRecipientStatus] = useState<{
    isOnline: boolean;
    lastActiveAt: string | null;
  }>({ isOnline: false, lastActiveAt: null });
  const [justSentVoice, setJustSentVoice] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>(
    {}
  );

  // ── Hold-to-record: rendering state ──────────────────────────────────────
  const [holdState, setHoldState] = useState<"idle" | "holding" | "locked">(
    "idle"
  );
  const [slideUp, setSlideUp] = useState(0);
  const [slideLeft, setSlideLeft] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const touchStartYRef = useRef(0);
  const prevLengthRef = useRef(0);
  const userScrolledRef = useRef(false);
  const userRef = useRef<User | null>(null);
  const pullThreshold = 80;

  // ── Refs for pointer handlers — always current, zero stale-closure risk ──
  const holdStateRef = useRef<"idle" | "holding" | "locked">("idle");
  const recordOriginRef = useRef({ x: 0, y: 0 });
  const autoSendRef = useRef(false);
  const selectedUserRef = useRef<User | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  const voiceRecorder = useVoiceRecorder();
  const vrRef = useRef(voiceRecorder);
  useEffect(() => {
    vrRef.current = voiceRecorder;
  }, [voiceRecorder]);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  const applyHoldState = useCallback((s: "idle" | "holding" | "locked") => {
    console.log("🎯 Hold state change:", holdStateRef.current, "→", s);
    holdStateRef.current = s;
    setHoldState(s);
  }, []);

  // ── Fetch helpers ─────────────────────────────────────────────────────────
  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        const u = { ...data.user, _id: data.user.id };
        setUser(u);
        userRef.current = u;
      }
    } catch {}
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/messages", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations ?? []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users ?? []);
      }
    } catch {}
  }, []);

  const markAsRead = useCallback(
    async (ids: string[]) => {
      try {
        await fetch("/api/messages", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ messageIds: ids }),
        });
        fetchConversations();
      } catch {}
    },
    [fetchConversations]
  );

  const fetchMessages = useCallback(
    async (userId: string, silent = false) => {
      try {
        const res = await fetch(`/api/messages?userId=${userId}`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        setMessages(data.messages ?? []);
        const unreadIds: string[] = (data.messages as Message[])
          .filter(
            (m) => !m.isRead && m.recipientId._id === userRef.current?._id
          )
          .map((m) => m._id);
        if (unreadIds.length > 0) markAsRead(unreadIds);
      } catch {
        if (!silent) console.error("Failed to fetch messages");
      }
    },
    [markAsRead]
  );

  const fetchRecipientStatus = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}/status`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setRecipientStatus({
          isOnline: data.isOnline,
          lastActiveAt: data.lastActiveAt,
        });
      }
    } catch {}
  }, []);

  const sendActivityPing = useCallback(async () => {
    try {
      await fetch("/api/users/activity", {
        method: "POST",
        credentials: "include",
      });
    } catch {}
  }, []);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSendMessage = useCallback(async () => {
    const su = selectedUserRef.current;
    const vr = vrRef.current;
    if (!su || (!message.trim() && !vr.audioBlob && !selectedImage)) return;

    setSending(true);
    userScrolledRef.current = false;

    const hasVoice = !!vr.audioBlob;
    const voiceBlob = vr.audioBlob;
    const voiceDur = vr.duration;
    if ("vibrate" in navigator) navigator.vibrate(10);

    try {
      let body: any = {
        recipientId: su._id,
        type: "text",
        content: message.trim(),
      };

      if (selectedImage) {
        const fd = new FormData();
        fd.append("file", selectedImage);
        fd.append("type", "image");
        const up = await fetch("/api/upload", {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        if (!up.ok) throw new Error("Failed to upload image");
        const { url } = await up.json();
        body = {
          recipientId: su._id,
          type: "image",
          content: message.trim() || "Image",
          imageUrl: url,
        };
      } else if (hasVoice && voiceBlob) {
        const fd = new FormData();
        fd.append("file", voiceBlob, "voice-note.webm");
        fd.append("type", "voice");
        const up = await fetch("/api/upload", {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        if (!up.ok) throw new Error("Failed to upload voice");
        const { url } = await up.json();
        body = {
          recipientId: su._id,
          type: "voice",
          content: `Voice message (${voiceDur}s)`,
          voiceUrl: url,
          voiceDuration: voiceDur,
        };
      }

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to send");

      if (hasVoice) setJustSentVoice(true);
      setMessage("");
      setSelectedImage(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      vr.cancelRecording();

      await fetchMessages(su._id);
      await fetchConversations();
      if (hasVoice) setTimeout(() => setJustSentVoice(false), 300);
    } catch {
      toast.error("Failed to send message");
      setJustSentVoice(false);
    } finally {
      setSending(false);
    }
  }, [message, selectedImage, fetchMessages, fetchConversations]);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchUser();
    fetchConversations();
    fetchUsers();
    sendActivityPing();
    const activityId = setInterval(sendActivityPing, 60_000);
    return () => clearInterval(activityId);
  }, [fetchUser, fetchConversations, fetchUsers, sendActivityPing]);

  useEffect(() => {
    if (!selectedUser) {
      const id = setInterval(fetchConversations, 30_000);
      return () => clearInterval(id);
    }
    const run = () => {
      fetchMessages(selectedUser._id, true);
      fetchRecipientStatus(selectedUser._id);
    };
    run();
    fetchConversations();
    const msgId = setInterval(run, 30_000);
    const convId = setInterval(fetchConversations, 60_000);
    const onVisibility = () => {
      if (!document.hidden) run();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(msgId);
      clearInterval(convId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [selectedUser, fetchMessages, fetchConversations, fetchRecipientStatus]);

  useEffect(() => {
    const isInitial = prevLengthRef.current === 0 && messages.length > 0;
    const isNew = messages.length > prevLengthRef.current;
    if (isInitial) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      userScrolledRef.current = false;
    } else if (isNew && !userScrolledRef.current) {
      const c = messagesContainerRef.current;
      if (c) {
        const dist = c.scrollHeight - c.scrollTop - c.clientHeight;
        if (dist < 150)
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
    prevLengthRef.current = messages.length;
  }, [messages]);

  useEffect(() => {
    if (voiceRecorder.error) {
      console.error("🎤 Voice recorder error:", voiceRecorder.error);
      toast.error(voiceRecorder.error);
    }
  }, [voiceRecorder.error]);

  useEffect(() => {
    if (autoSendRef.current && voiceRecorder.audioBlob) {
      console.log("✅ Auto-sending voice message");
      autoSendRef.current = false;
      handleSendMessage();
    }
  }, [voiceRecorder.audioBlob, handleSendMessage]);

  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth >= 768) return;
    document.documentElement.style.overflow = selectedUser ? "hidden" : "";
    document.body.style.overflow = selectedUser ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [selectedUser]);

  // ── Scroll / pull-to-refresh ──────────────────────────────────────────────
  const handleScroll = useCallback(() => {
    const c = messagesContainerRef.current;
    if (!c) return;
    const distFromBottom = c.scrollHeight - c.scrollTop - c.clientHeight;
    userScrolledRef.current = distFromBottom > 150;
    setShowScrollButton(distFromBottom > 200);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const c = messagesContainerRef.current;
    if (!c || c.scrollTop > 0) return;
    touchStartYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const c = messagesContainerRef.current;
    if (!c) return;
    const dist = e.touches[0].clientY - touchStartYRef.current;
    if (c.scrollTop <= 0 && dist > 0) {
      e.stopPropagation();
      if (dist < pullThreshold * 1.5) {
        setPullDistance(dist);
        setIsPulling(true);
      }
    }
  }, []);

  const handleManualRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    if ("vibrate" in navigator) navigator.vibrate([10, 50, 10]);
    try {
      const su = selectedUserRef.current;
      if (su)
        await Promise.all([
          fetchMessages(su._id, true),
          fetchRecipientStatus(su._id),
        ]);
      await fetchConversations();
    } catch {
      toast.error("Failed to refresh");
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  }, [isRefreshing, fetchMessages, fetchRecipientStatus, fetchConversations]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > pullThreshold) await handleManualRefresh();
    setIsPulling(false);
    setPullDistance(0);
  }, [pullDistance, handleManualRefresh]);

  // ── Conversation ──────────────────────────────────────────────────────────
  const handleSelectUser = useCallback((u: User) => {
    setSelectedUser(u);
    setShowSidebar(false);
    userScrolledRef.current = false;
    prevLengthRef.current = 0;
    if ("vibrate" in navigator) navigator.vibrate(10);
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedUser(null);
    setShowSidebar(true);
  }, []);

  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    },
    []
  );

  const handleLongPress = useCallback((msg: Message) => {
    setSelectedMessage(msg);
    if ("vibrate" in navigator) navigator.vibrate(50);
  }, []);

  const handleCopyMessage = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard");
      setSelectedMessage(null);
    } catch {
      toast.error("Failed to copy");
    }
  }, []);

  // ── Audio playback ────────────────────────────────────────────────────────
  const handleAudioTimeUpdate = useCallback(() => {
    if (!audioRef.current || !playingId) return;
    const progress =
      (audioRef.current.currentTime / audioRef.current.duration) * 100;
    setAudioProgress((prev) => ({ ...prev, [playingId]: progress }));
  }, [playingId]);

  const handleAudioEnded = useCallback(() => {
    if (playingId) setAudioProgress((prev) => ({ ...prev, [playingId]: 0 }));
    setPlayingId(null);
  }, [playingId]);

  const playVoiceMessage = useCallback(
    (id: string, url: string) => {
      if (playingId === id) {
        audioRef.current?.pause();
        setPlayingId(null);
        return;
      }
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current
          .play()
          .catch(() => toast.error("Failed to play voice message"));
      }
      setPlayingId(id);
    },
    [playingId]
  );

  const handleImageView = useCallback((url: string, content: string) => {
    setViewingImage({ url, content });
    setImageZoom(1);
  }, []);

  const handleImageDownload = useCallback(
    async (url: string, content: string) => {
      const id = toast.loading("Downloading image...");
      try {
        const blob = await (await fetch(url)).blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download =
          content && content !== "Image"
            ? `${content.substring(0, 20)}-${Date.now()}.jpg`
            : `image-${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
        toast.dismiss(id);
        toast.success("Image downloaded");
      } catch {
        toast.dismiss(id);
        toast.error("Failed to download image");
      }
    },
    []
  );

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  }, []);

  // ── FIXED: Hold-to-record handlers with document-level listeners ─────────

  const recordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMicPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      console.log("🎤 Pointer down - ID:", e.pointerId);
      e.preventDefault();
      e.stopPropagation();

      pointerIdRef.current = e.pointerId;
      recordOriginRef.current = { x: e.clientX, y: e.clientY };

      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        console.log("✓ Pointer captured");
      } catch (err) {
        console.error("❌ Failed to capture pointer:", err);
      }

      // ⭐ KEY FIX: Wait 300ms before starting recording
      const holdTimer = setTimeout(() => {
        console.log("⏱️ Hold timer fired - starting recording");
        recordTimerRef.current = null; // ⭐ CRITICAL: Clear the ref so pointer up knows recording started
        applyHoldState("holding");
        setSlideUp(0);
        setSlideLeft(0);

        vrRef.current
          .startRecording()
          .then(() => {
            console.log("✓ Recording started successfully");
            if ("vibrate" in navigator) navigator.vibrate(15);
          })
          .catch((err: Error) => {
            console.error("❌ Failed to start recording:", err);
            toast.error("Microphone access denied");
            applyHoldState("idle");
          });
      }, 300);

      recordTimerRef.current = holdTimer;
    },
    [applyHoldState]
  );

  // ⭐ NEW: Document-level listeners for reliable pointer tracking
  useEffect(() => {
    const handleDocumentPointerMove = (e: PointerEvent) => {
      // Only track if this is our active pointer
      if (
        pointerIdRef.current === null ||
        e.pointerId !== pointerIdRef.current
      ) {
        return;
      }

      // Only track movement during holding state
      if (holdStateRef.current !== "holding") {
        return;
      }

      const dy = recordOriginRef.current.y - e.clientY;
      const dx = recordOriginRef.current.x - e.clientX;

      const newSlideUp = Math.max(0, dy);
      const newSlideLeft = Math.max(0, dx);

      setSlideUp(newSlideUp);
      setSlideLeft(newSlideLeft);

      // Log every 20px of movement for debugging
      if (Math.abs(dy) > 20 && Math.abs(dy) % 20 < 5) {
        console.log(
          `📍 Slide: up=${Math.round(newSlideUp)}px, left=${Math.round(
            newSlideLeft
          )}px`
        );
      }

      if (newSlideUp > LOCK_THRESHOLD) {
        console.log("🔒 Locking into hands-free mode");
        applyHoldState("locked");
        setSlideUp(0);
        setSlideLeft(0);
        if ("vibrate" in navigator) navigator.vibrate([10, 40, 10]);
      }
    };

    const handleDocumentPointerUp = (e: PointerEvent) => {
      // Only handle if we have an active pointer
      if (
        pointerIdRef.current === null ||
        e.pointerId !== pointerIdRef.current
      ) {
        return;
      }

      console.log(
        "🎤 Document pointer up - ID:",
        e.pointerId,
        "State:",
        holdStateRef.current
      );

      // Clear timer if it exists
      if (recordTimerRef.current) {
        console.log("⏱️ Canceling hold timer - was just a quick tap");
        clearTimeout(recordTimerRef.current);
        recordTimerRef.current = null;
        pointerIdRef.current = null;
        return;
      }

      const currentState = holdStateRef.current;
      pointerIdRef.current = null;

      // If not holding, nothing to do
      if (currentState !== "holding") {
        console.log("ℹ️ Not in holding state, ignoring");
        return;
      }

      const dx = recordOriginRef.current.x - e.clientX;

      if (dx > CANCEL_THRESHOLD) {
        console.log("❌ Canceling recording (slid left)");
        vrRef.current.cancelRecording();
      } else {
        console.log("✅ Stopping recording (normal release)");
        autoSendRef.current = true;
        vrRef.current.stopRecording();
      }

      applyHoldState("idle");
      setSlideUp(0);
      setSlideLeft(0);
    };

    const handleDocumentPointerCancel = (e: PointerEvent) => {
      if (
        pointerIdRef.current === null ||
        e.pointerId !== pointerIdRef.current
      ) {
        return;
      }

      console.log("🎤 Document pointer cancel");

      if (recordTimerRef.current) {
        clearTimeout(recordTimerRef.current);
        recordTimerRef.current = null;
      }

      pointerIdRef.current = null;

      if (holdStateRef.current !== "idle") {
        vrRef.current.cancelRecording();
        applyHoldState("idle");
        setSlideUp(0);
        setSlideLeft(0);
      }
    };

    // Add document-level listeners
    document.addEventListener("pointermove", handleDocumentPointerMove);
    document.addEventListener("pointerup", handleDocumentPointerUp);
    document.addEventListener("pointercancel", handleDocumentPointerCancel);

    return () => {
      document.removeEventListener("pointermove", handleDocumentPointerMove);
      document.removeEventListener("pointerup", handleDocumentPointerUp);
      document.removeEventListener(
        "pointercancel",
        handleDocumentPointerCancel
      );
      if (recordTimerRef.current) {
        clearTimeout(recordTimerRef.current);
        recordTimerRef.current = null;
      }
    };
  }, [applyHoldState]);

  // ⭐ NEW: Emergency cancel
  const handleEmergencyCancel = useCallback(() => {
    console.log("🚨 EMERGENCY CANCEL");
    if (holdStateRef.current !== "idle") {
      vrRef.current.cancelRecording();
      applyHoldState("idle");
      setSlideUp(0);
      setSlideLeft(0);
      if ("vibrate" in navigator) navigator.vibrate(50);
      toast.success("Recording canceled");
    }
  }, [applyHoldState]);

  const handleLockedCancel = useCallback(() => {
    console.log("🗑️ Canceling locked recording");
    vrRef.current.cancelRecording();
    applyHoldState("idle");
  }, [applyHoldState]);

  const handleLockedSend = useCallback(() => {
    console.log("📤 Sending locked recording");
    autoSendRef.current = true;
    vrRef.current.stopRecording();
    applyHoldState("idle");
  }, [applyHoldState]);

  // ── Filtered users ────────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return users.filter(
      (u) =>
        u._id !== user?._id &&
        (u.firstName?.toLowerCase().includes(q) ||
          u.lastName?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q))
    );
  }, [users, user, searchTerm]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="flex flex-col bg-[#050505] messages-container-height overflow-hidden">
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* ── Sidebar ──────────────────────────────────────────────────── */}
          <div
            className={`${
              showSidebar ? "flex" : "hidden"
            } md:flex w-full md:w-80 bg-black border-r border-gray-800 flex-col overflow-hidden`}
          >
            <div className="p-3 md:p-4 border-b border-gray-800 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search users..."
                    className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-sm"
                    style={{ fontSize: "16px" }}
                  />
                </div>
                <button
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="p-2 text-white/80 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 active:scale-95 flex-shrink-0 touch-manipulation"
                >
                  <RefreshCw
                    className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
            </div>

            <div
              className="flex-1 overflow-y-auto min-h-0"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {(searchTerm
                ? filteredUsers.map((u) => ({
                    user: u,
                    conv: null as Conversation | null,
                  }))
                : conversations.map((c) => ({
                    user: c.conversationWith,
                    conv: c,
                  }))
              ).map(({ user: u, conv }) => (
                <button
                  key={u._id}
                  onClick={() => handleSelectUser(u)}
                  className={`w-full p-3 md:p-4 flex items-center space-x-3 hover:bg-gray-900 border-b border-gray-800 transition-colors active:bg-gray-800 touch-manipulation ${
                    selectedUser?._id === u._id ? "bg-gray-900" : ""
                  }`}
                >
                  <div className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-[#E84545]/20 flex items-center justify-center border border-[#E84545]/30 flex-shrink-0">
                    <span className="text-[#E84545] font-semibold text-sm md:text-base">
                      {u.firstName?.[0]}
                      {u.lastName?.[0]}
                    </span>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    {conv ? (
                      <>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-white font-medium truncate text-sm md:text-base">
                            {u.firstName} {u.lastName}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-[#E84545] text-white text-xs rounded-full flex-shrink-0 min-w-[1.25rem] text-center">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-500 text-xs md:text-sm truncate">
                          {conv.lastMessage.type === "voice"
                            ? "🎤 Voice message"
                            : conv.lastMessage.type === "image"
                            ? "📷 Image"
                            : conv.lastMessage.content}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-white font-medium text-sm md:text-base truncate">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="text-gray-500 text-xs md:text-sm truncate">
                          {u.role}
                        </p>
                      </>
                    )}
                  </div>
                </button>
              ))}
              {!loading && conversations.length === 0 && !searchTerm && (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <MessageCircle className="h-12 w-12 md:h-16 md:w-16 text-gray-700 mb-4" />
                  <p className="text-gray-500 text-sm md:text-base">
                    No conversations yet
                  </p>
                  <p className="text-gray-600 text-xs md:text-sm mt-2">
                    Search for users to start messaging
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Chat area ─────────────────────────────────────────────────── */}
          <div
            className={`${
              !selectedUser ? "hidden" : "flex"
            } md:flex flex-1 flex-col bg-black relative overflow-hidden min-h-0`}
          >
            {selectedUser ? (
              <>
                {/* Header */}
                <div className="p-2 mt-12 md:mt-0 border-b border-gray-800 bg-black flex-shrink-0">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleBackToList}
                      className="md:hidden p-2 hover:bg-gray-800 rounded-lg active:bg-gray-700 active:scale-95 touch-manipulation"
                    >
                      <ArrowLeft className="h-5 w-5 text-white" />
                    </button>
                    <div className="w-9 h-9 rounded-full bg-[#E84545]/20 flex items-center justify-center border border-[#E84545]/30">
                      <span className="text-[#E84545] font-semibold text-sm">
                        {selectedUser.firstName?.[0]}
                        {selectedUser.lastName?.[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">
                        {selectedUser.firstName} {selectedUser.lastName}
                      </p>
                      <div className="flex items-center space-x-1.5">
                        {recipientStatus.isOnline ? (
                          <>
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <p className="text-green-400 text-xs font-medium">
                              online
                            </p>
                          </>
                        ) : (
                          <p className="text-gray-400 text-xs truncate">
                            {formatLastSeen(recipientStatus.lastActiveAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pull-to-refresh indicator */}
                {isPulling && (
                  <div
                    className="absolute top-16 left-1/2 z-10 transition-all"
                    style={{
                      opacity: Math.min(pullDistance / pullThreshold, 1),
                      transform: `translateX(-50%) translateY(${Math.min(
                        pullDistance / 2,
                        40
                      )}px)`,
                    }}
                  >
                    <div className="bg-gray-800 rounded-full p-2">
                      <RefreshCw
                        className={`h-5 w-5 text-white ${
                          pullDistance > pullThreshold ? "animate-spin" : ""
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* Messages list */}
                <div
                  ref={messagesContainerRef}
                  onScroll={handleScroll}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className="flex-1 overflow-y-auto min-h-0 p-3 md:p-4 space-y-2 md:space-y-3"
                  style={{
                    WebkitOverflowScrolling: "touch",
                    overscrollBehavior: "contain",
                    touchAction: "pan-y",
                    backgroundImage: WALLPAPER_BG_URL,
                    backgroundSize: "380px 380px",
                    backgroundRepeat: "repeat",
                  }}
                >
                  {messages.map((msg, index) => {
                    const isMe = !!user && msg.senderId._id === user._id;
                    const showDate =
                      index === 0 ||
                      formatDate(messages[index - 1].createdAt) !==
                        formatDate(msg.createdAt);
                    const waveform =
                      msg.type === "voice" ? getWaveform(msg._id) : null;
                    return (
                      <div key={msg._id}>
                        {showDate && (
                          <div className="flex justify-center my-2 md:my-3">
                            <span className="px-3 py-1 bg-gray-800 text-gray-400 text-xs rounded-full">
                              {formatDate(msg.createdAt)}
                            </span>
                          </div>
                        )}
                        <div
                          className={`flex ${
                            isMe ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            onContextMenu={(e) => {
                              e.preventDefault();
                              handleLongPress(msg);
                            }}
                            onTouchStart={(e) => {
                              const el = e.currentTarget;
                              let t: ReturnType<typeof setTimeout> | null =
                                null;
                              const clear = () => {
                                if (t) clearTimeout(t);
                                el.removeEventListener("touchend", clear);
                                el.removeEventListener("touchmove", clear);
                              };
                              t = setTimeout(() => handleLongPress(msg), 500);
                              el.addEventListener("touchend", clear, {
                                once: true,
                              });
                              el.addEventListener("touchmove", clear, {
                                once: true,
                              });
                            }}
                            className={`${
                              msg.type === "voice"
                                ? "max-w-[92%] md:max-w-sm px-3 py-3"
                                : "max-w-[85%] md:max-w-md px-3 md:px-4 py-2"
                            } rounded-2xl ${
                              isMe
                                ? "bg-[#005C4B] text-white rounded-br-md"
                                : "bg-gray-800 text-white rounded-bl-md"
                            }`}
                          >
                            {msg.type === "image" ? (
                              <div className="space-y-2">
                                <img
                                  src={msg.imageUrl}
                                  alt="Shared image"
                                  className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity active:opacity-75"
                                  onClick={() =>
                                    handleImageView(msg.imageUrl!, msg.content)
                                  }
                                />
                                {msg.content && msg.content !== "Image" && (
                                  <p className="text-sm">{msg.content}</p>
                                )}
                              </div>
                            ) : msg.type === "voice" && waveform ? (
                              <div className="space-y-1.5 min-w-[220px]">
                                <div className="flex items-center space-x-2.5">
                                  {isMe && (
                                    <div className="relative flex-shrink-0">
                                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/10">
                                        <span className="text-white font-semibold text-xs">
                                          {user?.firstName?.[0]}
                                          {user?.lastName?.[0]}
                                        </span>
                                      </div>
                                      <div className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] bg-[#2196F3] rounded-full flex items-center justify-center border-2 border-[#005C4B]">
                                        <Mic className="h-2.5 w-2.5 text-white" />
                                      </div>
                                    </div>
                                  )}
                                  <button
                                    onClick={() =>
                                      playVoiceMessage(
                                        msg._id,
                                        msg.voiceUrl ?? ""
                                      )
                                    }
                                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center hover:opacity-75 active:scale-90 touch-manipulation transition-transform"
                                  >
                                    {playingId === msg._id ? (
                                      <Pause className="h-5 w-5 text-white fill-white" />
                                    ) : (
                                      <Play className="h-5 w-5 text-white fill-white" />
                                    )}
                                  </button>
                                  <div className="flex-1 relative h-9 flex items-center">
                                    <div className="flex items-center justify-between w-full h-full gap-[2px]">
                                      {waveform.map((height, i) => {
                                        const played =
                                          (i / (waveform.length - 1)) * 100 <=
                                          (audioProgress[msg._id] ?? 0);
                                        return (
                                          <div
                                            key={i}
                                            className={`rounded-full flex-1 transition-colors duration-100 ${
                                              played
                                                ? "bg-white"
                                                : "bg-white/35"
                                            }`}
                                            style={{
                                              height: `${Math.max(
                                                12,
                                                height * 100
                                              )}%`,
                                            }}
                                          />
                                        );
                                      })}
                                    </div>
                                    <div
                                      className="absolute w-3 h-3 bg-[#64B5F6] rounded-full shadow-md pointer-events-none"
                                      style={{
                                        left: `${audioProgress[msg._id] ?? 0}%`,
                                        top: "50%",
                                        transform:
                                          "translateX(-50%) translateY(-50%)",
                                        transition: "left 0.1s linear",
                                      }}
                                    />
                                  </div>
                                  {!isMe && (
                                    <div className="relative flex-shrink-0">
                                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/10">
                                        <span className="text-white font-semibold text-xs">
                                          {msg.senderId.firstName?.[0]}
                                          {msg.senderId.lastName?.[0]}
                                        </span>
                                      </div>
                                      <div className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] bg-[#2196F3] rounded-full flex items-center justify-center border-2 border-gray-800">
                                        <Mic className="h-2.5 w-2.5 text-white" />
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center justify-between px-0.5">
                                  <span className="text-[11px] text-white/60 font-mono tabular-nums">
                                    {playingId === msg._id && audioRef.current
                                      ? formatAudioTime(
                                          audioRef.current.currentTime
                                        )
                                      : formatAudioTime(msg.voiceDuration ?? 0)}
                                  </span>
                                  <div className="flex items-center space-x-1">
                                    <span className="text-[10px] text-white/60">
                                      {formatTime(msg.createdAt)}
                                    </span>
                                    {isMe &&
                                      (msg.isRead ? (
                                        <CheckCheck className="h-3.5 w-3.5 text-[#53BDEB]" />
                                      ) : (
                                        <Check className="h-3.5 w-3.5 text-gray-400" />
                                      ))}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm md:text-base break-words whitespace-pre-wrap">
                                {msg.content}
                              </p>
                            )}
                            {msg.type !== "voice" && (
                              <div className="flex items-center justify-between mt-1 space-x-2">
                                <span className="text-[10px] md:text-xs opacity-70">
                                  {formatTime(msg.createdAt)}
                                </span>
                                {isMe &&
                                  (msg.isRead ? (
                                    <CheckCheck className="h-3.5 w-3.5 md:h-4 md:w-4 text-[#53BDEB]" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5 md:h-4 md:w-4 text-gray-400" />
                                  ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                  <div className="h-4 md:h-0" />
                </div>

                {showScrollButton && (
                  <button
                    onClick={() =>
                      messagesEndRef.current?.scrollIntoView({
                        behavior: "smooth",
                      })
                    }
                    className="absolute bottom-28 md:bottom-24 right-4 p-3 bg-[#2e3333] text-white rounded-full shadow-lg hover:bg-[#cc3c3c] active:bg-[#b33535] active:scale-95 transition-all z-10 touch-manipulation"
                  >
                    <ChevronDown className="h-5 w-5" />
                  </button>
                )}

                <audio
                  ref={audioRef}
                  onTimeUpdate={handleAudioTimeUpdate}
                  onEnded={handleAudioEnded}
                />

                {/* ─── Input bar ────────────────────────────────────────── */}
                <div
                  className="bg-[#111112] border-t border-white/5 flex-shrink-0"
                  style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
                >
                  <div className="px-1 py-2">
                    {/* HOLDING — finger still pressed */}
                    {holdState === "holding" && (
                      <div className="flex items-center h-14 px-2 gap-2 select-none">
                        {/* Cancel hint (left) */}
                        <div
                          className="flex items-center gap-1 flex-shrink-0 transition-opacity duration-75"
                          style={{
                            opacity: Math.max(
                              0.18,
                              Math.min(1, slideLeft / (CANCEL_THRESHOLD * 0.55))
                            ),
                          }}
                        >
                          <ChevronLeft className="h-4 w-4 text-gray-300" />
                          <span className="text-gray-300 text-xs whitespace-nowrap">
                            Cancel
                          </span>
                        </div>

                        {/* Timer */}
                        <div className="flex-1 flex items-center justify-center gap-2.5 bg-[#1F2023] rounded-full px-4 py-2.5 border border-white/5">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                          <span className="text-white font-mono tabular-nums text-sm">
                            {formatAudioTime(voiceRecorder.duration)}
                          </span>
                        </div>

                        {/* Lock hint (up) */}
                        <div
                          className="flex flex-col items-center gap-0.5 flex-shrink-0 transition-opacity duration-75"
                          style={{
                            opacity: Math.max(
                              0.18,
                              Math.min(1, slideUp / (LOCK_THRESHOLD * 0.55))
                            ),
                          }}
                        >
                          <Lock className="h-4 w-4 text-gray-300" />
                          <ChevronUp className="h-3 w-3 text-gray-300" />
                        </div>

                        {/* ⭐ NEW: Emergency cancel button */}
                        <button
                          onClick={handleEmergencyCancel}
                          className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-red-400 hover:text-red-300 active:scale-90 touch-manipulation transition-all"
                        >
                          <X className="h-5 w-5" strokeWidth={2.5} />
                        </button>
                      </div>
                    )}

                    {/* LOCKED — hands-free mode */}
                    {holdState === "locked" && (
                      <div className="flex items-center gap-2.5 select-none">
                        <button
                          onClick={handleLockedCancel}
                          className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-white/70 hover:text-red-400 active:scale-90 touch-manipulation transition-all"
                        >
                          <Trash2 className="h-[22px] w-[22px]" />
                        </button>
                        <div className="flex-1 flex items-center gap-2.5 bg-[#1F2023] rounded-full px-4 py-2.5 border border-[#E84545]/30">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                          <span className="text-white text-[15px] font-mono tabular-nums">
                            {formatAudioTime(voiceRecorder.duration)}
                          </span>
                          <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500 rounded-full animate-pulse w-full" />
                          </div>
                          <Lock className="h-3.5 w-3.5 text-[#E84545] flex-shrink-0" />
                        </div>
                        <button
                          onClick={handleLockedSend}
                          className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-white hover:text-white/80 active:scale-90 touch-manipulation transition-transform"
                        >
                          <Send className="h-5 w-5" />
                        </button>
                      </div>
                    )}

                    {/* IDLE — normal input */}
                    {holdState === "idle" && (
                      <>
                        {imagePreview && (
                          <div className="mb-2 md:mb-3 relative inline-block">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="max-h-20 md:max-h-32 rounded-lg"
                            />
                            <button
                              onClick={() => {
                                setSelectedImage(null);
                                setImagePreview(null);
                                if (fileInputRef.current)
                                  fileInputRef.current.value = "";
                              }}
                              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 active:scale-95 touch-manipulation"
                            >
                              <X className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            </button>
                          </div>
                        )}

                        {voiceRecorder.audioBlob && !justSentVoice ? (
                          /* Voice preview */
                          <div className="flex items-center gap-2.5">
                            <button
                              onClick={() => vrRef.current.cancelRecording()}
                              className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-white/70 hover:text-red-400 active:scale-90 touch-manipulation transition-all"
                            >
                              <Trash2 className="h-[22px] w-[22px]" />
                            </button>
                            <div className="flex-1 flex items-center gap-2.5 bg-[#1F2023] rounded-full px-4 py-2.5 border border-white/5">
                              <Play className="h-4 w-4 text-white/70 flex-shrink-0" />
                              <div className="flex-1 h-1 bg-gray-600 rounded-full">
                                <div className="h-1 bg-white rounded-full w-0" />
                              </div>
                              <span className="text-white/70 text-[13px] font-mono tabular-nums flex-shrink-0">
                                {formatAudioTime(voiceRecorder.duration)}
                              </span>
                            </div>
                            <button
                              onClick={handleSendMessage}
                              disabled={sending}
                              className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-white hover:text-white/80 active:scale-90 disabled:opacity-50 touch-manipulation transition-transform"
                            >
                              <Send className="h-5 w-5" />
                            </button>
                          </div>
                        ) : (
                          /* Normal text / camera / mic row */
                          <div className="flex items-center gap-3">
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleImageSelect}
                              accept="image/*"
                              className="hidden"
                            />
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-white/70 hover:text-white active:scale-90 touch-manipulation transition-transform ml-1 "
                            >
                              <Camera className="h-6 w-6" strokeWidth={2.2} />
                            </button>

                            <div className="flex-1 flex items-center bg-[#1F2023] rounded-full px-4 py-0 min-w-0 border border-white/5">
                              <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                  }
                                }}
                                placeholder="Type a message"
                                className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none py-2.5 text-[15px] min-w-0"
                                style={{ fontSize: "16px" }}
                              />
                            </div>

                            {message.trim() || selectedImage ? (
                              <button
                                onClick={handleSendMessage}
                                disabled={sending}
                                className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-white hover:text-white/80 active:scale-90 disabled:opacity-50 touch-manipulation transition-transform mr-2"
                              >
                                <Send className="h-5 w-5" />
                              </button>
                            ) : (
                              <>
                                {/* <button
                                  onClick={() => fileInputRef.current?.click()}
                                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-white/70 hover:text-white active:scale-90 touch-manipulation transition-transform"
                                >
                                  <Camera
                                    className="h-[22px] w-[22px]"
                                    strokeWidth={1.6}
                                  />
                                </button> */}
                                {/* ⭐ FIXED: Mic button - only pointerDown, move/up handled at document level */}
                                <button
                                  onPointerDown={handleMicPointerDown}
                                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center 
             text-white/70 active:text-[#E84545] active:scale-110 
             transition-all select-none ml-6 mr-8"
                                  style={{
                                    touchAction: "none",
                                    userSelect: "none",
                                    cursor: "pointer",
                                  }}
                                >
                                  <Mic
                                    className="h-[28px] w-[28px]"
                                    strokeWidth={1.8}
                                  />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 p-4">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-base md:text-lg">
                    Select a conversation to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Message Options Modal */}
      {selectedMessage && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedMessage(null)}
        >
          <div
            className="bg-gray-900 rounded-2xl w-full md:w-96 overflow-hidden animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
            style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            <div className="p-4 border-b border-gray-800">
              <p className="text-white font-medium">Message Options</p>
            </div>
            <div className="p-2">
              {selectedMessage.type === "text" && (
                <button
                  onClick={() => handleCopyMessage(selectedMessage.content)}
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-800 rounded-lg transition-colors text-left active:bg-gray-700 touch-manipulation"
                >
                  <Copy className="h-5 w-5 text-gray-400" />
                  <span className="text-white">Copy Text</span>
                </button>
              )}
              {selectedMessage.type === "image" && (
                <button
                  onClick={() => {
                    handleImageDownload(
                      selectedMessage.imageUrl!,
                      selectedMessage.content
                    );
                    setSelectedMessage(null);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-800 rounded-lg transition-colors text-left active:bg-gray-700 touch-manipulation"
                >
                  <Download className="h-5 w-5 text-gray-400" />
                  <span className="text-white">Download Image</span>
                </button>
              )}
              <button
                onClick={() => setSelectedMessage(null)}
                className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-800 rounded-lg transition-colors text-left active:bg-gray-700 touch-manipulation"
              >
                <X className="h-5 w-5 text-gray-400" />
                <span className="text-white">Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer */}
      {viewingImage && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingImage(null);
          }}
        >
          <div className="flex items-center justify-between p-3 md:p-4 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm z-10">
            <button
              onClick={() => setViewingImage(null)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-95 touch-manipulation"
            >
              <X className="h-6 w-6 text-white" />
            </button>
            <button
              onClick={() =>
                handleImageDownload(viewingImage.url, viewingImage.content)
              }
              className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-95 touch-manipulation"
            >
              <Download className="h-6 w-6 text-white" />
            </button>
          </div>
          <div
            className="flex-1 flex items-center justify-center p-4 overflow-hidden touch-none"
            onClick={() => setViewingImage(null)}
          >
            <img
              src={viewingImage.url}
              alt="Full size"
              className="max-w-full max-h-full object-contain select-none"
              style={{
                transform: `scale(${imageZoom})`,
                transition: "transform 0.2s ease-out",
              }}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setImageZoom((z) => (z === 1 ? 2 : 1));
              }}
              draggable={false}
            />
          </div>
          {viewingImage.content && viewingImage.content !== "Image" && (
            <div className="p-3 md:p-4 bg-gradient-to-t from-black/80 to-transparent backdrop-blur-sm">
              <p className="text-white text-center text-sm md:text-base break-words">
                {viewingImage.content}
              </p>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .messages-container-height {
          height: calc(100dvh);
          height: calc(var(--vvh, 100dvh) - 2rem);
        }
        @media (min-width: 768px) {
          .messages-container-height {
            height: 100dvh;
            height: var(--vvh, 100dvh);
          }
        }
      `}</style>
    </MainLayout>
  );
}
