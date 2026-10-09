import { Hero } from "@/components/sections/hero";
import { Proof } from "@/components/sections/proof";
import { Capabilities } from "@/components/sections/capabilities";
import { FeaturedWork } from "@/components/sections/featured-work";
import { Process } from "@/components/sections/process";
import { Industries } from "@/components/sections/industries";
import { Closing } from "@/components/sections/closing";
import type { Lang } from "../../../../content/site";
import "./home.css";

/* La home, sección por sección. El footer vive en el layout. */
export default async function Home({ params }: { params: Promise<{ lang: Lang }> }) {
  const { lang } = await params;
  return (
    <main className="home-skel">
      <Hero lang={lang} />
      <Proof lang={lang} />
      <Capabilities lang={lang} />
      <FeaturedWork lang={lang} />
      <Process lang={lang} />
      <Industries lang={lang} />
      <Closing lang={lang} />
    </main>
  );
}
