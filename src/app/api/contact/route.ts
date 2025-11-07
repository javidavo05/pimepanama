import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getAdminNotificationEmail, getCustomerThankYouEmail } from "@/lib/email-templates";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, company, phone, message, locale } = body;

    // Validación básica
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const contactData = {
      name,
      email,
      company,
      phone,
      message,
      locale: locale || "en",
    };

    // Send notification to admin
    const adminEmail = getAdminNotificationEmail(contactData);
    await resend.emails.send({
      from: "PIME Panama <onboarding@resend.dev>", // Cambiar a tu dominio verificado
      to: "info@pimepanama.com",
      subject: adminEmail.subject,
      html: adminEmail.html,
    });

    // Send thank you email to customer
    const thankYouEmail = getCustomerThankYouEmail(contactData);
    await resend.emails.send({
      from: "PIME Panama <onboarding@resend.dev>", // Cambiar a tu dominio verificado
      to: email,
      subject: thankYouEmail.subject,
      html: thankYouEmail.html,
    });

    return NextResponse.json(
      { 
        success: true, 
        message: "Emails sent successfully"
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing contact form:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

