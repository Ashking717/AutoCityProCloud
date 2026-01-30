// app/autocityPro/messages/page.tsx - OPTIMIZED FOR MOBILE WITH SIDEBAR
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  Image as ImageIcon,
  ArrowLeft,
  Download,
  RefreshCw,
  ChevronDown,
  Copy,
} from "lucide-react";
import toast from "react-hot-toast";

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
  const [viewingImage, setViewingImage] = useState<{url: string, content: string} | null>(null);
  const [recipientStatus, setRecipientStatus] = useState<{isOnline: boolean, lastActiveAt: string | null}>({
    isOnline: false,
    lastActiveAt: null
  });
  const [justSentVoice, setJustSentVoice] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceRecorder = useVoiceRecorder();
  const touchStartYRef = useRef(0);
  const pullThreshold = 80;

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<{ [key: string]: number }>({});
  const audioRef = useRef<HTMLAudioElement>(null);

  const prevMessagesLengthRef = useRef(0);
  const userScrolledRef = useRef(false);

  useEffect(() => {
    fetchUser();
    fetchConversations();
    fetchUsers();
    sendActivityPing();

    const activityInterval = setInterval(sendActivityPing, 30000);

    return () => {
      clearInterval(activityInterval);
    };
  }, []);

  useEffect(() => {
    if (!selectedUser) return;

    let messagesInterval: NodeJS.Timeout;
    let conversationsInterval: NodeJS.Timeout;

    const startPolling = () => {
      messagesInterval = setInterval(() => {
        if (selectedUser) {
          fetchMessages(selectedUser._id, true);
          fetchRecipientStatus(selectedUser._id);
        }
      }, 10000);

      conversationsInterval = setInterval(() => {
        fetchConversations();
      }, 30000);
    };

    const stopPolling = () => {
      clearInterval(messagesInterval);
      clearInterval(conversationsInterval);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        if (selectedUser) {
          fetchMessages(selectedUser._id, true);
          fetchRecipientStatus(selectedUser._id);
        }
        fetchConversations();
        startPolling();
      }
    };

    fetchMessages(selectedUser._id);
    fetchRecipientStatus(selectedUser._id);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    startPolling();

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedUser]);

  useEffect(() => {
    if (selectedUser) return;

    const conversationsInterval = setInterval(() => {
      fetchConversations();
    }, 30000);

    return () => {
      clearInterval(conversationsInterval);
    };
  }, [selectedUser]);

  useEffect(() => {
    const isNewMessage = messages.length > prevMessagesLengthRef.current;
    const isInitialLoad = prevMessagesLengthRef.current === 0 && messages.length > 0;

    if (isInitialLoad) {
      scrollToBottom(false);
      userScrolledRef.current = false;
    } else if (isNewMessage && !userScrolledRef.current) {
      const isNearBottom = checkIfNearBottom();
      if (isNearBottom) {
        scrollToBottom(true);
      }
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  useEffect(() => {
    if (voiceRecorder.error) {
      toast.error(voiceRecorder.error);
    }
  }, [voiceRecorder.error]);

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const isNearBottom = checkIfNearBottom();
    userScrolledRef.current = !isNearBottom;
    
    const scrolledDistance = container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollButton(scrolledDistance > 200);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const container = messagesContainerRef.current;
    if (!container || container.scrollTop > 0) return;
    
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const container = messagesContainerRef.current;
    if (!container || container.scrollTop > 0) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - touchStartYRef.current;

    if (distance > 0 && distance < pullThreshold * 1.5) {
      setPullDistance(distance);
      setIsPulling(true);
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > pullThreshold) {
      await handleManualRefresh();
    }
    
    setIsPulling(false);
    setPullDistance(0);
  };

  const checkIfNearBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return false;

    const threshold = 150;
    const position = container.scrollHeight - container.scrollTop - container.clientHeight;
    return position < threshold;
  };

  const scrollToBottom = (smooth: boolean = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto"
    });
  };

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setUser({
          ...data.user,
          _id: data.user.id,
        });
      }
    } catch (error) {
      console.error("Failed to fetch user", error);
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/messages", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error("Failed to fetch conversations");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Failed to fetch users");
    }
  };

  const fetchMessages = async (userId: string, silent = false) => {
    try {
      const res = await fetch(`/api/messages?userId=${userId}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);

        const unreadIds = data.messages
          .filter(
            (msg: Message) => !msg.isRead && msg.recipientId._id === user?._id
          )
          .map((msg: Message) => msg._id);

        if (unreadIds.length > 0) {
          markAsRead(unreadIds);
        }
      }
    } catch (error) {
      if (!silent) {
        console.error("Failed to fetch messages");
      }
    }
  };

  const markAsRead = async (messageIds: string[]) => {
    try {
      await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messageIds }),
      });
      fetchConversations();
    } catch (error) {
      console.error("Failed to mark as read");
    }
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setShowSidebar(false);
    userScrolledRef.current = false;
    prevMessagesLengthRef.current = 0;
    
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const handleBackToList = () => {
    setSelectedUser(null);
    setShowSidebar(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedUser || (!message.trim() && !voiceRecorder.audioBlob && !selectedImage)) return;

    setSending(true);
    userScrolledRef.current = false;

    const hasVoiceMessage = !!voiceRecorder.audioBlob;
    const voiceBlob = voiceRecorder.audioBlob;
    const voiceDuration = voiceRecorder.duration;

    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    try {
      let messageData: any = {
        recipientId: selectedUser._id,
        type: "text",
        content: message.trim(),
      };

      if (selectedImage) {
        const formData = new FormData();
        formData.append("file", selectedImage);
        formData.append("type", "image");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!uploadRes.ok) throw new Error("Failed to upload image");

        const uploadData = await uploadRes.json();

        messageData = {
          recipientId: selectedUser._id,
          type: "image",
          content: message.trim() || "Image",
          imageUrl: uploadData.url,
        };
      } else if (hasVoiceMessage && voiceBlob) {
        const formData = new FormData();
        formData.append("file", voiceBlob, "voice-note.webm");
        formData.append("type", "voice");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!uploadRes.ok) throw new Error("Failed to upload voice note");

        const uploadData = await uploadRes.json();

        messageData = {
          recipientId: selectedUser._id,
          type: "voice",
          content: `Voice message (${voiceDuration}s)`,
          voiceUrl: uploadData.url,
          voiceDuration: voiceDuration,
        };
      }

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(messageData),
      });

      if (res.ok) {
        if (hasVoiceMessage) {
          setJustSentVoice(true);
        }

        setMessage("");
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        voiceRecorder.cancelRecording();

        await fetchMessages(selectedUser._id);
        await fetchConversations();

        if (hasVoiceMessage) {
          setTimeout(() => setJustSentVoice(false), 300);
        }
      } else {
        throw new Error("Failed to send message");
      }
    } catch (error) {
      console.error("Send message error:", error);
      toast.error("Failed to send message");
      setJustSentVoice(false);
    } finally {
      setSending(false);
    }
  };

  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 50, 10]);
    }

    try {
      if (selectedUser) {
        await Promise.all([
          fetchMessages(selectedUser._id, true),
          fetchRecipientStatus(selectedUser._id),
        ]);
      }
      await fetchConversations();
      toast.success("Refreshed", { duration: 1500 });
    } catch (error) {
      toast.error("Failed to refresh");
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  const handleLongPress = useCallback((message: Message) => {
    setSelectedMessage(message);
    
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, []);

  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard");
      setSelectedMessage(null);
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";

    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    });
  };

  const sendActivityPing = async () => {
    try {
      await fetch("/api/users/activity", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Failed to send activity ping");
    }
  };

  const fetchRecipientStatus = async (userId: string) => {
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
      console.error("Failed to fetch recipient status");
    }
  };

  const formatLastSeen = (lastActiveAt: string | null) => {
    if (!lastActiveAt) return "last seen recently";

    const now = new Date();
    const lastSeen = new Date(lastActiveAt);
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "last seen just now";
    if (diffMins < 60) return `last seen ${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `last seen ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays === 1) return "last seen yesterday";
    if (diffDays < 7) return `last seen ${diffDays} days ago`;

    return `last seen ${lastSeen.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    })}`;
  };

  const formatAudioTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current && playingId) {
      const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setAudioProgress(prev => ({ ...prev, [playingId]: progress }));
    }
  };

  const handleAudioEnded = () => {
    if (playingId) {
      setAudioProgress(prev => ({ ...prev, [playingId]: 0 }));
    }
    setPlayingId(null);
  };

  const playVoiceMessage = (messageId: string, voiceUrl: string) => {
    if (playingId === messageId) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = voiceUrl;
        audioRef.current.play().catch((error) => {
          console.error("Failed to play audio:", error);
          toast.error("Failed to play voice message");
        });
      }
      setPlayingId(messageId);
    }
  };

  const handleImageView = (imageUrl: string, content: string) => {
    setViewingImage({ url: imageUrl, content });
    setImageZoom(1);
  };

  const handleImageDownload = async (imageUrl: string, content: string) => {
    try {
      const loadingToast = toast.loading("Downloading image...");

      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const timestamp = new Date().getTime();
      const filename = content && content !== "Image"
        ? `${content.substring(0, 20)}-${timestamp}.jpg`
        : `image-${timestamp}.jpg`;

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.dismiss(loadingToast);
      toast.success("Image downloaded");
    } catch (error) {
      toast.error("Failed to download image");
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u._id !== user?._id &&
      (u.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  };

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      {/* ✅ UPDATED: Container height - adjusted for mobile bottom bar, full height on desktop */}
      <div className="flex flex-col bg-[#050505] messages-container-height">
        
        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Conversations Sidebar */}
          <div className={`${
            showSidebar ? 'flex' : 'hidden'
          } md:flex w-full md:w-80 bg-black border-r border-gray-800 flex-col`}>
            
            {/* Search */}
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
                    style={{ fontSize: '16px' }}
                  />
                </div>
                <button
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="p-2 text-white/80 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 active:scale-95 flex-shrink-0 touch-manipulation"
                  title="Refresh"
                >
                  <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              {searchTerm
                ? filteredUsers.map((u) => (
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
                        <p className="text-white font-medium text-sm md:text-base truncate">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="text-gray-500 text-xs md:text-sm truncate">{u.role}</p>
                      </div>
                    </button>
                  ))
                : conversations.map((conv) => (
                    <button
                      key={conv.conversationWith._id}
                      onClick={() => handleSelectUser(conv.conversationWith)}
                      className={`w-full p-3 md:p-4 flex items-center space-x-3 hover:bg-gray-900 border-b border-gray-800 transition-colors active:bg-gray-800 touch-manipulation ${
                        selectedUser?._id === conv.conversationWith._id
                          ? "bg-gray-900"
                          : ""
                      }`}
                    >
                      <div className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-[#E84545]/20 flex items-center justify-center border border-[#E84545]/30 flex-shrink-0">
                        <span className="text-[#E84545] font-semibold text-sm md:text-base">
                          {conv.conversationWith.firstName?.[0]}
                          {conv.conversationWith.lastName?.[0]}
                        </span>
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-white font-medium truncate text-sm md:text-base">
                            {conv.conversationWith.firstName}{" "}
                            {conv.conversationWith.lastName}
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

          {/* Chat Area */}
          <div className={`${
            !selectedUser ? 'hidden' : 'flex'
          } md:flex flex-1 flex-col bg-[#0A0A0A] relative`}>
            {selectedUser ? (
              <>
                {/* Chat Header - Compact */}
                <div className="p-3 border-b border-gray-800 bg-black flex-shrink-0">
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
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
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
                    className="absolute top-16 left-1/2 transform -translate-x-1/2 z-10 transition-all"
                    style={{ 
                      opacity: Math.min(pullDistance / pullThreshold, 1),
                      transform: `translateX(-50%) translateY(${Math.min(pullDistance / 2, 40)}px)`
                    }}
                  >
                    <div className="bg-gray-800 rounded-full p-2">
                      <RefreshCw className={`h-5 w-5 text-white ${pullDistance > pullThreshold ? 'animate-spin' : ''}`} />
                    </div>
                  </div>
                )}

                {/* Messages */}
                <div 
                  ref={messagesContainerRef}
                  onScroll={handleScroll}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 md:space-y-3"
                  style={{ 
                    WebkitOverflowScrolling: 'touch',
                    overscrollBehavior: 'contain'
                  }}
                >
                  {messages.map((msg, index) => {
                    const isMe = !!user && msg.senderId._id === user._id;
                    const showDate =
                      index === 0 ||
                      formatDate(messages[index - 1].createdAt) !==
                        formatDate(msg.createdAt);

                    return (
                      <div key={msg._id}>
                        {showDate && (
                          <div className="flex justify-center my-2 md:my-3">
                            <span className="px-3 py-1 bg-gray-800 text-gray-400 text-xs rounded-full">
                              {formatDate(msg.createdAt)}
                            </span>
                          </div>
                        )}

                        <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div
                            onContextMenu={(e) => {
                              e.preventDefault();
                              handleLongPress(msg);
                            }}
                            onTouchStart={(e) => {
                              // Store reference to the element to avoid null error
                              const element = e.currentTarget;
                              let timer: NodeJS.Timeout | null = null;
                              
                              const handleTouchEnd = () => {
                                if (timer) clearTimeout(timer);
                                if (element) {
                                  element.removeEventListener('touchend', handleTouchEnd);
                                  element.removeEventListener('touchmove', handleTouchEnd);
                                }
                              };
                              
                              timer = setTimeout(() => {
                                handleLongPress(msg);
                              }, 500);
                              
                              element.addEventListener('touchend', handleTouchEnd, { once: false });
                              element.addEventListener('touchmove', handleTouchEnd, { once: true });
                            }}
                            className={`max-w-[85%] md:max-w-md px-3 md:px-4 py-2 rounded-2xl ${
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
                                  onClick={() => handleImageView(msg.imageUrl!, msg.content)}
                                />
                                {msg.content && msg.content !== "Image" && (
                                  <p className="text-sm">{msg.content}</p>
                                )}
                              </div>
                            ) : msg.type === "voice" ? (
                              <div className="space-y-1.5">
                                <div className="flex items-center space-x-2 min-w-[200px]">
                                  <button
                                    onClick={() => playVoiceMessage(msg._id, msg.voiceUrl || "")}
                                    className="p-1.5 hover:bg-white/10 rounded-full active:bg-white/20 active:scale-95 touch-manipulation flex-shrink-0"
                                  >
                                    {playingId === msg._id ? (
                                      <Pause className="h-4 w-4" />
                                    ) : (
                                      <Play className="h-4 w-4" />
                                    )}
                                  </button>

                                  <div className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-white rounded-full transition-all duration-100"
                                      style={{ width: `${audioProgress[msg._id] || 0}%` }}
                                    />
                                  </div>

                                  <span className="text-xs opacity-80 font-mono tabular-nums">
                                    {playingId === msg._id && audioRef.current
                                      ? formatAudioTime(audioRef.current.currentTime)
                                      : formatAudioTime(0)
                                    }
                                    {' / '}
                                    {formatAudioTime(msg.voiceDuration || 0)}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm md:text-base break-words whitespace-pre-wrap">
                                {msg.content}
                              </p>
                            )}

                            <div className="flex items-center justify-between mt-1 space-x-2">
                              <span className="text-[10px] md:text-xs opacity-70">
                                {formatTime(msg.createdAt)}
                              </span>
                              {isMe && (
                                <span>
                                  {msg.isRead ? (
                                    <CheckCheck className="h-3.5 w-3.5 md:h-4 md:w-4 text-[#53BDEB]" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5 md:h-4 md:w-4 text-gray-400" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                  
                  {/* ✅ Extra bottom padding for mobile to prevent last message from being under input */}
                  <div className="h-4 md:h-0" />
                </div>

                {/* Scroll to bottom button */}
                {showScrollButton && (
                  <button
                    onClick={() => scrollToBottom(true)}
                    className="absolute bottom-28 md:bottom-24 right-4 p-3 bg-[#E84545] text-white rounded-full shadow-lg hover:bg-[#cc3c3c] active:bg-[#b33535] active:scale-95 transition-all z-10 touch-manipulation"
                  >
                    <ChevronDown className="h-5 w-5" />
                  </button>
                )}

                <audio 
                  ref={audioRef} 
                  onTimeUpdate={handleAudioTimeUpdate}
                  onEnded={handleAudioEnded}
                />

                {/* ✅ UPDATED: Input Area with mobile bottom bar accommodation */}
                <div className="border-t border-gray-800 bg-black flex-shrink-0">
                  <div className="p-2.5 md:p-4">
                    {/* Image Preview */}
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
                            if (fileInputRef.current) {
                              fileInputRef.current.value = "";
                            }
                          }}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 active:bg-red-700 active:scale-95 touch-manipulation"
                        >
                          <X className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        </button>
                      </div>
                    )}

                    {voiceRecorder.isRecording ? (
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 flex items-center space-x-2 md:space-x-3 px-3 md:px-4 py-2.5 md:py-3 bg-gray-900 rounded-xl">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                          <span className="text-white text-sm md:text-base font-medium font-mono tabular-nums">
                            {formatAudioTime(voiceRecorder.duration)}
                          </span>
                          <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500 rounded-full animate-pulse w-full" />
                          </div>
                        </div>
                        <button
                          onClick={voiceRecorder.cancelRecording}
                          className="p-2.5 md:p-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 active:bg-gray-600 active:scale-95 touch-manipulation"
                        >
                          <X className="h-5 w-5" />
                        </button>
                        <button
                          onClick={voiceRecorder.stopRecording}
                          className="p-2.5 md:p-3 bg-[#E84545] text-white rounded-xl hover:bg-[#cc3c3c] active:bg-[#b33535] active:scale-95 touch-manipulation"
                        >
                          <Send className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (voiceRecorder.audioBlob && !justSentVoice) ? (
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 flex items-center space-x-2 md:space-x-3 px-3 md:px-4 py-2.5 md:py-3 bg-gray-900 rounded-xl">
                          <div className="p-1 hover:bg-white/10 rounded-full touch-manipulation">
                            <Play className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1 h-1.5 bg-gray-700 rounded-full">
                            <div className="h-1.5 bg-white rounded-full w-0" />
                          </div>
                          <span className="text-white text-sm font-mono tabular-nums">
                            {formatAudioTime(voiceRecorder.duration)}
                          </span>
                        </div>
                        <button
                          onClick={voiceRecorder.cancelRecording}
                          className="p-2.5 md:p-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 active:bg-gray-600 active:scale-95 touch-manipulation"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={handleSendMessage}
                          disabled={sending}
                          className="p-2.5 md:p-3 bg-[#E84545] text-white rounded-xl hover:bg-[#cc3c3c] active:bg-[#b33535] active:scale-95 disabled:opacity-50 touch-manipulation"
                        >
                          <Send className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleImageSelect}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2.5 md:p-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 active:bg-gray-600 active:scale-95 touch-manipulation flex-shrink-0"
                        >
                          <ImageIcon className="h-5 w-5" />
                        </button>
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
                          placeholder="Type a message..."
                          className="flex-1 px-3 md:px-4 py-2.5 md:py-3 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-sm md:text-base min-w-0"
                          style={{ fontSize: '16px' }}
                        />
                        <button
                          onClick={voiceRecorder.startRecording}
                          disabled={voiceRecorder.isRecording}
                          className="p-2.5 md:p-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 active:bg-gray-600 active:scale-95 disabled:opacity-50 touch-manipulation flex-shrink-0"
                        >
                          <Mic className="h-5 w-5" />
                        </button>
                        <button
                          onClick={handleSendMessage}
                          disabled={(!message.trim() && !selectedImage) || sending}
                          className="p-2.5 md:p-3 bg-[#E84545] text-white rounded-xl hover:bg-[#cc3c3c] active:bg-[#b33535] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation flex-shrink-0"
                        >
                          <Send className="h-5 w-5" />
                        </button>
                      </div>
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
            style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
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
                    handleImageDownload(selectedMessage.imageUrl!, selectedMessage.content);
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

      {/* Image Viewer Modal */}
      {viewingImage && (
        <div 
          className="fixed inset-0 z-50 bg-black flex flex-col animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setViewingImage(null);
            }
          }}
        >
          <div className="flex items-center justify-between p-3 md:p-4 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm z-10">
            <button
              onClick={() => setViewingImage(null)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors active:bg-white/20 active:scale-95 touch-manipulation"
              aria-label="Close"
            >
              <X className="h-6 w-6 text-white" />
            </button>
            
            <button
              onClick={() => handleImageDownload(viewingImage.url, viewingImage.content)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors active:bg-white/20 active:scale-95 touch-manipulation"
              aria-label="Download image"
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
                transition: 'transform 0.2s ease-out'
              }}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setImageZoom(imageZoom === 1 ? 2 : 1);
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
      
      {/* ✅ Responsive height styling */}
      <style jsx>{`
        .messages-container-height {
          height: calc(100vh - 5rem); /* Mobile: account for bottom bar */
        }
        
        @media (min-width: 768px) {
          .messages-container-height {
            height: 100vh; /* Desktop: full height */
          }
        }
      `}</style>
    </MainLayout>
  );
}