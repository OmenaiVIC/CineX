let transporter = null;

export function initEmail() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    console.warn('⚠️  SMTP_USER or SMTP_PASS not set — email sending disabled');
    return false;
  }
  try {
    import('nodemailer').then(nodemailer => {
      transporter = nodemailer.default.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
      console.log('✅ Email service initialized');
    }).catch(() => {
      console.warn('⚠️  nodemailer not installed — email sending disabled');
    });
    return true;
  } catch {
    console.warn('⚠️  Failed to initialize email service');
    return false;
  }
}

export async function sendContactEmail({ name, email, category, message }) {
  if (!transporter) {
    console.log('[email] Email service not available — would send:', { name, email, category, message });
    return { sent: false, reason: 'email service not configured' };
  }
  try {
    await transporter.sendMail({
      from: `"CineX Contact" <${process.env.SMTP_USER}>`,
      to: 'mediacinex@gmail.com',
      subject: `[CineX Contact] ${category} — ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nCategory: ${category}\n\nMessage:\n${message}`,
      replyTo: email,
    });
    return { sent: true };
  } catch (err) {
    console.error('[email] Failed to send:', err.message);
    return { sent: false, reason: err.message };
  }
}
