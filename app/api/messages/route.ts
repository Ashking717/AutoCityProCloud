import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import Message from "@/lib/models/Message";
import User from "@/lib/models/User";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";

/* ======================
   Types for populated docs
====================== */
interface PopulatedUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface PopulatedMessage {
  senderId: PopulatedUser;
  recipientId: PopulatedUser;
  isRead: boolean;
  createdAt: string;
}

/* ======================
   GET /api/messages
====================== */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const token = cookies().get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = verifyToken(token);
    const currentUserId = currentUser.userId;

    const { searchParams } = new URL(request.url);
    const otherUserId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "50");

    /* ----------------------
       1️⃣ Messages with one user
    ---------------------- */
    if (otherUserId) {
      const messages = await Message.find({
        $or: [
          { senderId: currentUserId, recipientId: otherUserId },
          { senderId: otherUserId, recipientId: currentUserId },
        ],
        isDeleted: false,
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("senderId", "firstName lastName email role")
        .populate("recipientId", "firstName lastName email role")
        .populate("replyTo")
        .lean();

      return NextResponse.json({
        messages: messages.reverse(),
      });
    }

    /* ----------------------
       2️⃣ Conversation list
    ---------------------- */
    const rawMessages = await Message.find({
      $or: [
        { senderId: currentUserId },
        { recipientId: currentUserId },
      ],
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .populate("senderId", "firstName lastName email role")
      .populate("recipientId", "firstName lastName email role")
      .lean();

    // 👇 Tell TypeScript these are populated
    const messages = rawMessages as unknown as PopulatedMessage[];

    const conversationsMap = new Map<
      string,
      {
        conversationWith: PopulatedUser;
        lastMessage: PopulatedMessage;
        unreadCount: number;
      }
    >();

    for (const msg of messages) {
      // Extra safety (satisfies TS + runtime)
      if (!msg.senderId || !msg.recipientId) continue;

      const isSender = msg.senderId._id.toString() === currentUserId;

      // 👇 always resolve the OTHER user
      const partner = isSender ? msg.recipientId : msg.senderId;
      const partnerId = partner._id.toString();

      if (!conversationsMap.has(partnerId)) {
        conversationsMap.set(partnerId, {
          conversationWith: {
            _id: partner._id,
            firstName: partner.firstName,
            lastName: partner.lastName,
            email: partner.email,
            role: partner.role,
          },
          lastMessage: msg,
          unreadCount: 0,
        });
      }

      // Count unread messages sent TO current user
      if (
        msg.recipientId._id.toString() === currentUserId &&
        !msg.isRead
      ) {
        conversationsMap.get(partnerId)!.unreadCount++;
      }
    }

    return NextResponse.json({
      conversations: Array.from(conversationsMap.values()),
    });
  } catch (error: any) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/* ======================
   POST /api/messages
====================== */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token = cookies().get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = verifyToken(token);
    const body = await request.json();

    const {
      recipientId,
      content,
      type = "text",
      voiceUrl,
      voiceDuration,
      imageUrl,
      replyTo,
    } = body;

    if (!recipientId || !content) {
      return NextResponse.json(
        { error: "Recipient and content are required" },
        { status: 400 }
      );
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return NextResponse.json(
        { error: "Recipient not found" },
        { status: 404 }
      );
    }

    const message = await Message.create({
      senderId: currentUser.userId,
      recipientId,
      outletId: currentUser.outletId || null,
      type,
      content,
      voiceUrl,
      voiceDuration,
      imageUrl,
      replyTo: replyTo || null,
    });

    const populatedMessage = await Message.findById(message._id)
      .populate("senderId", "firstName lastName email role")
      .populate("recipientId", "firstName lastName email role")
      .populate("replyTo")
      .lean();

    return NextResponse.json(
      { message: populatedMessage },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/* ======================
   PATCH /api/messages
====================== */
export async function PATCH(request: NextRequest) {
  try {
    await connectDB();

    const token = cookies().get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = verifyToken(token);
    const body = await request.json();
    const { messageIds } = body;

    if (!Array.isArray(messageIds)) {
      return NextResponse.json(
        { error: "Message IDs array required" },
        { status: 400 }
      );
    }

    await Message.updateMany(
      {
        _id: { $in: messageIds },
        recipientId: currentUser.userId,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error marking messages as read:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
