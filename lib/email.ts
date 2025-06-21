import nodemailer from 'nodemailer'

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) {
    throw new Error('SMTP credentials are not fully configured')
  }
  transporter = nodemailer.createTransport({
    host,
    port: port ? parseInt(port, 10) : 587,
    auth: { user, pass },
  })
  return transporter
}

export async function sendPasswordResetEmail(
  to: string,
  token: string,
  origin: string
): Promise<void> {
  const from = process.env.EMAIL_FROM
  if (!from) {
    throw new Error('EMAIL_FROM is not defined')
  }
  const url = `${origin}/reset?token=${encodeURIComponent(token)}`
  const transporter = getTransporter()
  await transporter.sendMail({
    from,
    to,
    subject: 'Password Reset',
    text: `Reset your password by visiting: ${url}`,
    html: `<p>Click <a href="${url}">here</a> to reset your password.</p>`,
  })
}
