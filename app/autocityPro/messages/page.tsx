// app/autocityPro/messages/page.tsx — WhatsApp-Style Messaging
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
  Camera,
  Lock,
  ChevronUp,
  Smile,
  Paperclip,
  MoreVertical,
  Phone,
  Video,
  Reply,
  Copy,
  Forward,
  Star,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── WhatsApp Wallpaper Pattern ──────────────────────────────────────────────
const WHATSAPP_WALLPAPER = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>
  <defs>
    <pattern id='pattern' x='0' y='0' width='80' height='80' patternUnits='userSpaceOnUse'>
      <rect width='80' height='80' fill='%23ECE5DD'/>
      <path d='M0,40 Q20,35 40,40 T80,40' stroke='%23D9D3CC' fill='none' stroke-width='0.5' opacity='0.3'/>
      <path d='M0,0 Q20,-5 40,0 T80,0' stroke='%23D9D3CC' fill='none' stroke-width='0.5' opacity='0.2'/>
      <circle cx='15' cy='15' r='1' fill='%23D9D3CC' opacity='0.15'/>
      <circle cx='65' cy='65' r='1' fill='%23D9D3CC' opacity='0.15'/>
    </pattern>
  </defs>
  <rect width='400' height='400' fill='url(%23pattern)'/>
</svg>`;

const DARK_WALLPAPER = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>
  <rect width='400' height='400' fill='%230A0E14'/>
  <defs>
    <pattern id='darkpattern' x='0' y='0' width='60' height='60' patternUnits='userSpaceOnUse'>
      <circle cx='10' cy='10' r='1.5' fill='%23ffffff' opacity='0.03'/>
      <circle cx='50' cy='50' r='1' fill='%23ffffff' opacity='0.02'/>
      <path d='M0,30 Q15,28 30,30 T60,30' stroke='%23ffffff' fill='none' stroke-width='0.3' opacity='0.04'/>
    </pattern>
  </defs>
  <rect width='400' height='400' fill='url(%23darkpattern)'/>
</svg>`;

const WALLPAPER_LIGHT = `url("data:image/svg+xml,${WHATSAPP_WALLPAPER.replace(/#/g, "%23").replace(/\n\s*/g, " ")}")`;
const WALLPAPER_DARK = `url("data:image/svg+xml,${DARK_WALLPAPER.replace(/#/g, "%23").replace(/\n\s*/g, " ")}")`;

// ─── Waveform Generator ──────────────────────────────────────────────────────
const waveformCache = new Map<string, number[]>();
function getWaveform(seed: string, bars = 40): number[] {
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
    const envelope = 0.4 + 0.6 * Math.sin(pos * Math.PI);
    result.push(Math.max(0.15, Math.min(0.95, normalized * envelope + 0.1)));
  }
  waveformCache.set(seed, result);
  return result;
}

// ─── Types ───────────────────────────────────────────────────────────────────
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
  replyTo?: Message;
}

interface Conversation {
  conversationWith: User;
  lastMessage: Message;
  unreadCount: number;
}

// ─── Helper Functions ────────────────────────────────────────────────────────
const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

const formatDate = (date: string): string => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (d.toDateString() === today.toDateString()) return "TODAY";
  if (d.toDateString() === yesterday.toDateString()) return "YESTERDAY";
  
  const diffTime = today.getTime() - d.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 7) {
    return d.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
  }
  
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();
};

const formatLastMessageTime = (date: string): string => {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const formatLastSeen = (lastActiveAt: string | null): string => {
  if (!lastActiveAt) return "last seen recently";
  const diffMs = Date.now() - new Date(lastActiveAt).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return "online";
  if (diffMins < 60) return `last seen ${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `last seen ${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays === 1) return "last seen yesterday";
  if (diffDays < 7) return `last seen ${diffDays} days ago`;
  
  return `last seen ${new Date(lastActiveAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
};

const formatAudioTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// ─── Constants ───────────────────────────────────────────────────────────────
const LOCK_THRESHOLD = 100;
const CANCEL_THRESHOLD = 100;
const SWIPE_REPLY_THRESHOLD = 60;

// ─── Main Component ──────────────────────────────────────────────────────────
export default function MessagesPage() {
  // Core State
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  
  // Media State
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<{ url: string; content: string } | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  
  // UI State
  const [showSidebar, setShowSidebar] = useState(true);
  const [recipientStatus, setRecipientStatus] = useState<{ isOnline: boolean; lastActiveAt: string | null }>({
    isOnline: false,
    lastActiveAt: null,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  
  // Voice Recording State
  const [holdState, setHoldState] = useState<"idle" | "holding" | "locked">("idle");
  const [slideUp, setSlideUp] = useState(0);
  const [slideLeft, setSlideLeft] = useState(0);
  const [justSentVoice, setJustSentVoice] = useState(false);
  
  // Audio Playback State
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  
  // Reply State
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [swipingMessageId, setSwipingMessageId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  
  // Message Actions State
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showMessageActions, setShowMessageActions] = useState(false);
  
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const touchStartYRef = useRef(0);
  const prevLengthRef = useRef(0);
  const userScrolledRef = useRef(false);
  const userRef = useRef<User | null>(null);
  const selectedUserRef = useRef<User | null>(null);
  const pullThreshold = 80;
  
  // Voice Recording Refs
  const holdStateRef = useRef<"idle" | "holding" | "locked">("idle");
  const recordOriginRef = useRef({ x: 0, y: 0 });
  const autoSendRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  
  // Swipe Refs
  const swipeStartXRef = useRef(0);
  const swipeStartTimeRef = useRef(0);

  const voiceRecorder = useVoiceRecorder();
  const vrRef = useRef(voiceRecorder);
  
  useEffect(() => {
    vrRef.current = voiceRecorder;
  }, [voiceRecorder]);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const applyHoldState = useCallback((s: "idle" | "holding" | "locked") => {
    holdStateRef.current = s;
    setHoldState(s);
  }, []);

  // ─── API Calls ───────────────────────────────────────────────────────────────
  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        const u = { ...data.user, _id: data.user.id };
        setUser(u);
        userRef.current = u;
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/messages", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations ?? []);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
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
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
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
      } catch (error) {
        console.error("Failed to mark as read:", error);
      }
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
          .filter((m) => !m.isRead && m.recipientId._id === userRef.current?._id)
          .map((m) => m._id);
        
        if (unreadIds.length > 0) markAsRead(unreadIds);
      } catch (error) {
        if (!silent) console.error("Failed to fetch messages:", error);
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
    } catch (error) {
      console.error("Failed to fetch recipient status:", error);
    }
  }, []);

  const sendActivityPing = useCallback(async () => {
    try {
      await fetch("/api/users/activity", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Failed to send activity ping:", error);
    }
  }, []);

  // ─── Message Sending ─────────────────────────────────────────────────────────
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

      if (replyingTo) {
        body.replyTo = replyingTo._id;
      }

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
          ...body,
          type: "image",
          content: message.trim() || "Photo",
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
          content: `🎤 Voice message`,
          voiceUrl: url,
          voiceDuration: voiceDur,
        };
        if (replyingTo) {
          body.replyTo = replyingTo._id;
        }
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
      setReplyingTo(null);
      
      if (fileInputRef.current) fileInputRef.current.value = "";
      vr.cancelRecording();

      await fetchMessages(su._id);
      await fetchConversations();
      
      if (hasVoice) setTimeout(() => setJustSentVoice(false), 300);
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
      setJustSentVoice(false);
    } finally {
      setSending(false);
    }
  }, [message, selectedImage, replyingTo, fetchMessages, fetchConversations]);

  // ─── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchUser();
    fetchConversations();
    fetchUsers();
    sendActivityPing();
    
    const activityId = setInterval(sendActivityPing, 60000);
    return () => clearInterval(activityId);
  }, [fetchUser, fetchConversations, fetchUsers, sendActivityPing]);

  useEffect(() => {
    if (!selectedUser) {
      const id = setInterval(fetchConversations, 30000);
      return () => clearInterval(id);
    }
    
    const run = () => {
      fetchMessages(selectedUser._id, true);
      fetchRecipientStatus(selectedUser._id);
    };
    
    run();
    fetchConversations();
    
    const msgId = setInterval(run, 30000);
    const convId = setInterval(fetchConversations, 60000);
    
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
        if (dist < 150) {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
    
    prevLengthRef.current = messages.length;
  }, [messages]);

  useEffect(() => {
    if (voiceRecorder.error) {
      console.error("Voice recorder error:", voiceRecorder.error);
      toast.error(voiceRecorder.error);
    }
  }, [voiceRecorder.error]);

  useEffect(() => {
    if (autoSendRef.current && voiceRecorder.audioBlob) {
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

  // ─── Scroll & Pull-to-Refresh ────────────────────────────────────────────────
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
      if (su) {
        await Promise.all([
          fetchMessages(su._id, true),
          fetchRecipientStatus(su._id),
        ]);
      }
      await fetchConversations();
    } catch (error) {
      toast.error("Failed to refresh");
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  }, [isRefreshing, fetchMessages, fetchRecipientStatus, fetchConversations]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > pullThreshold) {
      await handleManualRefresh();
    }
    setIsPulling(false);
    setPullDistance(0);
  }, [pullDistance, handleManualRefresh]);

  // ─── Conversation Handlers ───────────────────────────────────────────────────
  const handleSelectUser = useCallback((u: User) => {
    setSelectedUser(u);
    setShowSidebar(false);
    userScrolledRef.current = false;
    prevLengthRef.current = 0;
    setReplyingTo(null);
    if ("vibrate" in navigator) navigator.vibrate(10);
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedUser(null);
    setShowSidebar(true);
    setReplyingTo(null);
  }, []);

  // ─── Media Handlers ──────────────────────────────────────────────────────────
  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
  }, []);

  const handleImageView = useCallback((url: string, content: string) => {
    setViewingImage({ url, content });
    setImageZoom(1);
  }, []);

  const handleImageDownload = useCallback(async (url: string, content: string) => {
    const id = toast.loading("Downloading image...");
    try {
      const blob = await (await fetch(url)).blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = content && content !== "Photo" && content !== "Image"
        ? `${content.substring(0, 20)}-${Date.now()}.jpg`
        : `whatsapp-image-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      toast.dismiss(id);
      toast.success("Image downloaded");
    } catch (error) {
      toast.dismiss(id);
      toast.error("Failed to download image");
    }
  }, []);

  // ─── Audio Playback Handlers ─────────────────────────────────────────────────
  const handleAudioTimeUpdate = useCallback(() => {
    if (!audioRef.current || !playingId) return;
    const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
    setAudioProgress((prev) => ({ ...prev, [playingId]: progress }));
  }, [playingId]);

  const handleAudioEnded = useCallback(() => {
    if (playingId) {
      setAudioProgress((prev) => ({ ...prev, [playingId]: 0 }));
    }
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
        audioRef.current.play().catch(() => toast.error("Failed to play voice message"));
      }
      
      setPlayingId(id);
    },
    [playingId]
  );

  // ─── Voice Recording Handlers ────────────────────────────────────────────────
  const handleMicPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();

      console.log("🎤 Pointer down - starting hold timer");

      const el = e.currentTarget;
      pointerIdRef.current = e.pointerId;
      recordOriginRef.current = { x: e.clientX, y: e.clientY };

      (el as any)._holdFired = false;

      try {
        el.setPointerCapture(e.pointerId);
      } catch {}

      const holdTimer = setTimeout(async () => {
        console.log("⏰ Hold timer fired - starting recording");
        (el as any)._holdFired = true;

        applyHoldState("holding");
        setSlideUp(0);
        setSlideLeft(0);

        try {
          await vrRef.current.startRecording();
          console.log("✅ Recording started successfully");
          if ("vibrate" in navigator) navigator.vibrate(30);
        } catch (error) {
          console.error("❌ Recording failed:", error);
          toast.error("Microphone access denied");
          applyHoldState("idle");
        }
      }, 150);

      (el as any)._recordTimer = holdTimer;
    },
    [applyHoldState]
  );

  const handleMicPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (holdStateRef.current !== "holding") return;

      const dy = recordOriginRef.current.y - e.clientY;
      const dx = recordOriginRef.current.x - e.clientX;

      setSlideUp(Math.max(0, dy));
      setSlideLeft(Math.max(0, dx));

      // Check for lock threshold
      if (dy > LOCK_THRESHOLD) {
        console.log("🔒 Locking recording (slide up threshold reached)");
        applyHoldState("locked");
        setSlideUp(0);
        setSlideLeft(0);
        if ("vibrate" in navigator) navigator.vibrate([15, 30, 15]);
      }

      // Visual feedback for cancel
      if (dx > CANCEL_THRESHOLD) {
        console.log("⚠️ Cancel threshold reached (will cancel on release)");
      }
    },
    [applyHoldState]
  );

  const handleMicPointerUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      console.log("👆 Pointer up - current state:", holdStateRef.current);

      const target = e.currentTarget as any;
      const holdFired = target._holdFired === true;

      // Clear timer
      if (target._recordTimer) {
        console.log("⏰ Clearing hold timer");
        clearTimeout(target._recordTimer);
        delete target._recordTimer;
      }

      // Release pointer capture
      if (pointerIdRef.current !== null) {
        try {
          e.currentTarget.releasePointerCapture(pointerIdRef.current);
        } catch {}
        pointerIdRef.current = null;
      }

      // Reset hold fired flag
      target._holdFired = false;

      // If tap was too short (hold timer didn't fire), just reset
      if (!holdFired) {
        console.log("⚡ Quick tap - resetting");
        applyHoldState("idle");
        setSlideUp(0);
        setSlideLeft(0);
        return;
      }

      const currentState = holdStateRef.current;
      console.log("📊 Processing release - state:", currentState);

      // If locked, don't do anything (user must use send/cancel buttons)
      if (currentState === "locked") {
        console.log("🔒 Locked state - ignoring release");
        return;
      }

      // If idle, nothing to do
      if (currentState === "idle") {
        console.log("😴 Already idle - ignoring");
        return;
      }

      // Only process if we're in "holding" state
      if (currentState === "holding") {
        const dx = recordOriginRef.current.x - e.clientX;
        console.log("📏 Slide distance:", dx);

        if (dx > CANCEL_THRESHOLD) {
          console.log("🗑️ Canceling recording (swipe left)");
          vrRef.current.cancelRecording();
          if ("vibrate" in navigator) navigator.vibrate(50);
        } else {
          console.log("📤 Sending recording (release)");
          autoSendRef.current = true;
          vrRef.current.stopRecording();
        }

        applyHoldState("idle");
        setSlideUp(0);
        setSlideLeft(0);
      }
    },
    [applyHoldState]
  );

  const handleMicPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const target = e.currentTarget as any;

      if (target._recordTimer) {
        clearTimeout(target._recordTimer);
        delete target._recordTimer;
      }

      target._holdFired = false;

      if (pointerIdRef.current !== null) {
        try {
          e.currentTarget.releasePointerCapture(pointerIdRef.current);
        } catch {}
        pointerIdRef.current = null;
      }

      if (holdStateRef.current !== "idle") {
        vrRef.current.cancelRecording();
        applyHoldState("idle");
        setSlideUp(0);
        setSlideLeft(0);
      }
    },
    [applyHoldState]
  );

  const handleLockedCancel = useCallback(() => {
    vrRef.current.cancelRecording();
    applyHoldState("idle");
    if ("vibrate" in navigator) navigator.vibrate(50);
  }, [applyHoldState]);

  const handleLockedSend = useCallback(() => {
    autoSendRef.current = true;
    vrRef.current.stopRecording();
    applyHoldState("idle");
  }, [applyHoldState]);

  // ─── Reply Handlers ──────────────────────────────────────────────────────────
  const handleReplySwipeStart = useCallback((e: React.TouchEvent, messageId: string) => {
    swipeStartXRef.current = e.touches[0].clientX;
    swipeStartTimeRef.current = Date.now();
    setSwipingMessageId(messageId);
  }, []);

  const handleReplySwipeMove = useCallback((e: React.TouchEvent) => {
    if (!swipingMessageId) return;
    
    const currentX = e.touches[0].clientX;
    const diff = currentX - swipeStartXRef.current;
    
    if (diff > 0) {
      setSwipeOffset(Math.min(diff, SWIPE_REPLY_THRESHOLD * 1.5));
    }
  }, [swipingMessageId]);

  const handleReplySwipeEnd = useCallback(() => {
    if (swipeOffset > SWIPE_REPLY_THRESHOLD && swipingMessageId) {
      const msg = messages.find((m) => m._id === swipingMessageId);
      if (msg) {
        setReplyingTo(msg);
        if ("vibrate" in navigator) navigator.vibrate(20);
      }
    }
    
    setSwipingMessageId(null);
    setSwipeOffset(0);
  }, [swipeOffset, swipingMessageId, messages]);

  // ─── Message Actions ─────────────────────────────────────────────────────────
  const handleLongPress = useCallback((msg: Message) => {
    setSelectedMessage(msg);
    setShowMessageActions(true);
    if ("vibrate" in navigator) navigator.vibrate(50);
  }, []);

  const handleCopyMessage = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard");
      setShowMessageActions(false);
      setSelectedMessage(null);
    } catch {
      toast.error("Failed to copy");
    }
  }, []);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    // Implement delete message API call
    toast.success("Message deleted");
    setShowMessageActions(false);
    setSelectedMessage(null);
  }, []);

  // ─── Other Handlers ──────────────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  }, []);

  // ─── Filtered Users ──────────────────────────────────────────────────────────
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

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="flex flex-col bg-[#111827] messages-container-height overflow-hidden">
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              SIDEBAR - Conversations List
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div
            className={`${
              showSidebar ? "flex" : "hidden"
            } md:flex w-full md:w-[380px] bg-[#111827] border-r border-gray-700/30 flex-col overflow-hidden`}
          >
            {/* Header */}
            <div className="bg-[#1F2937] p-4 border-b border-gray-700/30 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-white text-xl font-semibold">Chats</h1>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-full transition-all disabled:opacity-50 active:scale-95"
                  >
                    <RefreshCw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-full transition-all active:scale-95">
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search or start new chat"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#374151] border border-gray-600/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent text-sm"
                  style={{ fontSize: "16px" }}
                />
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto min-h-0" style={{ WebkitOverflowScrolling: "touch" }}>
              {(searchTerm
                ? filteredUsers.map((u) => ({ user: u, conv: null as Conversation | null }))
                : conversations.map((c) => ({ user: c.conversationWith, conv: c }))
              ).map(({ user: u, conv }) => (
                <button
                  key={u._id}
                  onClick={() => handleSelectUser(u)}
                  className={`w-full px-4 py-3 flex items-center space-x-3 hover:bg-[#1F2937] border-b border-gray-700/20 transition-colors active:bg-[#374151] ${
                    selectedUser?._id === u._id ? "bg-[#1F2937]" : ""
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center">
                      <span className="text-white font-semibold text-base">
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </span>
                    </div>
                  </div>

                  {/* Message Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-0.5">
                      <p className="text-white font-medium truncate text-[15px]">
                        {u.firstName} {u.lastName}
                      </p>
                      {conv && (
                        <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                          {formatLastMessageTime(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      {conv ? (
                        <>
                          <p className="text-gray-400 text-sm truncate flex items-center">
                            {conv.lastMessage.senderId._id === user?._id && (
                              <span className="mr-1">
                                {conv.lastMessage.isRead ? (
                                  <CheckCheck className="h-3.5 w-3.5 text-[#53BDEB] inline" />
                                ) : (
                                  <Check className="h-3.5 w-3.5 text-gray-400 inline" />
                                )}
                              </span>
                            )}
                            {conv.lastMessage.type === "voice"
                              ? "🎤 Voice message"
                              : conv.lastMessage.type === "image"
                              ? "📷 Photo"
                              : conv.lastMessage.content}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-[#25D366] text-white text-xs rounded-full font-medium min-w-[1.25rem] text-center flex-shrink-0">
                              {conv.unreadCount}
                            </span>
                          )}
                        </>
                      ) : (
                        <p className="text-gray-500 text-sm truncate">{u.role}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}

              {/* Empty State */}
              {!loading && conversations.length === 0 && !searchTerm && (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-[#1F2937] flex items-center justify-center mb-4">
                    <MessageCircle className="h-10 w-10 text-gray-600" />
                  </div>
                  <p className="text-gray-400 text-base font-medium mb-2">No conversations yet</p>
                  <p className="text-gray-500 text-sm">
                    Search for users to start messaging
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              CHAT AREA - Messages View
              ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <div
            className={`${
              !selectedUser ? "hidden" : "flex"
            } md:flex flex-1 flex-col bg-[#0F172A] relative overflow-hidden min-h-0`}
          >
            {selectedUser ? (
              <>
                {/* Chat Header */}
                <div className="bg-[#1F2937] p-3 mt-14 md:mt-0 border-b border-gray-700/30 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <button
                        onClick={handleBackToList}
                        className="md:hidden p-2 hover:bg-gray-700/50 rounded-full active:bg-gray-700 active:scale-95"
                      >
                        <ArrowLeft className="h-5 w-5 text-white" />
                      </button>

                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-sm">
                          {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}
                        </span>
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-[15px] truncate">
                          {selectedUser.firstName} {selectedUser.lastName}
                        </p>
                        <p className="text-xs truncate">
                          {recipientStatus.isOnline ? (
                            <span className="text-[#25D366]">online</span>
                          ) : (
                            <span className="text-gray-400">
                              {formatLastSeen(recipientStatus.lastActiveAt)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Header Actions */}
                    <div className="flex items-center space-x-1">
                      <button className="p-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-full transition-all active:scale-95">
                        <Video className="h-5 w-5" />
                      </button>
                      <button className="p-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-full transition-all active:scale-95">
                        <Phone className="h-5 w-5" />
                      </button>
                      <button className="p-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-full transition-all active:scale-95">
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Pull-to-Refresh Indicator */}
                {isPulling && (
                  <div
                    className="absolute top-16 left-1/2 z-10 transition-all"
                    style={{
                      opacity: Math.min(pullDistance / pullThreshold, 1),
                      transform: `translateX(-50%) translateY(${Math.min(pullDistance / 2, 40)}px)`,
                    }}
                  >
                    <div className="bg-[#1F2937] rounded-full p-2 shadow-lg">
                      <RefreshCw
                        className={`h-5 w-5 text-white ${pullDistance > pullThreshold ? "animate-spin" : ""}`}
                      />
                    </div>
                  </div>
                )}

                {/* Messages Container */}
                <div
                  ref={messagesContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto min-h-0 p-3 space-y-1"
                  style={{
                    WebkitOverflowScrolling: "touch",
                    overscrollBehavior: "contain",
                    backgroundImage: WALLPAPER_DARK,
                    backgroundSize: "400px 400px",
                    backgroundRepeat: "repeat",
                  }}
                >
                  {messages.map((msg, index) => {
                    const isMe = !!user && msg.senderId._id === user._id;
                    const showDate =
                      index === 0 ||
                      formatDate(messages[index - 1].createdAt) !== formatDate(msg.createdAt);
                    const waveform = msg.type === "voice" ? getWaveform(msg._id, 40) : null;
                    const isSwipingThis = swipingMessageId === msg._id;

                    return (
                      <div key={msg._id}>
                        {/* Date Divider */}
                        {showDate && (
                          <div className="flex justify-center my-4">
                            <div className="px-3 py-1.5 bg-[#1F2937]/90 backdrop-blur-sm rounded-lg shadow-sm">
                              <span className="text-gray-300 text-xs font-medium">
                                {formatDate(msg.createdAt)}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Message Bubble */}
                        <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div
                            className="relative message-bubble"
                            style={{
                              transform: isSwipingThis ? `translateX(${swipeOffset}px)` : "none",
                              transition: isSwipingThis ? "none" : "transform 0.2s ease-out",
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              handleLongPress(msg);
                            }}
                          >
                            {/* Reply Icon (appears during swipe) */}
                            {!isMe && swipeOffset > 20 && isSwipingThis && (
                              <div
                                className="absolute right-full mr-3 top-1/2 -translate-y-1/2"
                                style={{
                                  opacity: Math.min(swipeOffset / SWIPE_REPLY_THRESHOLD, 1),
                                }}
                              >
                                <Reply className="h-6 w-6 text-gray-400" />
                              </div>
                            )}

                            <div
                              className={`${
                                msg.type === "voice"
                                  ? "max-w-[280px] px-2 py-1.5"
                                  : "max-w-[85%] md:max-w-md px-3 py-2"
                              } rounded-lg shadow-sm ${
                                isMe
                                  ? "bg-[#005C4B] text-white"
                                  : "bg-[#1F2937] text-white"
                              }`}
                              style={{
                                borderRadius: isMe
                                  ? "8px 8px 2px 8px"
                                  : "8px 8px 8px 2px",
                              }}
                              onTouchStart={(e) => {
                                // Long press detection
                                const touchStartTime = Date.now();
                                const longPressTimer = setTimeout(() => {
                                  handleLongPress(msg);
                                }, 500);

                                const cleanup = () => {
                                  clearTimeout(longPressTimer);
                                  e.currentTarget.removeEventListener('touchend', cleanup);
                                  e.currentTarget.removeEventListener('touchmove', cleanup);
                                };

                                e.currentTarget.addEventListener('touchend', cleanup);
                                e.currentTarget.addEventListener('touchmove', cleanup);

                                // Swipe to reply (only for received messages)
                                if (!isMe) {
                                  handleReplySwipeStart(e, msg._id);
                                }
                              }}
                              onTouchMove={(e) => {
                                if (!isMe) {
                                  handleReplySwipeMove(e);
                                }
                              }}
                              onTouchEnd={(e) => {
                                if (!isMe) {
                                  handleReplySwipeEnd();
                                }
                              }}
                            >
                              {/* Reply Preview */}
                              {msg.replyTo && (
                                <div
                                  className={`mb-2 pl-2 border-l-4 ${
                                    isMe ? "border-[#25D366]" : "border-[#25D366]"
                                  } py-1`}
                                >
                                  <p className={`text-xs font-medium mb-0.5 ${
                                    isMe ? "text-[#25D366]" : "text-[#25D366]"
                                  }`}>
                                    {msg.replyTo.senderId._id === user?._id
                                      ? "You"
                                      : msg.replyTo.senderId.firstName}
                                  </p>
                                  <p className="text-xs opacity-70 truncate">
                                    {msg.replyTo.type === "voice"
                                      ? "🎤 Voice message"
                                      : msg.replyTo.type === "image"
                                      ? "📷 Photo"
                                      : msg.replyTo.content}
                                  </p>
                                </div>
                              )}

                              {/* Image Message */}
                              {msg.type === "image" && (
                                <div className="space-y-2">
                                  <img
                                    src={msg.imageUrl}
                                    alt="Shared image"
                                    className="rounded-md max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity active:opacity-75"
                                    onClick={() => handleImageView(msg.imageUrl!, msg.content)}
                                  />
                                  {msg.content && msg.content !== "Photo" && msg.content !== "Image" && (
                                    <p className="text-sm">{msg.content}</p>
                                  )}
                                  <div className="flex items-center justify-end space-x-1">
                                    <span className="text-[10px] opacity-60">
                                      {formatTime(msg.createdAt)}
                                    </span>
                                    {isMe &&
                                      (msg.isRead ? (
                                        <CheckCheck className="h-3.5 w-3.5 text-[#53BDEB]" />
                                      ) : (
                                        <Check className="h-3.5 w-3.5 text-gray-300" />
                                      ))}
                                  </div>
                                </div>
                              )}

                              {/* Voice Message */}
                              {msg.type === "voice" && waveform && (
                                <div className="flex items-center space-x-2 min-w-[240px] py-1">
                                  <button
                                    onClick={() => playVoiceMessage(msg._id, msg.voiceUrl ?? "")}
                                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center hover:opacity-80 active:scale-95 transition-transform"
                                  >
                                    {playingId === msg._id ? (
                                      <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                                        <Pause className="h-4 w-4 text-white fill-white" />
                                      </div>
                                    ) : (
                                      <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                                        <Play className="h-4 w-4 text-white fill-white ml-0.5" />
                                      </div>
                                    )}
                                  </button>

                                  {/* Waveform */}
                                  <div className="flex-1 relative h-8 flex items-center">
                                    <div className="flex items-end justify-between w-full h-full gap-[1px]">
                                      {waveform.map((height, i) => {
                                        const played =
                                          (i / (waveform.length - 1)) * 100 <=
                                          (audioProgress[msg._id] ?? 0);
                                        return (
                                          <div
                                            key={i}
                                            className={`rounded-full flex-1 transition-all duration-100 ${
                                              played
                                                ? isMe
                                                  ? "bg-white"
                                                  : "bg-[#25D366]"
                                                : "bg-white/30"
                                            }`}
                                            style={{
                                              height: `${Math.max(8, height * 100)}%`,
                                              minHeight: "3px",
                                            }}
                                          />
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Duration & Status */}
                                  <div className="flex flex-col items-end flex-shrink-0">
                                    <span className="text-[11px] font-mono tabular-nums opacity-70">
                                      {playingId === msg._id && audioRef.current
                                        ? formatAudioTime(audioRef.current.currentTime)
                                        : formatAudioTime(msg.voiceDuration ?? 0)}
                                    </span>
                                    <div className="flex items-center space-x-1 mt-0.5">
                                      <span className="text-[9px] opacity-60">
                                        {formatTime(msg.createdAt)}
                                      </span>
                                      {isMe &&
                                        (msg.isRead ? (
                                          <CheckCheck className="h-3 w-3 text-[#53BDEB]" />
                                        ) : (
                                          <Check className="h-3 w-3 text-gray-300" />
                                        ))}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Text Message */}
                              {msg.type === "text" && (
                                <>
                                  <p className="text-[15px] break-words whitespace-pre-wrap leading-relaxed">
                                    {msg.content}
                                  </p>
                                  <div className="flex items-center justify-end space-x-1 mt-1">
                                    <span className="text-[10px] opacity-60">
                                      {formatTime(msg.createdAt)}
                                    </span>
                                    {isMe &&
                                      (msg.isRead ? (
                                        <CheckCheck className="h-3.5 w-3.5 text-[#53BDEB]" />
                                      ) : (
                                        <Check className="h-3.5 w-3.5 text-gray-300" />
                                      ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div ref={messagesEndRef} />
                  <div className="h-4" />
                </div>

                {/* Scroll to Bottom Button */}
                {showScrollButton && (
                  <button
                    onClick={() =>
                      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
                    }
                    className="absolute bottom-28 right-4 p-3 bg-[#1F2937] text-white rounded-full shadow-lg hover:bg-[#374151] active:scale-95 transition-all z-10"
                  >
                    <ChevronDown className="h-5 w-5" />
                  </button>
                )}

                {/* Audio Element */}
                <audio
                  ref={audioRef}
                  onTimeUpdate={handleAudioTimeUpdate}
                  onEnded={handleAudioEnded}
                />

                {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    INPUT BAR
                    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <div
                  className="bg-[#1F2937] border-t border-gray-700/30 flex-shrink-0"
                  style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
                >
                  <div className="p-2">
                    {/* Reply Preview Bar */}
                    {replyingTo && holdState === "idle" && (
                      <div className="mb-2 px-3 py-2 bg-[#374151] rounded-lg flex items-center space-x-3">
                        <Reply className="h-4 w-4 text-[#25D366] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[#25D366] text-xs font-medium">
                            {replyingTo.senderId._id === user?._id
                              ? "You"
                              : replyingTo.senderId.firstName}
                          </p>
                          <p className="text-gray-300 text-sm truncate">
                            {replyingTo.type === "voice"
                              ? "🎤 Voice message"
                              : replyingTo.type === "image"
                              ? "📷 Photo"
                              : replyingTo.content}
                          </p>
                        </div>
                        <button
                          onClick={() => setReplyingTo(null)}
                          className="p-1 text-gray-400 hover:text-white active:scale-95"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {/* HOLDING State - Recording with gestures */}
                    {holdState === "holding" && (
                      <div className="flex items-center h-14 gap-3 select-none">
                        {/* Cancel Hint */}
                        <div
                          className="flex items-center gap-1.5 transition-opacity duration-100"
                          style={{
                            opacity: Math.max(0.2, Math.min(1, slideLeft / (CANCEL_THRESHOLD * 0.6))),
                          }}
                        >
                          <X className="h-5 w-5 text-red-400" />
                          <span className="text-red-400 text-sm font-medium">Cancel</span>
                        </div>

                        {/* Recording Timer */}
                        <div className="flex-1 flex items-center justify-center gap-3 bg-[#374151] rounded-full px-5 py-3">
                          <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                          <span className="text-white font-mono tabular-nums text-base font-medium">
                            {formatAudioTime(voiceRecorder.duration)}
                          </span>
                        </div>

                        {/* Lock Hint */}
                        <div
                          className="flex flex-col items-center gap-1 transition-opacity duration-100"
                          style={{
                            opacity: Math.max(0.2, Math.min(1, slideUp / (LOCK_THRESHOLD * 0.6))),
                          }}
                        >
                          <ChevronUp className="h-5 w-5 text-gray-300" />
                          <Lock className="h-4 w-4 text-gray-300" />
                        </div>
                      </div>
                    )}

                    {/* LOCKED State - Hands-free recording */}
                    {holdState === "locked" && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleLockedCancel}
                          className="p-2.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-full active:scale-90 transition-all"
                        >
                          <Trash2 className="h-6 w-6" />
                        </button>

                        <div className="flex-1 flex items-center gap-3 bg-[#374151] rounded-full px-4 py-3">
                          <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                          <span className="text-white font-mono tabular-nums text-base font-medium">
                            {formatAudioTime(voiceRecorder.duration)}
                          </span>
                          <div className="flex-1 h-1.5 bg-gray-600 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500 rounded-full animate-pulse w-full" />
                          </div>
                          <Lock className="h-4 w-4 text-[#25D366]" />
                        </div>

                        <button
                          onClick={handleLockedSend}
                          className="p-2.5 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full active:scale-90 transition-all shadow-lg"
                        >
                          <Send className="h-6 w-6" />
                        </button>
                      </div>
                    )}

                    {/* IDLE State - Normal input */}
                    {holdState === "idle" && (
                      <>
                        {/* Image Preview */}
                        {imagePreview && (
                          <div className="mb-3 relative inline-block">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="max-h-32 rounded-lg shadow-lg"
                            />
                            <button
                              onClick={() => {
                                setSelectedImage(null);
                                setImagePreview(null);
                                if (fileInputRef.current) fileInputRef.current.value = "";
                              }}
                              className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 active:scale-95 shadow-lg"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}

                        {/* Voice Preview */}
                        {voiceRecorder.audioBlob && !justSentVoice && (
                          <div className="flex items-center gap-3 mb-2">
                            <button
                              onClick={() => vrRef.current.cancelRecording()}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-full active:scale-90 transition-all"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>

                            <div className="flex-1 flex items-center gap-3 bg-[#374151] rounded-full px-4 py-2.5">
                              <Play className="h-4 w-4 text-white/70" />
                              <div className="flex-1 h-1 bg-gray-600 rounded-full">
                                <div className="h-1 bg-white rounded-full w-0" />
                              </div>
                              <span className="text-white/70 text-sm font-mono tabular-nums">
                                {formatAudioTime(voiceRecorder.duration)}
                              </span>
                            </div>

                            <button
                              onClick={handleSendMessage}
                              disabled={sending}
                              className="p-2.5 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full active:scale-90 disabled:opacity-50 transition-all shadow-lg"
                            >
                              <Send className="h-5 w-5" />
                            </button>
                          </div>
                        )}

                        {/* Normal Input Row */}
                        {!voiceRecorder.audioBlob && (
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleImageSelect}
                              accept="image/*"
                              className="hidden"
                            />

                            {/* Emoji Button */}
                            <button className="p-2.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-full active:scale-95 transition-all">
                              <Smile className="h-6 w-6" />
                            </button>

                            {/* Text Input */}
                            <div className="flex-1 flex items-center bg-[#374151] rounded-full">
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
                                placeholder="Message"
                                className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none px-4 py-2.5 text-[15px]"
                                style={{ fontSize: "16px" }}
                              />
                              
                              <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 text-gray-400 hover:text-white active:scale-95 transition-all mr-2"
                              >
                                <Paperclip className="h-5 w-5" />
                              </button>
                              
                              {message.trim() || selectedImage ? (
                                <button
                                  onClick={handleSendMessage}
                                  disabled={sending}
                                  className="p-2 text-gray-400 hover:text-white active:scale-95 disabled:opacity-50 transition-all mr-2"
                                >
                                  <Camera className="h-5 w-5" />
                                </button>
                              ) : null}
                            </div>

                            {/* Send or Mic Button */}
                            {message.trim() || selectedImage ? (
                              <button
                                onClick={handleSendMessage}
                                disabled={sending}
                                className="p-2.5 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full active:scale-90 disabled:opacity-50 transition-all shadow-lg"
                              >
                                <Send className="h-6 w-6" />
                              </button>
                            ) : (
                              <button
                                onPointerDown={handleMicPointerDown}
                                onPointerMove={handleMicPointerMove}
                                onPointerUp={handleMicPointerUp}
                                onPointerCancel={handleMicPointerCancel}
                                className="p-2.5 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full active:scale-110 transition-all shadow-lg select-none"
                                style={{
                                  touchAction: "none",
                                  userSelect: "none",
                                }}
                              >
                                <Mic className="h-6 w-6" />
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* Empty State */
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full bg-[#1F2937] flex items-center justify-center mx-auto mb-6">
                    <MessageCircle className="h-12 w-12 text-gray-600" />
                  </div>
                  <p className="text-gray-400 text-lg font-medium mb-2">
                    Select a chat to start messaging
                  </p>
                  <p className="text-gray-500 text-sm">
                    Choose a conversation from the list
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODALS & OVERLAYS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

      {/* Message Actions Modal */}
      {showMessageActions && selectedMessage && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-end md:items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => {
            setShowMessageActions(false);
            setSelectedMessage(null);
          }}
        >
          <div
            className="bg-[#1F2937] rounded-2xl w-full md:w-96 overflow-hidden animate-in slide-in-from-bottom duration-300 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            <div className="p-4 border-b border-gray-700/30">
              <p className="text-white font-medium">Message Options</p>
            </div>

            <div className="p-2">
              {/* Reply Option */}
              <button
                onClick={() => {
                  setReplyingTo(selectedMessage);
                  setShowMessageActions(false);
                  setSelectedMessage(null);
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-700/50 rounded-lg transition-colors text-left active:bg-gray-700"
              >
                <Reply className="h-5 w-5 text-gray-400" />
                <span className="text-white">Reply</span>
              </button>

              {/* Copy Option (text only) */}
              {selectedMessage.type === "text" && (
                <button
                  onClick={() => handleCopyMessage(selectedMessage.content)}
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-700/50 rounded-lg transition-colors text-left active:bg-gray-700"
                >
                  <Copy className="h-5 w-5 text-gray-400" />
                  <span className="text-white">Copy Text</span>
                </button>
              )}

              {/* Forward Option */}
              <button
                onClick={() => {
                  toast.success("Forward feature coming soon");
                  setShowMessageActions(false);
                  setSelectedMessage(null);
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-700/50 rounded-lg transition-colors text-left active:bg-gray-700"
              >
                <Forward className="h-5 w-5 text-gray-400" />
                <span className="text-white">Forward</span>
              </button>

              {/* Star Option */}
              <button
                onClick={() => {
                  toast.success("Message starred");
                  setShowMessageActions(false);
                  setSelectedMessage(null);
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-700/50 rounded-lg transition-colors text-left active:bg-gray-700"
              >
                <Star className="h-5 w-5 text-gray-400" />
                <span className="text-white">Star</span>
              </button>

              {/* Download Option (images only) */}
              {selectedMessage.type === "image" && (
                <button
                  onClick={() => {
                    handleImageDownload(selectedMessage.imageUrl!, selectedMessage.content);
                    setShowMessageActions(false);
                    setSelectedMessage(null);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-700/50 rounded-lg transition-colors text-left active:bg-gray-700"
                >
                  <Download className="h-5 w-5 text-gray-400" />
                  <span className="text-white">Download</span>
                </button>
              )}

              {/* Delete Option */}
              {selectedMessage.senderId._id === user?._id && (
                <button
                  onClick={() => handleDeleteMessage(selectedMessage._id)}
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-700/50 rounded-lg transition-colors text-left active:bg-gray-700"
                >
                  <Trash2 className="h-5 w-5 text-red-400" />
                  <span className="text-red-400">Delete</span>
                </button>
              )}

              {/* Info Option */}
              <button
                onClick={() => {
                  toast.success("Message info coming soon");
                  setShowMessageActions(false);
                  setSelectedMessage(null);
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-700/50 rounded-lg transition-colors text-left active:bg-gray-700"
              >
                <Info className="h-5 w-5 text-gray-400" />
                <span className="text-white">Info</span>
              </button>

              {/* Cancel */}
              <button
                onClick={() => {
                  setShowMessageActions(false);
                  setSelectedMessage(null);
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-700/50 rounded-lg transition-colors text-left active:bg-gray-700 mt-2 border-t border-gray-700/30"
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
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm z-10">
            <button
              onClick={() => setViewingImage(null)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-95"
            >
              <X className="h-6 w-6 text-white" />
            </button>
            <button
              onClick={() => handleImageDownload(viewingImage.url, viewingImage.content)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-95"
            >
              <Download className="h-6 w-6 text-white" />
            </button>
          </div>

          {/* Image */}
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

          {/* Caption */}
          {viewingImage.content && viewingImage.content !== "Photo" && viewingImage.content !== "Image" && (
            <div className="p-4 bg-gradient-to-t from-black/80 to-transparent backdrop-blur-sm">
              <p className="text-white text-center break-words">{viewingImage.content}</p>
            </div>
          )}
        </div>
      )}

      {/* Custom Styles */}
      <style jsx>{`
        .messages-container-height {
          height: calc(100dvh);
          height: calc(var(--vh, 100dvh));
        }

        @media (min-width: 768px) {
          .messages-container-height {
            height: 100dvh;
            height: var(--vh, 100dvh);
          }
        }

        /* Smooth scrolling for messages */
        .overflow-y-auto {
          scroll-behavior: smooth;
        }

        /* Custom scrollbar */
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }

        .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        /* Prevent text selection during gestures */
        .select-none {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
        }

        /* Message bubble specific styles */
        .message-bubble {
          -webkit-tap-highlight-color: transparent;
        }

        /* Improve touch scrolling */
        .overflow-y-auto {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }

        /* Animations */
        @keyframes slideInFromBottom {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-in {
          animation-fill-mode: both;
        }

        .slide-in-from-bottom {
          animation-name: slideInFromBottom;
        }

        .fade-in {
          animation-name: fadeIn;
        }

        .duration-200 {
          animation-duration: 200ms;
        }

        .duration-300 {
          animation-duration: 300ms;
        }
      `}</style>
    </MainLayout>
  );
}