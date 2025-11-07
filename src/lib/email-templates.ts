type ContactData = {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  message: string;
  locale: "en" | "es";
};

// Email template for admin notification
export function getAdminNotificationEmail(data: ContactData) {
  const { name, email, company, phone, message, locale } = data;

  return {
    subject: `[PIME Panama] Nueva solicitud de ${name}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0586FE 0%, #552EFF 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .field { margin-bottom: 20px; }
            .label { font-weight: bold; color: #555; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
            .value { margin-top: 5px; padding: 12px; background: white; border-radius: 4px; border-left: 3px solid #0586FE; }
            .message-box { background: white; padding: 20px; border-radius: 4px; border: 1px solid #ddd; margin-top: 10px; }
            .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">Nueva Solicitud de Contacto</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">PIME Panama</p>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">Nombre</div>
                <div class="value">${name}</div>
              </div>
              <div class="field">
                <div class="label">Email</div>
                <div class="value"><a href="mailto:${email}" style="color: #0586FE; text-decoration: none;">${email}</a></div>
              </div>
              ${company ? `
              <div class="field">
                <div class="label">Empresa</div>
                <div class="value">${company}</div>
              </div>
              ` : ''}
              ${phone ? `
              <div class="field">
                <div class="label">Teléfono</div>
                <div class="value"><a href="tel:${phone}" style="color: #0586FE; text-decoration: none;">${phone}</a></div>
              </div>
              ` : ''}
              <div class="field">
                <div class="label">Mensaje</div>
                <div class="message-box">${message.replace(/\n/g, '<br>')}</div>
              </div>
              <div class="field">
                <div class="label">Idioma</div>
                <div class="value">${locale === 'es' ? 'Español' : 'English'}</div>
              </div>
              <div class="field">
                <div class="label">Fecha</div>
                <div class="value">${new Date().toLocaleString('es-PA', { timeZone: 'America/Panama' })}</div>
              </div>
            </div>
            <div class="footer">
              <p>Este email fue generado automáticamente desde pimepanama.com</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

// Thank you email for customer (auto-reply)
export function getCustomerThankYouEmail(data: ContactData) {
  const { name, locale } = data;

  const content = {
    en: {
      subject: "Thank you for contacting PIME Panama",
      greeting: `Dear ${name},`,
      paragraph1: "Thank you for reaching out to PIME Panama. We have received your inquiry and our team of engineering specialists is reviewing your requirements.",
      paragraph2: "We will respond to your request within 24 business hours with a detailed technical assessment and recommendations tailored to your project needs.",
      paragraph3: "In the meantime, if you have any urgent questions, please don't hesitate to contact us directly:",
      email: "Email: info@pimepanama.com",
      closing: "Best regards,",
      team: "The PIME Panama Team",
      tagline: "Engineering Excellence Since 2014",
    },
    es: {
      subject: "Gracias por contactar a PIME Panama",
      greeting: `Estimado/a ${name},`,
      paragraph1: "Gracias por contactar a PIME Panama. Hemos recibido su consulta y nuestro equipo de especialistas en ingeniería está revisando sus requerimientos.",
      paragraph2: "Responderemos a su solicitud dentro de las próximas 24 horas hábiles con una evaluación técnica detallada y recomendaciones adaptadas a las necesidades de su proyecto.",
      paragraph3: "Mientras tanto, si tiene alguna pregunta urgente, no dude en contactarnos directamente:",
      email: "Email: info@pimepanama.com",
      closing: "Saludos cordiales,",
      team: "El Equipo de PIME Panama",
      tagline: "Excelencia en Ingeniería desde 2014",
    },
  };

  const t = content[locale];

  return {
    subject: t.subject,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.8; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #0586FE 0%, #552EFF 100%); color: white; padding: 40px 30px; text-align: center; }
            .logo { font-size: 32px; font-weight: bold; margin-bottom: 10px; letter-spacing: 2px; }
            .tagline { opacity: 0.9; font-size: 14px; }
            .content { padding: 40px 30px; }
            .greeting { font-size: 18px; font-weight: 600; color: #0586FE; margin-bottom: 20px; }
            .paragraph { margin-bottom: 20px; color: #555; }
            .contact-box { background: #f9f9f9; padding: 20px; border-radius: 8px; border-left: 4px solid #0586FE; margin: 30px 0; }
            .signature { margin-top: 40px; }
            .team { font-weight: 600; color: #333; }
            .footer { background: #f9f9f9; padding: 20px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">PIME</div>
              <div class="tagline">${t.tagline}</div>
            </div>
            <div class="content">
              <div class="greeting">${t.greeting}</div>
              <div class="paragraph">${t.paragraph1}</div>
              <div class="paragraph">${t.paragraph2}</div>
              <div class="paragraph">${t.paragraph3}</div>
              <div class="contact-box">
                <strong>${t.email}</strong>
              </div>
              <div class="signature">
                <div class="paragraph">${t.closing}</div>
                <div class="team">${t.team}</div>
              </div>
            </div>
            <div class="footer">
              <p>PIME Panama | ${locale === 'es' ? 'Ingeniería Industrial' : 'Industrial Engineering'}</p>
              <p>© ${new Date().getFullYear()} PIME Panama. ${locale === 'es' ? 'Todos los derechos reservados' : 'All rights reserved'}.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

// Marketing/promotional email template
export function getPromotionalEmail(params: {
  recipientName: string;
  subject: string;
  title: string;
  content: string;
  ctaText: string;
  ctaLink: string;
  locale: "en" | "es";
}) {
  const { recipientName, subject, title, content, ctaText, ctaLink, locale } = params;

  return {
    subject,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.8; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #0586FE 0%, #552EFF 100%); color: white; padding: 50px 30px; text-align: center; }
            .logo { font-size: 36px; font-weight: bold; margin-bottom: 10px; letter-spacing: 2px; }
            .content { padding: 40px 30px; }
            .title { font-size: 24px; font-weight: bold; color: #0586FE; margin-bottom: 20px; text-align: center; }
            .body { color: #555; margin-bottom: 30px; white-space: pre-line; }
            .cta-container { text-align: center; margin: 40px 0; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #0586FE 0%, #552EFF 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 50px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; font-size: 14px; }
            .footer { background: #f9f9f9; padding: 30px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #eee; }
            .unsubscribe { color: #999; text-decoration: underline; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">PIME</div>
              <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 14px;">${locale === 'es' ? 'Ingeniería Industrial' : 'Industrial Engineering'}</p>
            </div>
            <div class="content">
              <p style="color: #555; margin-bottom: 20px;">${locale === 'es' ? 'Estimado/a' : 'Dear'} ${recipientName},</p>
              <div class="title">${title}</div>
              <div class="body">${content}</div>
              <div class="cta-container">
                <a href="${ctaLink}" class="cta-button">${ctaText}</a>
              </div>
            </div>
            <div class="footer">
              <p><strong>PIME Panama</strong></p>
              <p>Email: info@pimepanama.com</p>
              <p style="margin-top: 20px;">© ${new Date().getFullYear()} PIME Panama. ${locale === 'es' ? 'Todos los derechos reservados' : 'All rights reserved'}.</p>
              <p style="margin-top: 20px;">
                <a href="#" class="unsubscribe">${locale === 'es' ? 'Cancelar suscripción' : 'Unsubscribe'}</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

