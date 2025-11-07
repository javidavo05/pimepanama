import nodemailer from "nodemailer";

// Create reusable transporter
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

export async function sendEmail({
  to,
  subject,
  html,
  from,
}: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}) {
  const transporter = createTransporter();
  
  const fromAddress = from || process.env.SMTP_FROM || `PIME Panama <${process.env.SMTP_USER}>`;

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
    });

    console.log("Email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

export async function sendBulkEmails(
  emails: Array<{
    to: string;
    subject: string;
    html: string;
  }>
) {
  const transporter = createTransporter();
  const fromAddress = process.env.SMTP_FROM || `PIME Panama <${process.env.SMTP_USER}>`;

  const results = await Promise.allSettled(
    emails.map((email) =>
      transporter.sendMail({
        from: fromAddress,
        to: email.to,
        subject: email.subject,
        html: email.html,
      })
    )
  );

  const successful = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return {
    successful,
    failed,
    total: emails.length,
    results,
  };
}

