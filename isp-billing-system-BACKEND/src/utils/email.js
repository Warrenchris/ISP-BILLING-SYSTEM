const nodemailer = require('nodemailer');

let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  transporter.verify((error) => {
    if (error) {
      console.warn('⚠️ Email transporter warning:', error.message);
    } else {
      console.log('✅ Email transporter is ready');
    }
  });
}

const sendPasswordResetEmail = async (email, resetToken) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;
  
  const mailOptions = {
    from: `"ISP Billing" <${process.env.EMAIL_USER || 'no-reply@ispbilling.com'}>`,
    to: email,
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Password Reset Request</h2>
        <p>You requested a password reset for your ISP Billing account.</p>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" 
           style="display: inline-block; padding: 10px 20px; background-color: #4f46e5; 
                  color: white; text-decoration: none; border-radius: 5px; margin: 15px 0;">
          Reset Password
        </a>
        <p>Or copy and paste this link into your browser:</p>
        <p><code>${resetUrl}</code></p>
        <p>This link will expire in 1 hour.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="font-size: 12px; color: #6b7280;">
          © ${new Date().getFullYear()} ISP Billing System. All rights reserved.
        </p>
      </div>
    `,
    text: `You requested a password reset. Please go to this link to reset your password: ${resetUrl}\n\nThis link expires in 1 hour.`
  };

  if (!transporter) {
    console.log(`[DEV/MOCK EMAIL] Password reset email for ${email}. Reset URL: ${resetUrl}`);
    return true;
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    // If SMTP fails in non-production, log and continue
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[FALLBACK EMAIL] Reset URL: ${resetUrl}`);
      return true;
    }
    throw new Error('Failed to send password reset email');
  }
};

module.exports = { sendPasswordResetEmail };