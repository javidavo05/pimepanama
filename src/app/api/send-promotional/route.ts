import { NextResponse } from "next/server";
import { getPromotionalEmail } from "@/lib/email-templates";
import { sendBulkEmails } from "@/lib/email-service";

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

    // Prepare emails for each recipient
    const emails = recipients.map((recipient: { name: string; email: string }) => {
      const emailContent = getPromotionalEmail({
        recipientName: recipient.name,
        subject,
        title,
        content,
        ctaText: ctaText || (locale === "es" ? "Más Información" : "Learn More"),
        ctaLink: ctaLink || "https://pimepanama.com",
        locale: locale || "en",
      });

      return {
        to: recipient.email,
        subject: emailContent.subject,
        html: emailContent.html,
      };
    });

    // Send all emails
    const result = await sendBulkEmails(emails);

    return NextResponse.json(
      {
        success: true,
        message: `Sent ${result.successful} emails successfully, ${result.failed} failed`,
        details: result,
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

