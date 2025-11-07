# PIME Panama - Corporate Website

Professional one-page website for PIME Panama, a leading industrial engineering and equipment supply company in Panama and Latin America.

## Features

- ✅ Bilingual (English/Spanish) with i18n routing
- ✅ Custom CMS with admin panel
- ✅ Contact form with email integration
- ✅ Animated logo and smooth transitions
- ✅ SEO optimized with structured data
- ✅ Responsive design
- ✅ Dark, professional aesthetic

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Database:** SQLite with Prisma ORM
- **Authentication:** Custom session-based auth
- **Email:** Ready for Resend/SendGrid integration

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the database:
   ```bash
   npx prisma migrate dev
   npm run db:seed
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Admin Panel

Access the admin panel at `/admin/login`

**Default credentials:**
- Email: `founder@pimepanama.com`
- Password: `ChangeMe123!`

**⚠️ Change these credentials immediately in production!**

## Contact Form

The contact form is configured to send inquiries to `info@pimepanama.com`.

To enable email sending in production:
1. Sign up for [Resend](https://resend.com) or another email service
2. Add your API key to `.env`
3. Uncomment the email sending code in `src/app/api/contact/route.ts`

## SEO Features

- ✅ Comprehensive metadata (title, description, keywords)
- ✅ Open Graph tags for social sharing
- ✅ Twitter Card support
- ✅ Structured data (Schema.org)
- ✅ Sitemap.xml
- ✅ Robots.txt
- ✅ Canonical URLs
- ✅ Multilingual alternate links

## Project Structure

```
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Seed data
├── public/
│   ├── pime-icon.svg      # Company logo
│   └── robots.txt         # SEO robots file
├── src/
│   ├── app/
│   │   ├── [locale]/      # Localized pages
│   │   ├── (admin)/       # Admin panel
│   │   ├── api/           # API routes
│   │   └── sitemap.ts     # Dynamic sitemap
│   ├── components/
│   │   └── landing/       # Landing page components
│   └── lib/
│       ├── auth.ts        # Authentication
│       ├── content.ts     # Content fetching
│       ├── i18n.ts        # Internationalization
│       └── prisma.ts      # Database client
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:seed` - Seed database

## Environment Variables

Create a `.env` file with:

```env
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_SITE_URL="https://pimepanama.com"
ADMIN_SEED_EMAIL="founder@pimepanama.com"
ADMIN_SEED_PASSWORD="ChangeMe123!"
```

## Deployment

1. Build the project: `npm run build`
2. Set environment variables on your hosting platform
3. Deploy the `.next` folder and `prisma` directory
4. Run migrations: `npx prisma migrate deploy`

## License

© 2025 PIME Panama. All rights reserved.
