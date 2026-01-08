// lib/email/resend.ts
import { Resend } from "resend";

/**
 * Lazy + safe Resend client
 * Prevents Next.js build-time crashes
 */
function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  return new Resend(apiKey);
}

// Type definition for email response
export interface EmailResponse {
  success: boolean;
  data?: any;
  error?: any;
}

/**
 * Sends a password reset email with a secure token link
 */
export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
  userName: string
): Promise<EmailResponse> {
  try {
    const resend = getResend(); // ✅ Lazy init (FIX)

    const { data, error } = await resend.emails.send({
      from: "AutoCity Pro <onboarding@resend.dev>", // Replace with verified domain
      to: email,
      subject: "Reset Your Password - AutoCity Pro",
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Reset Your Password - AutoCity Pro</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
    }
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .email-header {
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .logo {
      background-color: #ffffff;
      color: #2563eb;
      width: 70px;
      height: 70px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      margin-bottom: 20px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .email-header h1 {
      color: #ffffff;
      font-size: 28px;
      margin: 0;
      font-weight: 600;
    }
    .email-body {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      color: #1f2937;
      margin-bottom: 20px;
    }
    .content-text {
      color: #4b5563;
      margin-bottom: 15px;
      font-size: 15px;
    }
    .button-container {
      text-align: center;
      margin: 35px 0;
    }
    .reset-button {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      padding: 16px 40px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);
    }
    .alt-link {
      background-color: #f3f4f6;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 15px;
      margin: 25px 0;
      word-break: break-all;
    }
    .link-url {
      color: #2563eb;
      text-decoration: none;
      font-size: 13px;
      font-family: monospace;
    }
    .warning-box {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin: 25px 0;
      border-radius: 4px;
    }
    .email-footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-header">
      <div class="logo">🚗</div>
      <h1>Reset Your Password</h1>
    </div>
    <div class="email-body">
      <p class="greeting">Hi <strong>${userName}</strong>,</p>
      <p class="content-text">
        We received a request to reset your AutoCity Pro password.
      </p>
      <div class="button-container">
        <a href="${resetUrl}" class="reset-button">Reset My Password</a>
      </div>
      <div class="alt-link">
        <a href="${resetUrl}" class="link-url">${resetUrl}</a>
      </div>
    </div>
    <div class="email-footer">
      <p>AutoCity Pro • Internal Operations Portal</p>
    </div>
  </div>
</body>
</html>`,
      text: `
Hi ${userName},

Reset your AutoCity Pro password using this link:
${resetUrl}

This link expires in 15 minutes and can only be used once.

If you didn’t request this, ignore this email.
      `.trim(),
    });

    if (error) {
      console.error("Resend reset email error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Password reset email error:", error);
    return { success: false, error };
  }
}

/**
 * Sends a confirmation email after password has been changed
 */
export async function sendPasswordChangedEmail(
  email: string,
  userName: string
): Promise<EmailResponse> {
  try {
    const resend = getResend(); // ✅ Lazy init (FIX)

    const { data, error } = await resend.emails.send({
      from: "AutoCity Pro <onboarding@resend.dev>",
      to: email,
      subject: "Your Password Was Changed - AutoCity Pro",
      html: `
        <p>Hi <strong>${userName}</strong>,</p>
        <p>Your AutoCity Pro password was successfully changed.</p>
        <p>If this wasn’t you, contact your administrator immediately.</p>
      `,
      text: `
Hi ${userName},

Your AutoCity Pro password was successfully changed.

If you did not make this change, contact your administrator immediately.
      `.trim(),
    });

    if (error) {
      console.error("Resend confirmation email error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Password change email error:", error);
    return { success: false, error };
  }
}
