// app/autocityPro/messages/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
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
  Paperclip,
  ArrowLeft,
  Download,
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
  const [user, setUser] = useState<any>(null);
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


  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceRecorder = useVoiceRecorder();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchUser();
    fetchConversations();
    fetchUsers();

    // Send initial activity ping
    sendActivityPing();

    // Send activity ping every 30 seconds to keep user marked as online
    const activityInterval = setInterval(sendActivityPing, 30000);

    // Poll for new messages every 5 seconds
    const messagesInterval = setInterval(() => {
      if (selectedUser) {
        fetchMessages(selectedUser._id, true);
        fetchRecipientStatus(selectedUser._id);
      }
      fetchConversations();
    }, 5000);

    return () => {
      clearInterval(activityInterval);
      clearInterval(messagesInterval);
    };
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchUser = async () => {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });

    console.log("ME API STATUS:", res.status);

    const data = await res.json();
    console.log("ME API RESPONSE:", data);

    if (res.ok) {
      setUser({
  ...data.user,
  _id: data.user.id, // 🔥 normalize
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
    fetchMessages(user._id);
    fetchRecipientStatus(user._id);
    // Hide sidebar on mobile when user is selected
    setShowSidebar(false);
  };

  const handleBackToList = () => {
    setSelectedUser(null);
    setShowSidebar(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      // Validate file size (max 5MB)
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
    try {
      let messageData: any = {
        recipientId: selectedUser._id,
        type: "text",
        content: message.trim(),
      };

      // Handle image message
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

        setSelectedImage(null);
        setImagePreview(null);
      }
      // Handle voice message
      else if (voiceRecorder.audioBlob) {
        const formData = new FormData();
        formData.append("file", voiceRecorder.audioBlob, "voice-note.webm");
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
          content: `Voice message (${voiceRecorder.duration}s)`,
          voiceUrl: uploadData.url,
          voiceDuration: voiceRecorder.duration,
        };

        voiceRecorder.cancelRecording();
      }

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(messageData),
      });

      if (res.ok) {
        setMessage("");
        fetchMessages(selectedUser._id);
        fetchConversations();
      } else {
        throw new Error("Failed to send message");
      }
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
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
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Send activity ping to mark user as online
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

  // Fetch recipient's activity status
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

  // Format last seen time
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
    
    return `last seen ${lastSeen.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  };

  const handleImageView = (imageUrl: string, content: string) => {
    setViewingImage({ url: imageUrl, content });
  };

  const handleImageDownload = async (imageUrl: string, content: string) => {
    try {
      toast.loading("Downloading image...");
      
      // Fetch the image
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename from content or timestamp
      const timestamp = new Date().getTime();
      const filename = content && content !== "Image" 
        ? `${content.substring(0, 20)}-${timestamp}.jpg`
        : `image-${timestamp}.jpg`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.dismiss();
      toast.success("Image downloaded");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to download image");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/autocityPro/login";
  };

  const filteredUsers = users.filter(
    (u) =>
      u._id !== user?._id &&
      (u.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );
     

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <div className="flex flex-col h-screen bg-[#050505] overflow-hidden">

        {/* Header - Fixed */}
        <div className="bg-gradient-to-br from-[#932222] via-[#411010] to-[#a20c0c] border-b border-white/5 shadow-lg flex-shrink-0">
          <div className="px-4 md:px-6 py-4 md:py-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 md:p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <MessageCircle className="h-6 w-6 md:h-8 md:w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Messages</h1>
                <p className="text-sm md:text-base text-white/80 mt-1">Team communication</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area - Takes remaining space */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Conversations Sidebar */}
          <div className={`${
            showSidebar ? 'flex' : 'hidden'
          } md:flex w-full md:w-80 bg-black border-r border-gray-800 flex-col overflow-hidden`}>
            {/* Search - Fixed */}
            <div className="p-3 md:p-4 border-b border-gray-800 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search users..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Conversations List - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              {searchTerm
                ? filteredUsers.map((u) => (
                    <button
                      key={u._id}
                      onClick={() => handleSelectUser(u)}
                      className={`w-full p-3 md:p-4 flex items-center space-x-3 hover:bg-gray-900 border-b border-gray-800 transition-colors ${
                        selectedUser?._id === u._id ? "bg-gray-900" : ""
                      }`}
                    >
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#E84545]/20 flex items-center justify-center border border-[#E84545]/30 flex-shrink-0">
                        <span className="text-[#E84545] font-semibold text-sm md:text-base">
                          {u.firstName?.[0]}
                          {u.lastName?.[0]}
                        </span>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-white font-medium text-sm md:text-base">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="text-gray-500 text-xs md:text-sm">{u.role}</p>
                      </div>
                    </button>
                  ))
                : conversations.map((conv) => (
  <button
    key={conv.conversationWith._id}
    onClick={() => handleSelectUser(conv.conversationWith)}
    className={`w-full p-3 md:p-4 flex items-center space-x-3 hover:bg-gray-900 border-b border-gray-800 transition-colors ${
      selectedUser?._id === conv.conversationWith._id ? "bg-gray-900" : ""
    }`}
  >

                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#E84545]/20 flex items-center justify-center border border-[#E84545]/30 flex-shrink-0">
                        <span className="text-[#E84545] font-semibold text-sm md:text-base">
                          {conv.conversationWith.firstName?.[0]}
{conv.conversationWith.lastName?.[0]}

                        </span>
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-white font-medium truncate text-sm md:text-base">
                            {conv.conversationWith.firstName} {conv.conversationWith.lastName}

                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-[#E84545] text-white text-xs rounded-full flex-shrink-0">
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
                <div className="p-8 text-center text-gray-500">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm md:text-base">No conversations yet</p>
                  <p className="text-xs md:text-sm mt-2">
                    Search for users to start messaging
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`${
            !selectedUser ? 'hidden' : 'flex'
          } md:flex flex-1 flex-col min-h-0 bg-[#0A0A0A] overflow-hidden`}>
            {selectedUser ? (
              <>
                {/* Chat Header - Fixed */}
                <div className="p-3 md:p-4 border-b border-gray-800 bg-black flex-shrink-0">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleBackToList}
                      className="md:hidden p-2 hover:bg-gray-800 rounded-lg"
                    >
                      <ArrowLeft className="h-5 w-5 text-white" />
                    </button>
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#E84545]/20 flex items-center justify-center border border-[#E84545]/30">
                      <span className="text-[#E84545] font-semibold text-sm md:text-base">
                        {selectedUser.firstName?.[0]}
                        {selectedUser.lastName?.[0]}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm md:text-base">
                        {selectedUser.firstName} {selectedUser.lastName}
                      </p>
                      <div className="flex items-center space-x-1.5">
                        {recipientStatus.isOnline ? (
                          <>
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <p className="text-green-400 text-xs md:text-sm font-medium">
                              online
                            </p>
                          </>
                        ) : (
                          <p className="text-gray-400 text-xs md:text-sm">
                            {formatLastSeen(recipientStatus.lastActiveAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages - Scrollable */}
                <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
                  {messages.map((msg, index) => {
                    // Ensure proper string comparison for IDs
                    console.log("ME:", user?._id);
  console.log("SENDER:", msg.senderId._id);
                    const isMe =
  !!user && msg.senderId._id === user._id;

                    const showDate =
                      index === 0 ||
                      formatDate(messages[index - 1].createdAt) !==
                        formatDate(msg.createdAt);

                    return (
                      <div key={msg._id}>
                        {showDate && (
                          <div className="flex justify-center my-3 md:my-4">
                            <span className="px-3 py-1 bg-gray-800 text-gray-400 text-xs rounded-full">
                              {formatDate(msg.createdAt)}
                            </span>
                          </div>
                        )}

                        <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[85%] md:max-w-md px-3 md:px-4 py-2 rounded-lg ${
                              isMe
                                ? "bg-[#005C4B] text-white"
                                : "bg-gray-800 text-white"
                            }`}
                          >
                            {msg.type === "image" ? (
                              <div className="space-y-2">
                                <img
                                  src={msg.imageUrl}
                                  alt="Shared image"
                                  className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => handleImageView(msg.imageUrl!, msg.content)}
                                />
                                {msg.content && msg.content !== "Image" && (
                                  <p className="text-xs md:text-sm">{msg.content}</p>
                                )}
                              </div>
                            ) : msg.type === "voice" ? (
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => {
                                    if (playingId === msg._id) {
                                      audioRef.current?.pause();
                                      setPlayingId(null);
                                    } else {
                                      if (audioRef.current) {
                                        audioRef.current.src = msg.voiceUrl || "";
                                        audioRef.current.play();
                                      }
                                      setPlayingId(msg._id);
                                    }
                                  }}
                                  className="p-1 hover:bg-white/10 rounded-full"
                                >
                                  {playingId === msg._id ? (
                                    <Pause className="h-3 w-3 md:h-4 md:w-4" />
                                  ) : (
                                    <Play className="h-3 w-3 md:h-4 md:w-4" />
                                  )}
                                </button>

                                <div className="flex-1 h-1 bg-white/30 rounded-full">
                                  <div className="h-1 bg-white rounded-full w-1/3" />
                                </div>

                                <span className="text-xs opacity-80">
                                  {msg.voiceDuration}s
                                </span>
                              </div>
                            ) : (
                              <p className="text-xs md:text-sm break-words">{msg.content}</p>
                            )}

                            <div className="flex items-center justify-between mt-1 space-x-2">
                              <span className="text-xs opacity-70">
                                {formatTime(msg.createdAt)}
                              </span>
                              {isMe && (
                                <span>
                                  {msg.isRead ? (
                                    <CheckCheck className="h-3 w-3 md:h-4 md:w-4 text-[#53BDEB]" />
                                  ) : (
                                    <Check className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
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
                </div>

                <audio
                  ref={audioRef}
                  onEnded={() => setPlayingId(null)}
                />

                {/* Input Area - Fixed */}
                <div className="border-t border-gray-800 bg-black flex-shrink-0">
                  <div className="p-3 md:p-4">
                    {/* Image Preview */}
                    {imagePreview && (
                      <div className="mb-3 relative inline-block">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="max-h-24 md:max-h-32 rounded-lg"
                        />
                        <button
                          onClick={() => {
                            setSelectedImage(null);
                            setImagePreview(null);
                          }}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="h-3 w-3 md:h-4 md:w-4" />
                        </button>
                      </div>
                    )}

                    {voiceRecorder.isRecording ? (
                      <div className="flex items-center space-x-2 md:space-x-3">
                        <div className="flex-1 flex items-center space-x-2 md:space-x-3 px-3 md:px-4 py-2 md:py-3 bg-gray-900 rounded-lg">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          <span className="text-white text-sm md:text-base">
                            {voiceRecorder.duration}s
                          </span>
                          <div className="flex-1 h-1 bg-gray-700 rounded-full">
                            <div className="h-1 bg-red-500 rounded-full animate-pulse w-full" />
                          </div>
                        </div>
                        <button
                          onClick={voiceRecorder.cancelRecording}
                          className="p-2 md:p-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
                        >
                          <X className="h-4 w-4 md:h-5 md:w-5" />
                        </button>
                        <button
                          onClick={voiceRecorder.stopRecording}
                          className="p-2 md:p-3 bg-[#E84545] text-white rounded-lg hover:bg-[#cc3c3c]"
                        >
                          <Send className="h-4 w-4 md:h-5 md:w-5" />
                        </button>
                      </div>
                    ) : voiceRecorder.audioBlob ? (
                      <div className="flex items-center space-x-2 md:space-x-3">
                        <div className="flex-1 flex items-center space-x-2 md:space-x-3 px-3 md:px-4 py-2 md:py-3 bg-gray-900 rounded-lg">
                          <button className="p-1 hover:bg-white/10 rounded-full">
                            <Play className="h-3 w-3 md:h-4 md:w-4 text-white" />
                          </button>
                          <span className="text-white text-xs md:text-sm">
                            Voice message ({voiceRecorder.duration}s)
                          </span>
                        </div>
                        <button
                          onClick={voiceRecorder.cancelRecording}
                          className="p-2 md:p-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
                        >
                          <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                        </button>
                        <button
                          onClick={handleSendMessage}
                          disabled={sending}
                          className="p-2 md:p-3 bg-[#E84545] text-white rounded-lg hover:bg-[#cc3c3c] disabled:opacity-50"
                        >
                          <Send className="h-4 w-4 md:h-5 md:w-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 md:space-x-3">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleImageSelect}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 md:p-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
                        >
                          <ImageIcon className="h-4 w-4 md:h-5 md:w-5" />
                        </button>
                        <input
                          type="text"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          onKeyPress={(e) =>
                            e.key === "Enter" && handleSendMessage()
                          }
                          placeholder="Type a message..."
                          className="flex-1 px-3 md:px-4 py-2 md:py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#E84545] focus:border-transparent text-sm md:text-base"
                        />
                        <button
                          onClick={voiceRecorder.startRecording}
                          className="p-2 md:p-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
                        >
                          <Mic className="h-4 w-4 md:h-5 md:w-5" />
                        </button>
                        <button
                          onClick={handleSendMessage}
                          disabled={(!message.trim() && !selectedImage) || sending}
                          className="p-2 md:p-3 bg-[#E84545] text-white rounded-lg hover:bg-[#cc3c3c] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send className="h-4 w-4 md:h-5 md:w-5" />
                        </button>
                      </div>
                    )}
                    {/* Mobile Safe Area Bottom Padding */}
                  <div className="md:hidden h-24"></div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center p-4">
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

      {/* WhatsApp-Style Image Viewer Modal */}
      {viewingImage && (
        <div 
          className="fixed inset-0 z-50 bg-black flex flex-col animate-in fade-in duration-200"
          onClick={(e) => {
            // Close when clicking the background (not the image or controls)
            if (e.target === e.currentTarget) {
              setViewingImage(null);
            }
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 md:p-4 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm z-10">
            <button
              onClick={() => setViewingImage(null)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </button>
            
            <button
              onClick={() => handleImageDownload(viewingImage.url, viewingImage.content)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              aria-label="Download image"
            >
              <Download className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </button>
          </div>

          {/* Image Container - Click on empty space closes modal */}
          <div 
            className="flex-1 flex items-center justify-center p-4 overflow-hidden"
            onClick={() => setViewingImage(null)}
          >
            <img
              src={viewingImage.url}
              alt="Full size"
              className="max-w-full max-h-full object-contain select-none"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image itself
              draggable={false}
            />
          </div>

          {/* Caption (if exists) */}
          {viewingImage.content && viewingImage.content !== "Image" && (
            <div className="p-3 md:p-4 bg-gradient-to-t from-black/80 to-transparent backdrop-blur-sm">
              <p className="text-white text-center text-sm md:text-base">
                {viewingImage.content}
              </p>
            </div>
          )}
        </div>
      )}
    </MainLayout>
  );
}