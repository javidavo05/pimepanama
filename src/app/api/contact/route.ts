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
    const adminResult = await resend.emails.send({
      from: "PIME Panama <onboarding@resend.dev>",
      to: "info@pimepanama.com",
      subject: adminEmail.subject,
      html: adminEmail.html,
    });

    console.log("Admin email sent:", adminResult);

    // Send thank you email to customer
    const thankYouEmail = getCustomerThankYouEmail(contactData);
    const customerResult = await resend.emails.send({
      from: "PIME Panama <onboarding@resend.dev>",
      to: email,
      subject: thankYouEmail.subject,
      html: thankYouEmail.html,
    });

    console.log("Customer email sent:", customerResult);

    return NextResponse.json(
      { 
        success: true, 
        message: "Emails sent successfully",
        adminEmailId: adminResult.data?.id,
        customerEmailId: customerResult.data?.id,
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

