const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'TeleCloud <onboarding@resend.dev>'; // Resend gives you a testing domain ending in @resend.dev, but you can configure your own

exports.sendWelcomeEmail = async (email, name) => {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set. Skipping Welcome Email to", email);
    return;
  }
  
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Welcome to TeleCloud 🚀',
      html: `
        <div style="font-family: sans-serif; color: #333; line-height: 1.6; max-w: 600px; margin: auto; padding: 20px;">
          <h2>Welcome to TeleCloud!</h2>
          <p>Hi ${name || 'there'},</p>
          <p>Welcome to TeleCloud! You can now upload, manage, and share your files securely using Telegram as your infinite backend.</p>
          <p>Start exploring your dashboard and enjoy fast, secure, and modern cloud storage powered by Telegram's unmetered infrastructure.</p>
          <br/>
          <p><strong>- TeleCloud Team</strong></p>
        </div>
      `
    });
    
    if (error) {
      console.error("Resend Error sending welcome email:", error);
    } else {
      console.log("Welcome email sent:", data);
    }
  } catch (err) {
    console.error("Failed to send welcome email:", err);
  }
};

exports.sendSubscriptionEmail = async (email, name, planName) => {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set. Skipping Subscription Email to", email);
    return;
  }
  
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Subscription Activated 🎉',
      html: `
        <div style="font-family: sans-serif; color: #333; line-height: 1.6; max-w: 600px; margin: auto; padding: 20px;">
          <h2>Great news! Your plan is active.</h2>
          <p>Hi ${name || 'there'},</p>
          <p>Your subscription has been successfully activated.</p>
          <p><strong>Plan:</strong> ${planName}</p>
          <p>You now have unlimited storage and full access to all features. Experience blazingly fast uploads with absolutely zero storage constraints.</p>
          <p>And remember: Even if your subscription expires, your data will always remain सुरक्षित (safe) with us. You'll just need to renew to restore your access.</p>
          <br/>
          <p><strong>- TeleCloud Team</strong></p>
        </div>
      `
    });
    
    if (error) {
      console.error("Resend Error sending subscription success email:", error);
    } else {
      console.log("Subscription email sent:", data);
    }
  } catch (err) {
    console.error("Failed to send subscription success email:", err);
  }
};
