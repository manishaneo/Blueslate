import nodemailer from "nodemailer";

let _transporter = null;

function getTransporter() {
    if (_transporter) return _transporter;

    const host = process.env.SMTP_HOST;
    if (!host) return null; // dev console-log fallback

    _transporter = nodemailer.createTransport({
        host,
        port:   parseInt(process.env.SMTP_PORT ?? "587", 10),
        secure: process.env.SMTP_PORT === "465",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
    return _transporter;
}

export async function sendPasswordResetEmail(toEmail, resetUrl) {
    const from = process.env.SMTP_FROM ?? "Blueslate <noreply@blueslate.app>";

    const transporter = getTransporter();
    if (!transporter) {
        console.log("\n[EMAIL DEV] ── Password reset link ──────────────────────");
        console.log(`[EMAIL DEV] To:  ${toEmail}`);
        console.log(`[EMAIL DEV] URL: ${resetUrl}`);
        console.log("[EMAIL DEV] ──────────────────────────────────────────────\n");
        return;
    }

    await transporter.sendMail({
        from,
        to:      toEmail,
        subject: "Reset your Blueslate password",
        text: [
            "You requested a password reset for your Blueslate account.",
            "",
            "Click the link below to set a new password. This link expires in 1 hour.",
            "",
            resetUrl,
            "",
            "If you did not request this, you can safely ignore this email.",
            "Your password will not change until you click the link above.",
        ].join("\n"),
        html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;padding:40px">
        <tr><td>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:32px">
            <div style="width:32px;height:32px;background:#2563eb;border-radius:8px;display:inline-block;vertical-align:middle"></div>
            <span style="font-size:18px;font-weight:700;color:#111827;vertical-align:middle;margin-left:8px">Blueslate</span>
          </div>
          <h1 style="font-size:22px;font-weight:700;color:#111827;margin:0 0 8px">Reset your password</h1>
          <p style="font-size:14px;color:#6b7280;margin:0 0 24px">
            We received a request to reset the password for your account.
            Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.
          </p>
          <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:10px">
            Reset password
          </a>
          <p style="font-size:13px;color:#9ca3af;margin:24px 0 0">
            If you didn't request a password reset, you can safely ignore this email —
            your password will remain unchanged.
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
          <p style="font-size:12px;color:#9ca3af;margin:0">
            If the button above doesn't work, copy and paste this URL into your browser:<br>
            <span style="color:#2563eb;word-break:break-all">${resetUrl}</span>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
}
