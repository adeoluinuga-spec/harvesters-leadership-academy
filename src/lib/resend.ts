type EmailRecipient = { email: string; name?: string | null };

export function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

export async function sendResendEmail(input: {
  to: EmailRecipient[];
  subject: string;
  text: string;
  actionUrl?: string | null;
  actionLabel?: string | null;
}) {
  if (!isResendConfigured()) return { sent: 0, skipped: input.to.length, configured: false };
  const recipients = input.to.filter((recipient) => recipient.email.trim());
  if (!recipients.length) return { sent: 0, skipped: 0, configured: true };
  const html = `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#18181b"><h2>${escapeHtml(input.subject)}</h2><p style="white-space:pre-line;line-height:1.6">${escapeHtml(input.text)}</p>${input.actionUrl ? `<p><a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;background:#18181b;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">${escapeHtml(input.actionLabel || "Open Harvesters Academy")}</a></p>` : ""}<p style="color:#71717a;font-size:12px">Harvesters Leadership Academy</p></div>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: recipients.map((recipient) => recipient.name ? `${recipient.name} <${recipient.email}>` : recipient.email),
      subject: input.subject,
      text: input.text,
      html,
      reply_to: process.env.RESEND_REPLY_TO || undefined,
    }),
  });
  if (!response.ok) throw new Error(`Resend delivery failed: ${await response.text()}`);
  return { sent: recipients.length, skipped: 0, configured: true };
}
