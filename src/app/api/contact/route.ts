import { NextResponse } from "next/server";

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

    // Aquí enviarías el email usando un servicio como Resend, SendGrid, etc.
    // Por ahora, solo logueamos la información
    console.log("Contact form submission:", {
      name,
      email,
      company,
      phone,
      message,
      locale,
      timestamp: new Date().toISOString(),
    });

    // En producción, implementarías algo como:
    /*
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    await resend.emails.send({
      from: 'PIME Panama <noreply@pimepanama.com>',
      to: 'info@pimepanama.com',
      subject: `New Contact Request from ${name}`,
      html: `
        <h2>New Contact Request</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Company:</strong> ${company || 'N/A'}</p>
        <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    });
    */

    // Por ahora, simulamos un envío exitoso
    return NextResponse.json(
      { 
        success: true, 
        message: "Email sent successfully",
        // En desarrollo, incluimos los datos para verificación
        data: process.env.NODE_ENV === "development" ? body : undefined 
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

