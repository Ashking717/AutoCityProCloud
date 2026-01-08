// app/api/auth/forgot-password/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";

import { connectDB } from "@/lib/db/mongodb";
import User from "@/lib/models/User";
import { sendPasswordResetEmail } from "@/lib/email/resend";

// ✅ Prevent Next.js from trying to statically analyze this route
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body?.email?.toLowerCase()?.trim();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({
      email,
      isActive: true,
    });

    /**
     * SECURITY:
     * Always return success to prevent email enumeration
     */
    if (!user) {
      console.log(`[FORGOT_PASSWORD] Non-existent email requested: ${email}`);
      return NextResponse.json({
        success: true,
        message: "If that email exists, a reset link has been sent",
      });
    }

    /**
     * Generate secure token
     */
    const resetToken = crypto.randomBytes(32).toString("hex");

    /**
     * Store HASHED token (never store raw tokens)
     */
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min
    await user.save();

    /**
     * Build reset URL (raw token only sent via email)
     */
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const resetUrl = `${baseUrl}/autocityPro/reset-password?token=${resetToken}`;

    /**
     * Send email (lazy Resend init happens inside this function)
     */
    const emailResult = await sendPasswordResetEmail(
      user.email,
      resetUrl,
      user.firstName || user.username
    );

    if (!emailResult.success) {
      console.error("[FORGOT_PASSWORD] Email send failed:", {
        userId: user._id.toString(),
        email: user.email,
        error: emailResult.error,
      });
      // Still return success (anti-enumeration)
    } else {
      console.log(`[FORGOT_PASSWORD] Reset email sent to ${user.email}`);
    }

    /**
     * DEV MODE: expose reset URL for testing
     */
    if (process.env.NODE_ENV === "development") {
      console.log("=".repeat(80));
      console.log("PASSWORD RESET LINK (DEV ONLY):");
      console.log(resetUrl);
      console.log("=".repeat(80));

      return NextResponse.json({
        success: true,
        message: "Password reset link generated (dev mode)",
        resetUrl,
      });
    }

    /**
     * PROD RESPONSE (generic)
     */
    return NextResponse.json({
      success: true,
      message: "If that email exists, a reset link has been sent",
    });
  } catch (error) {
    console.error("[FORGOT_PASSWORD] Unexpected error:", error);

    return NextResponse.json(
      { error: "An error occurred processing your request" },
      { status: 500 }
    );
  }
}
