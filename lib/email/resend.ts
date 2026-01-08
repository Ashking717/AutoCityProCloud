// lib/email/resend.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Type definition for email response
export interface EmailResponse {
  success: boolean;
  data?: any;
  error?: any;
}

/**
 * Sends a password reset email with a secure token link
 * @param email - User's email address
 * @param resetUrl - Complete reset URL with token
 * @param userName - User's name for personalization
 * @returns Promise with success status and optional data/error
 */
export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
  userName: string
): Promise<EmailResponse> {
  try {
    const { data, error } = await resend.emails.send({
      from: 'AutoCity Pro <onboarding@resend.dev>', // Change to your verified domain
      to: email,
      subject: 'Reset Your Password - AutoCity Pro',
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
      transition: all 0.3s ease;
    }
    .reset-button:hover {
      background-color: #1d4ed8;
      box-shadow: 0 6px 8px rgba(37, 99, 235, 0.3);
    }
    .alt-link {
      background-color: #f3f4f6;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 15px;
      margin: 25px 0;
      word-break: break-all;
    }
    .alt-link-text {
      font-size: 13px;
      color: #6b7280;
      margin-bottom: 8px;
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
    .warning-title {
      color: #92400e;
      font-weight: 600;
      margin-bottom: 10px;
    }
    .warning-list {
      margin: 10px 0 0 0;
      padding-left: 20px;
      color: #78350f;
      font-size: 14px;
    }
    .warning-list li {
      margin-bottom: 6px;
    }
    .email-footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer-text {
      color: #6b7280;
      font-size: 13px;
      margin: 8px 0;
    }
    .footer-brand {
      color: #1f2937;
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 15px;
    }
    .divider {
      height: 1px;
      background-color: #e5e7eb;
      margin: 25px 0;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <!-- Header -->
    <div class="email-header">
      <div class="logo">🚗</div>
      <h1>Reset Your Password</h1>
    </div>
    
    <!-- Body -->
    <div class="email-body">
      <p class="greeting">Hi <strong>${userName}</strong>,</p>
      
      <p class="content-text">
        We received a request to reset the password for your AutoCity Pro account. 
        To proceed with resetting your password, please click the button below:
      </p>
      
      <div class="button-container">
        <a href="${resetUrl}" class="reset-button">Reset My Password</a>
      </div>
      
      <div class="alt-link">
        <p class="alt-link-text">Or copy and paste this link into your browser:</p>
        <a href="${resetUrl}" class="link-url">${resetUrl}</a>
      </div>
      
      <div class="warning-box">
        <div class="warning-title">
          ⚠️ Important Security Information
        </div>
        <ul class="warning-list">
          <li>This password reset link will <strong>expire in 15 minutes</strong></li>
          <li>This link can only be used <strong>one time</strong></li>
          <li>If you didn't request this reset, please ignore this email and your password will remain unchanged</li>
          <li>Never share this link with anyone</li>
        </ul>
      </div>
      
      <div class="divider"></div>
      
      <p class="content-text">
        For security reasons, we cannot reset your password without you clicking the link above 
        to verify your identity.
      </p>
      
      <p class="content-text">
        If you continue to have problems, please contact your system administrator for assistance.
      </p>
    </div>
    
    <!-- Footer -->
    <div class="email-footer">
      <p class="footer-brand">AutoCity Pro</p>
      <p class="footer-text">Internal Operations Portal</p>
      <p class="footer-text">For support, contact your system administrator</p>
      <div class="divider"></div>
      <p class="footer-text" style="font-size: 12px; color: #9ca3af;">
        This is an automated email. Please do not reply to this message.
      </p>
    </div>
  </div>
</body>
</html>`,
      // Plain text version for email clients that don't support HTML
      text: `
Hi ${userName},

We received a request to reset your password for your AutoCity Pro account.

Reset your password by visiting this link:
${resetUrl}

IMPORTANT:
- This link expires in 15 minutes
- This link can only be used once
- If you didn't request this, ignore this email

For security reasons, we cannot reset your password without this verification step.

---
AutoCity Pro - Internal Operations Portal
For support, contact your system administrator
      `.trim(),
    });

    if (error) {
      console.error('Resend email error:', error);
      return { success: false, error };
    }

    console.log('Password reset email sent successfully:', data);
    return { success: true, data };
    
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error };
  }
}

/**
 * Sends a confirmation email after password has been changed
 * @param email - User's email address
 * @param userName - User's name for personalization
 * @returns Promise with success status and optional data/error
 */
export async function sendPasswordChangedEmail(
  email: string,
  userName: string
): Promise<EmailResponse> {
  try {
    const { data, error } = await resend.emails.send({
      from: 'AutoCity Pro <onboarding@resend.dev>',
      to: email,
      subject: 'Your Password Was Changed - AutoCity Pro',
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Password Changed - AutoCity Pro</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .success-icon {
      background-color: #ffffff;
      color: #10b981;
      width: 70px;
      height: 70px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
      margin-bottom: 20px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header h1 {
      color: #ffffff;
      font-size: 24px;
      margin: 0;
      font-weight: 600;
    }
    .body {
      padding: 40px 30px;
    }
    .body p {
      color: #4b5563;
      margin-bottom: 15px;
      font-size: 15px;
    }
    .body p strong {
      color: #1f2937;
    }
    .alert-box {
      background-color: #fef2f2;
      border-left: 4px solid #ef4444;
      padding: 16px;
      margin: 25px 0;
      border-radius: 4px;
    }
    .alert-box strong {
      color: #991b1b;
      display: block;
      margin-bottom: 8px;
    }
    .alert-box p {
      margin: 0;
      color: #7f1d1d;
      font-size: 14px;
    }
    .footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      color: #6b7280;
      font-size: 13px;
      margin: 8px 0;
    }
    .footer-brand {
      color: #1f2937;
      font-weight: 600;
      font-size: 14px;
    }
    .divider {
      height: 1px;
      background-color: #e5e7eb;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="success-icon">✓</div>
      <h1>Password Successfully Changed</h1>
    </div>
    
    <div class="body">
      <p>Hi <strong>${userName}</strong>,</p>
      
      <p>This email confirms that your AutoCity Pro password was successfully changed.</p>
      
      <p>If you made this change, no further action is needed.</p>
      
      <div class="alert-box">
        <strong>⚠️ Didn't make this change?</strong>
        <p>
          If you did not change your password, your account may have been compromised. 
          Please contact your system administrator immediately.
        </p>
      </div>
      
      <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
        For your security, this notification is sent whenever your password is changed.
      </p>
    </div>
    
    <div class="footer">
      <p class="footer-brand">AutoCity Pro</p>
      <p>Internal Operations Portal</p>
      <p>For support, contact your system administrator</p>
      <div class="divider"></div>
      <p style="font-size: 12px; color: #9ca3af;">
        This is an automated email. Please do not reply to this message.
      </p>
    </div>
  </div>
</body>
</html>`,
      // Plain text version
      text: `
Hi ${userName},

This email confirms that your AutoCity Pro password was successfully changed.

If you made this change, no further action is needed.

⚠️ DIDN'T MAKE THIS CHANGE?
If you did not change your password, your account may have been compromised. 
Please contact your system administrator immediately.

---
AutoCity Pro - Internal Operations Portal
      `.trim(),
    });

    if (error) {
      console.error('Resend confirmation email error:', error);
      return { success: false, error };
    }

    return { success: true, data };
    
  } catch (error) {
    console.error('Confirmation email error:', error);
    return { success: false, error };
  }
}