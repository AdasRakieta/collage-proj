import nodemailer from 'nodemailer';
import emailPreviewStore from './emailPreviewStore';

// Check if email is configured (both username and password must be set)
// Updated configuration
const isEmailConfigured = !!(
  process.env.SMTP_USERNAME && 
  process.env.SMTP_PASSWORD &&
  process.env.SMTP_USERNAME.trim() !== '' &&
  process.env.SMTP_PASSWORD.trim() !== ''
);

console.log('📧 Email configuration status:', isEmailConfigured ? '✅ CONFIGURED' : '⚠️  NOT CONFIGURED');
if (isEmailConfigured) {
  console.log('📧 SMTP Server:', process.env.SMTP_SERVER);
  console.log('📧 SMTP Port:', process.env.SMTP_PORT);
  console.log('📧 SMTP User:', process.env.SMTP_USERNAME);
}


// Email configuration from environment variables
const transporter = isEmailConfigured 
  ? nodemailer.createTransport({
      host: process.env.SMTP_SERVER || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports (587 = STARTTLS)
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
      // Gmail specific settings
      tls: {
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2'
      }
    })
  : null;

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  // If email is not configured, log to console (development mode)
  if (!isEmailConfigured || !transporter) {
    console.log('\n📧 [DEV MODE] Email would be sent:');
    console.log('   To:', options.to);
    console.log('   Subject:', options.subject);
    console.log('   Content:', options.text || options.html.substring(0, 200) + '...');
    console.log('⚠️  Email not sent (SMTP not configured). Set SMTP_USERNAME and SMTP_PASSWORD in .env\n');
    // Save preview so admins can view it without sending
    try {
      if (process.env.EMAIL_PREVIEW_ENABLED === '1' || process.env.EMAIL_PREVIEW_ENABLED === 'true' || true) {
        // always save dev-mode previews; allow override when SMTP enabled
        await emailPreviewStore.savePreview({ to: options.to, subject: options.subject, html: options.html, text: options.text });
      }
    } catch (e) {
      console.error('Failed to save email preview (dev-mode):', e);
    }
    return;
  }

  try {
    console.log(`📧 Sending email to ${options.to}...`);
    
    const info = await transporter.sendMail({
      from: `"Journey Planner" <${process.env.SMTP_USERNAME}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    
    console.log(`✅ Email sent successfully to ${options.to}`);
    console.log(`   Message ID: ${info.messageId}`);
    // Optionally save a preview when SMTP is configured if the env flag is set
    try {
      if (process.env.EMAIL_PREVIEW_ENABLED === '1' || process.env.EMAIL_PREVIEW_ENABLED === 'true') {
        await emailPreviewStore.savePreview({ to: options.to, subject: options.subject, html: options.html, text: options.text });
      }
    } catch (e) {
      console.error('Failed to save email preview:', e);
    }
  } catch (error: any) {
    console.error('❌ Email sending failed:', error.message);
    
    // Detailed error logging for debugging
    if (error.code === 'EAUTH') {
      console.error('   Authentication failed. Check SMTP_USERNAME and SMTP_PASSWORD');
    } else if (error.code === 'ECONNECTION') {
      console.error('   Connection failed. Check SMTP_SERVER and SMTP_PORT');
    } else if (error.responseCode) {
      console.error(`   SMTP Error Code: ${error.responseCode}`);
      console.error(`   Response: ${error.response}`);
    }
    
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Send invitation email with registration link
 */
export async function sendInvitationEmail(
  email: string,
  token: string,
  invitedBy: string
): Promise<void> {
  const registrationUrl = `${process.env.FRONTEND_URL || 'http://localhost'}/register?token=${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          border-radius: 10px 10px 0 0;
          text-align: center;
        }
        .content {
          background: #d8dfffff;
          padding: 30px;
          border-radius: 0 0 10px 10px;
        }
        .button {
          display: inline-block;
          background: #667eea;
          color:#ffff
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 8px;
          margin: 20px 0;
          font-weight: 600;
          transition: 0.3s all ease-in-out;
        }
          .button:hover {
          background: #536febff;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 12px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🗺️ Journey Planner</h1>
        <p>You're invited to join Journey Planner!</p>
      </div>
      <div class="content">
        <p>Hello!</p>
        <p><strong>${invitedBy}</strong> has invited you to join Journey Planner, a collaborative travel planning application.</p>
        <p>Click the button below to create your account:</p>
        <center>
          <a href="${registrationUrl}" class="button">Create Account</a>
        </center>
        <p>This invitation link will expire in 7 days.</p>
        <p>If you didn't expect this invitation, you can safely ignore this email.</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Journey Planner. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'Invitation to Join Journey Planner',
    html,
    text: `You've been invited to join Journey Planner by ${invitedBy}. Register at: ${registrationUrl}`,
  });
}

/**
 * Send registration request notification to admin
 */
export async function sendRegistrationRequestEmail(
  adminEmail: string,
  requesterEmail: string,
  requesterName?: string
): Promise<void> {
  const reviewUrl = `${process.env.FRONTEND_URL || 'http://localhost'}/settings`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
          padding: 30px;
          border-radius: 10px 10px 0 0;
          text-align: center;
        }
        .content {
          background: #f9fafb;
          padding: 30px;
          border-radius: 0 0 10px 10px;
        }
        .code {
          background: white;
          border: 2px solid #667eea;
          padding: 20px;
          font-size: 32px;
          font-weight: bold;
          text-align: center;
          letter-spacing: 8px;
          border-radius: 8px;
          margin: 20px 0;
          font-family: 'Courier New', monospace;
          color: #667eea;
        }
        .warning {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 12px;
          color: #6b7280;
        }
        .meta { background: #fff; padding: 12px; border-radius:8px; border:1px solid #e6eefc; margin:12px 0; }
        .button-link { display:inline-block; background:#667eea; color: white; padding: 12px 20px; text-decoration:none; border-radius:8px; margin-top:12px; font-weight:600; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🔒 Registration Request</h1>
        <p>Journey Planner</p>
      </div>
      <div class="content">
        <p>Hello Administrator,</p>
        <p>A new registration request has been submitted and requires your review.</p>
        <div class="meta">
          <p><strong>Email:</strong> ${requesterEmail}</p>
          <p><strong>Name:</strong> ${requesterName || 'N/A'}</p>
        </div>
        <p>Please review and create an account for this user in the admin panel.</p>
        <center>
          <a href="${reviewUrl}" class="button-link">Review Registration Requests</a>
        </center>
      </div>
      <div class="footer">© ${new Date().getFullYear()} Journey Planner. All rights reserved.</div>
    </body>
    </html>
  `;

  await sendEmail({
    to: adminEmail,
    subject: 'New Registration Request - Journey Planner',
    html,
    text: `New registration request: ${requesterEmail}`,
  });
}

/**
 * Send password reset code email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetCode: string
): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
          padding: 30px;
          border-radius: 10px 10px 0 0;
          text-align: center;
        }
        .content {
          background: #f9fafb;
          padding: 30px;
          border-radius: 0 0 10px 10px;
        }
        .code {
          background: white;
          border: 2px solid #667eea;
          padding: 20px;
          font-size: 32px;
          font-weight: bold;
          text-align: center;
          letter-spacing: 8px;
          border-radius: 8px;
          margin: 20px 0;
          font-family: 'Courier New', monospace;
          color: #667eea;
        }
        .warning {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 12px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🔒 Password Reset</h1>
        <p>Journey Planner</p>
      </div>
      <div class="content">
        <p>Hello!</p>
        <p>You requested a password reset for your Journey Planner account.</p>
        <p>Your verification code is:</p>
        <div class="code">${resetCode}</div>
        <p>Enter this code on the password reset page along with your new password.</p>
        <div class="warning">
          <strong>⚠️ Security Notice:</strong> This code expires in 15 minutes. If you didn't request this reset, please ignore this email and contact an administrator.
        </div>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Journey Planner. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'Password Reset Code - Journey Planner',
    html,
    text: `Your password reset code is: ${resetCode}. This code expires in 15 minutes.`,
  });
}

/**
 * Send registration verification code to user
 */
export async function sendRegistrationVerificationEmail(email: string, code: string): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
          padding: 30px;
          border-radius: 10px 10px 0 0;
          text-align: center;
        }
        .content {
          background: #f9fafb;
          padding: 30px;
          border-radius: 0 0 10px 10px;
        }
        .code {
          background: white;
          border: 2px solid #667eea;
          padding: 20px;
          font-size: 32px;
          font-weight: bold;
          text-align: center;
          letter-spacing: 8px;
          border-radius: 8px;
          margin: 20px 0;
          font-family: 'Courier New', monospace;
          color: #667eea;
        }
        .warning {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 12px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🔒 Verification Code</h1>
        <p>Journey Planner</p>
      </div>
      <div class="content">
        <p>Hello,</p>
        <p>Your verification code to request a Journey Planner account is:</p>
        <div class="code">${code}</div>
        <p>This code will expire in 15 minutes. Enter it on the registration page to continue your request.</p>
      </div>
      <div class="footer">© ${new Date().getFullYear()} Journey Planner. All rights reserved.</div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'Your Journey Planner verification code',
    html,
    text: `Your verification code is: ${code}. It expires in 15 minutes.`,
  });
}

// Consolidated default export placed at the end of the file

/**
 * Send journey sharing invitation email
 */
export async function sendJourneyInvitation(
  email: string,
  username: string,
  sharedBy: string,
  journeyTitle: string,
  token: string
): Promise<void> {
  const acceptUrl = `${process.env.FRONTEND_URL || 'http://localhost'}/accept-invitation/${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #0a84ff 0%, #30d158 100%);
          color: white;
          padding: 30px;
          border-radius: 10px 10px 0 0;
          text-align: center;
        }
        .content {
          background: #f9fafb;
          padding: 30px;
          border-radius: 0 0 10px 10px;
        }
        .journey-info {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #0a84ff;
        }
        .button {
          display: inline-block;
          background: #0a84ff;
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 8px;
          margin: 20px 0;
          font-weight: 600;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 12px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🗺️ Journey Shared With You</h1>
        <p>Journey Planner</p>
      </div>
      <div class="content">
        <p>Hello <strong>${username}</strong>!</p>
        <p><strong>${sharedBy}</strong> has shared a journey with you on Journey Planner.</p>
        
        <div class="journey-info">
          <h2 style="margin-top: 0;">📍 ${journeyTitle}</h2>
          <p>You've been invited to view and collaborate on this journey.</p>
        </div>

        <p>Click the button below to accept this invitation:</p>
        <center>
          <a href="${acceptUrl}" class="button">✓ Accept Invitation</a>
        </center>
        
        <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
          You can also accept this invitation from your Settings page after logging in.
        </p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Journey Planner. All rights reserved.</p>
        <p>If you didn't expect this invitation, you can safely ignore this email.</p>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: `${sharedBy} shared a journey with you - Journey Planner`,
    html,
    text: `${sharedBy} has shared the journey "${journeyTitle}" with you. Visit ${acceptUrl} to accept the invitation.`,
  });
}

export default {
  sendEmail,
  sendInvitationEmail,
  sendPasswordResetEmail,
  sendRegistrationRequestEmail,
  sendRegistrationVerificationEmail,
  sendJourneyInvitation,
};
