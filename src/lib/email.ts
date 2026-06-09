import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.EMAIL_FROM ?? "DevStash <onboarding@resend.dev>"

export async function sendVerificationEmail(opts: {
  to: string
  name?: string | null
  verifyUrl: string
}) {
  const { to, name, verifyUrl } = opts
  const greeting = name ? `Hi ${name},` : "Hi,"

  const html = `<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#0a0a0a; color:#e5e5e5; padding:32px;">
    <div style="max-width:480px; margin:0 auto; background:#111; border:1px solid #222; border-radius:12px; padding:32px;">
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:24px;">
        <div style="width:32px; height:32px; border-radius:8px; background:#3b82f6; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px;">ds</div>
        <strong style="font-size:16px; color:#fff;">DevStash</strong>
      </div>
      <h1 style="font-size:20px; color:#fff; margin:0 0 12px;">Verify your email</h1>
      <p style="margin:0 0 16px; line-height:1.5;">${greeting}</p>
      <p style="margin:0 0 24px; line-height:1.5;">Thanks for signing up. Please confirm your email address by clicking the button below.</p>
      <a href="${verifyUrl}" style="display:inline-block; background:#3b82f6; color:#fff; padding:12px 20px; border-radius:8px; text-decoration:none; font-weight:600;">Verify email</a>
      <p style="margin:24px 0 0; font-size:13px; color:#9ca3af; line-height:1.5;">Or paste this link into your browser:<br/><span style="word-break:break-all; color:#e5e5e5;">${verifyUrl}</span></p>
      <p style="margin:24px 0 0; font-size:13px; color:#9ca3af; line-height:1.5;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
    </div>
  </body>
</html>`

  const text = `${greeting}

Thanks for signing up to DevStash. Please verify your email by opening this link:

${verifyUrl}

This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.`

  return resend.emails.send({
    from: FROM,
    to,
    subject: "Verify your email for DevStash",
    html,
    text,
  })
}
