import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getPromotionalEmail } from "@/lib/email-templates";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipients, subject, title, content, ctaText, ctaLink, locale } = body;

    // Validación básica
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: "Recipients array is required" },
        { status: 400 }
      );
    }

    if (!subject || !title || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Send promotional email to each recipient
    const results = await Promise.allSettled(
      recipients.map(async (recipient: { name: string; email: string }) => {
        const emailContent = getPromotionalEmail({
          recipientName: recipient.name,
          subject,
          title,
          content,
          ctaText: ctaText || (locale === "es" ? "Más Información" : "Learn More"),
          ctaLink: ctaLink || "https://pimepanama.com",
          locale: locale || "en",
        });

        return resend.emails.send({
          from: "PIME Panama <onboarding@resend.dev>", // Cambiar a tu dominio verificado
          to: recipient.email,
          subject: emailContent.subject,
          html: emailContent.html,
        });
      })
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json(
      {
        success: true,
        message: `Sent ${successful} emails successfully, ${failed} failed`,
        details: {
          successful,
          failed,
          total: recipients.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error sending promotional emails:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

